import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Optional } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { RedisService } from '../redis/redis/redis.service.js';
import { CallStatus, CallType } from './schemas/message.schema.js';
import { MqttBrokerService } from './mqtt-broker.service.js';
import { AURA_BOT_ID } from '../groq/aura-bot.constant.js';
import { GroqService } from '../groq/groq.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      sub: string;
      email: string;
      role: string;
    };
  };
}

// Chụp lại context AsyncLocalStorage sạch ở cấp module để chạy các tác vụ AI nền tách biệt với trace của request cha
const runInDetachedContext = AsyncLocalStorage.snapshot();

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Map theo dõi số lượng socket kết nối của mỗi userId
  private readonly userSocketMap = new Map<string, Set<string>>();

  // Map theo dõi phiên cuộc gọi WebRTC 1-1 đang diễn ra
  private readonly activeCalls = new Map<
    string,
    {
      callerId: string;
      targetUserId: string;
      callType: CallType;
      conversationId?: string;
      initiatedAt: number;
      acceptedAt?: number;
    }
  >();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mqttBrokerService: MqttBrokerService,
    @Optional() private readonly groqService?: GroqService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway đã khởi tạo thành công');
    this.mqttBrokerService.onChatMessageReceived = (data) => {
      void this.triggerAuraReply(data);
      if (data.message) {
        this.server
          ?.to(`user:${data.senderId}`)
          ?.to(`user:${data.receiverId}`)
          ?.emit('message:new', data.message);
      }
    };
  }

  /**
   * Xác thực kết nối WebSocket qua JWT Token
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} bị từ chối: Không tìm thấy Token xác thực`);
        client.disconnect(true);
        return;
      }

      const secret = process.env.JWT_SECRET || 'my_super_secret_key_chat_app';
      const payload = await this.jwtService.verifyAsync(token, { secret });

      client.data.user = payload;
      const userId = payload.sub;

      // Join room cá nhân của user để nhận tin nhắn trực tiếp
      await client.join(`user:${userId}`);

      // Cập nhật Presence
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, new Set());
      }
      this.userSocketMap.get(userId)!.add(client.id);

      // Lưu trạng thái online vào Redis
      try {
        if (this.redisService.isAvailable()) {
          await this.redisService.getClient().sadd('chat:online_users', userId);
        }
      } catch (err) {
        this.logger.warn(`Lỗi ghi Redis presence online: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Thông báo cho các client khác user này đã Online
      this.server.emit('user:online', { userId });

      // Gửi danh sách các user hiện đang online cho client mới kết nối
      let onlineList: string[] = [];
      try {
        if (this.redisService.isAvailable()) {
          onlineList = await this.redisService
            .getClient()
            .smembers('chat:online_users');
        }
      } catch (err) {
        this.logger.warn(`Lỗi đọc Redis presence online: ${err instanceof Error ? err.message : String(err)}`);
      }
      client.emit('presence:initial', { onlineUserIds: onlineList });

      this.logger.log(`User ${userId} (${payload.email}) kết nối Socket ${client.id}`);
    } catch (error) {
      this.logger.error(
        `Xác thực kết nối Socket thất bại cho client ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  /**
   * Xử lý khi ngắt kết nối
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.data?.user?.sub;
    if (!userId) return;

    const userSockets = this.userSocketMap.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(userId);
        // Xóa khỏi Redis và thông báo user offline
        try {
          if (this.redisService.isAvailable()) {
            await this.redisService.getClient().srem('chat:online_users', userId);
          }
        } catch (err) {
          this.logger.warn(`Lỗi xóa Redis presence online: ${err instanceof Error ? err.message : String(err)}`);
        }
        this.server.emit('user:offline', { userId });
      }
    }

    this.logger.log(`User ${userId} đã ngắt kết nối Socket ${client.id}`);

    // Dọn dẹp phiên cuộc gọi nếu user ngắt kết nối khi đang gọi
    for (const [key, session] of this.activeCalls.entries()) {
      if (session.callerId === userId || session.targetUserId === userId) {
        this.activeCalls.delete(key);
        const partnerId = session.callerId === userId ? session.targetUserId : session.callerId;
        this.server.to(`user:${partnerId}`).emit('call:ended', { by: userId });

        const duration = session.acceptedAt
          ? Math.max(1, Math.round((Date.now() - session.acceptedAt) / 1000))
          : 0;
        const status: CallStatus = session.acceptedAt ? 'completed' : 'missed';

        void this.chatService
          .saveCallMessage(
            session.callerId,
            session.targetUserId,
            session.callType,
            status,
            duration,
            session.conversationId,
          )
          .then((msg) => {
            this.broadcastNewMessage(msg);
          })
          .catch((err) => {
            this.logger.error(
              `Lỗi lưu log cuộc gọi ngắt kết nối: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }
    }
  }

  /**
   * Broadcast tin nhắn mới tới cả 2 người dùng qua cả MQTT Protobuf và Socket.IO
   */
  private broadcastNewMessage(message: {
    _id: { toString(): string } | string;
    id?: { toString(): string } | string;
    conversationId: { toString(): string } | string;
    senderId: { toString(): string } | string;
    receiverId: { toString(): string } | string;
    text: string;
    type?: string;
    callLog?: unknown;
    location?: unknown;
    createdAt?: Date | string;
    readAt?: Date | string | null;
    isDeleted?: boolean;
  }) {
    const senderId = message.senderId.toString();
    const receiverId = message.receiverId.toString();

    // 1. Phát qua MQTT nhị phân (Protocol Buffers)
    try {
      this.mqttBrokerService.publishChatMessage(message);
    } catch (err) {
      this.logger.error(
        `Lỗi publish MQTT tin nhắn: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // 2. Chuyển đổi thành plain object với id/conversationId dạng chuỗi cho Socket.IO
    const serializedMessage = {
      _id: message._id.toString(),
      id: message._id.toString(),
      conversationId: message.conversationId.toString(),
      senderId,
      receiverId,
      text: message.text,
      type: message.type || 'text',
      callLog: message.callLog || null,
      location: message.location || null,
      createdAt:
        typeof message.createdAt === 'string'
          ? message.createdAt
          : message.createdAt
            ? message.createdAt.toISOString()
            : new Date().toISOString(),
      readAt:
        typeof message.readAt === 'string'
          ? message.readAt
          : message.readAt
            ? message.readAt.toISOString()
            : null,
      isDeleted: Boolean(message.isDeleted),
    };

    // 3. Phát qua Socket.IO tới cả hai phía
    this.server.to(`user:${senderId}`).to(`user:${receiverId}`).emit('message:new', serializedMessage);
  }

  /**
   * Gửi tin nhắn 1-1 realtime
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId) {
      return { success: false, message: 'Chưa xác thực người gửi' };
    }

    try {
      const message = await this.chatService.saveMessage(
        senderId,
        dto.receiverId,
        dto.text,
        dto.conversationId,
        {
          type: dto.type,
          location: dto.location,
        },
      );

      // Bắn event message:new tới cả sender và receiver (qua cả MQTT và Socket.IO)
      this.broadcastNewMessage(message);

      // Kích hoạt Aura Bot nếu tin nhắn gửi tới Aura hoặc nhắc tới @aura
      void this.triggerAuraReply({
        senderId,
        receiverId: dto.receiverId,
        text: dto.text,
        conversationId: message.conversationId.toString(),
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(
        `Lỗi gửi tin nhắn từ ${senderId} tới ${dto.receiverId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Gửi tin nhắn thất bại',
      };
    }
  }

  /**
   * Kích hoạt bot Aura AI trả lời nếu tin nhắn gửi trực tiếp tới Aura hoặc nhắc tới @aura
   */
  triggerAuraReply(params: {
    senderId: string;
    receiverId: string;
    text: string;
    conversationId: string;
  }): void {
    runInDetachedContext(() => {
      void this.executeAuraReply(params);
    });
  }

  private async executeAuraReply(params: {
    senderId: string;
    receiverId: string;
    text: string;
    conversationId: string;
  }): Promise<void> {
    const { senderId, receiverId, text, conversationId } = params;
    const isMentionAura = /(^|\s)@aura\b/i.test(text);
    const isAuraDirect = receiverId === AURA_BOT_ID;

    if (!this.groqService || (!isMentionAura && !isAuraDirect)) return;

    // Phát sự kiện Aura đang gõ
    this.server?.to(`user:${senderId}`).emit('typing:start', {
      conversationId,
      userId: AURA_BOT_ID,
      userName: 'Aura AI',
    });
    if (!isAuraDirect) {
      this.server?.to(`user:${receiverId}`).emit('typing:start', {
        conversationId,
        userId: AURA_BOT_ID,
        userName: 'Aura AI',
      });
    }

    try {
      const recent = await this.chatService.getMessages(conversationId, senderId, 8);
      const history = recent.map((m) => ({
        senderName: m.senderId.toString() === senderId ? 'Người dùng' : 'Aura AI',
        text: m.text,
      }));

      // 1. Khởi tạo trước messageId và phát sự kiện stream_start
      const messageId = new Types.ObjectId().toString();
      const createdAt = new Date().toISOString();

      const streamStartPayload = {
        _id: messageId,
        id: messageId,
        conversationId,
        senderId: AURA_BOT_ID,
        receiverId: senderId,
        text: '',
        type: 'text',
        createdAt,
        isStreaming: true,
      };

      this.server?.to(`user:${senderId}`).emit('message:stream_start', streamStartPayload);
      if (!isAuraDirect) {
        this.server?.to(`user:${receiverId}`).emit('message:stream_start', streamStartPayload);
      }

      // Ngừng typing indicator khi bắt đầu bắn chữ
      this.server?.to(`user:${senderId}`).emit('typing:stop', {
        conversationId,
        userId: AURA_BOT_ID,
      });
      if (!isAuraDirect) {
        this.server?.to(`user:${receiverId}`).emit('typing:stop', {
          conversationId,
          userId: AURA_BOT_ID,
        });
      }

      // 2. Stream từng chunk về client với nhịp điệu gõ chữ tự nhiên (typewriter pacing)
      let accumulatedText = '';
      for await (const rawChunk of this.groqService.streamAuraChatReply(text, history, {
        conversationId,
        senderId,
        partnerId: isAuraDirect ? undefined : receiverId,
      })) {
        const subChunks = this.splitIntoNaturalChunks(rawChunk);
        for (const chunk of subChunks) {
          accumulatedText += chunk;
          const chunkPayload = {
            messageId,
            conversationId,
            chunk,
            text: accumulatedText,
          };
          this.server?.to(`user:${senderId}`).emit('message:stream_chunk', chunkPayload);
          if (!isAuraDirect) {
            this.server?.to(`user:${receiverId}`).emit('message:stream_chunk', chunkPayload);
          }
          // Nhịp điệu đọc tự nhiên chuẩn Gemini/ChatGPT (~45ms/từ)
          await new Promise((resolve) => setTimeout(resolve, 45));
        }
      }

      // 3. Lưu toàn bộ tin nhắn đã hoàn thiện vào database với đúng messageId
      const finalReply = accumulatedText.trim() || 'Aura AI đã nhận được tin nhắn của bạn.';
      const auraMsg = await this.chatService.saveMessage(
        AURA_BOT_ID,
        senderId,
        finalReply,
        conversationId,
        { customMessageId: messageId },
      );

      const streamEndPayload = {
        _id: auraMsg._id.toString(),
        id: auraMsg._id.toString(),
        conversationId: auraMsg.conversationId.toString(),
        senderId: AURA_BOT_ID,
        receiverId: senderId,
        text: auraMsg.text,
        type: auraMsg.type || 'text',
        createdAt:
          typeof auraMsg.createdAt === 'string'
            ? auraMsg.createdAt
            : auraMsg.createdAt
              ? auraMsg.createdAt.toISOString()
              : createdAt,
        readAt: null,
        isDeleted: false,
        isStreaming: false,
      };

      this.server?.to(`user:${senderId}`).emit('message:stream_end', streamEndPayload);
      if (!isAuraDirect) {
        this.server?.to(`user:${receiverId}`).emit('message:stream_end', streamEndPayload);
      }
    } catch (err: unknown) {
      this.logger.error(`Lỗi Aura bot phản hồi: ${err instanceof Error ? err.message : String(err)}`);
      this.server?.to(`user:${senderId}`).emit('typing:stop', {
        conversationId,
        userId: AURA_BOT_ID,
      });
      if (!isAuraDirect) {
        this.server?.to(`user:${receiverId}`).emit('typing:stop', {
          conversationId,
          userId: AURA_BOT_ID,
        });
      }
    }
  }

  /**
   * Tách chuỗi văn bản thành các chunk từ ngữ tự nhiên kèm khoảng trắng
   */
  private splitIntoNaturalChunks(text: string): string[] {
    const parts = text.split(/(\s+)/);
    const chunks: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const word = parts[i];
      const space = parts[i + 1] || '';
      if (word || space) {
        chunks.push(word + space);
      }
    }
    return chunks.length > 0 ? chunks : [text];
  }

  @SubscribeMessage('location:live_update')
  async handleLiveLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      messageId: string;
      conversationId: string;
      receiverId: string;
      latitude?: number;
      longitude?: number;
      address?: string;
      name?: string;
      isLiveActive?: boolean;
    },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload.messageId) return { success: false };

    try {
      const updated = await this.chatService.updateLiveLocation(
        payload.messageId,
        senderId,
        {
          latitude: payload.latitude,
          longitude: payload.longitude,
          address: payload.address,
          name: payload.name,
          isLiveActive: payload.isLiveActive,
        },
      );

      if (!updated?.location) return { success: false };
      const locationData = updated.location;

      // Broadcast tới cả receiver và sender
      const senderIdStr = senderId.toString();
      const receiverIdStr = updated.receiverId ? updated.receiverId.toString() : (payload.receiverId || "");
      const conversationIdStr = updated.conversationId ? updated.conversationId.toString() : (payload.conversationId || "");

      let broadcaster = this.server.to(`user:${senderIdStr}`);
      if (receiverIdStr) {
        broadcaster = broadcaster.to(`user:${receiverIdStr}`);
      }
      if (conversationIdStr) {
        broadcaster = broadcaster.to(`conversation:${conversationIdStr}`);
      }
      broadcaster.emit('location:live_updated', {
        messageId: payload.messageId,
        conversationId: conversationIdStr,
        senderId: senderIdStr,
        location: locationData,
      });

      return { success: true, location: locationData };
    } catch (err) {
      this.logger.error(
        `Lỗi cập nhật live location: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { success: false };
    }
  }

  /**
   * Bắt đầu soạn tin nhắn (Typing Start)
   */
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; receiverId: string },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload.receiverId) return;

    this.server.to(`user:${payload.receiverId}`).emit('typing:start', {
      conversationId: payload.conversationId,
      userId: senderId,
    });
  }

  /**
   * Dừng soạn tin nhắn (Typing Stop)
   */
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; receiverId: string },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload.receiverId) return;

    this.server.to(`user:${payload.receiverId}`).emit('typing:stop', {
      conversationId: payload.conversationId,
      userId: senderId,
    });
  }

  /**
   * Đánh dấu đã xem tin nhắn (Message Read / Seen)
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; receiverId: string },
  ) {
    const readerId = client.data?.user?.sub;
    if (!readerId || !payload.conversationId) return;

    try {
      await this.chatService.markAsRead(payload.conversationId, readerId);

      // Nếu người đọc đã "Hạn chế" đối phương, ẩn trạng thái "Đã xem" (chuẩn Facebook Restrict)
      const conv = await this.chatService.getConversationById(payload.conversationId);
      const isRestrictedByReader = conv?.restrictedBy?.some(
        (id) => id.toString() === readerId,
      );

      // Báo cho người gửi biết tin nhắn đã được xem (nếu không bị hạn chế)
      if (payload.receiverId && !isRestrictedByReader) {
        this.server.to(`user:${payload.receiverId}`).emit('message:seen', {
          conversationId: payload.conversationId,
          readerId,
          readAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error(
        `Lỗi đánh dấu đã đọc: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Thu hồi / Xóa tin nhắn realtime
   */
  @SubscribeMessage('message:delete')
  async handleMessageDelete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; conversationId: string; receiverId?: string },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload.messageId) return { success: false, message: 'Dữ liệu không hợp lệ' };

    try {
      const message = await this.chatService.deleteMessage(payload.messageId, senderId);

      // Phát sự kiện xóa tin nhắn cho cả hai bên
      const emitData = {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        deletedBy: senderId,
      };

      this.server.to(`user:${senderId}`).emit('message:deleted', emitData);
      if (payload.receiverId) {
        this.server.to(`user:${payload.receiverId}`).emit('message:deleted', emitData);
      }

      return { success: true, message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Xóa tin nhắn thất bại',
      };
    }
  }

  /**
   * Thả cảm xúc / xóa cảm xúc vào tin nhắn realtime (Like, Love, Care, Haha, Wow, Sad, Angry)
   */
  @SubscribeMessage('message:reaction')
  async handleMessageReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      messageId: string;
      conversationId: string;
      type: string;
      receiverId?: string;
    },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload.messageId || !payload.type) {
      return { success: false, message: 'Dữ liệu không hợp lệ' };
    }

    try {
      const result = await this.chatService.reactToMessage(
        payload.messageId,
        senderId,
        payload.type,
      );

      const emitData = {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        reactions: result.reactions,
        userId: senderId,
        type: payload.type,
      };

      // Phát sự kiện cập nhật cảm xúc tin nhắn cho cả người gửi và người nhận
      this.server.to(`user:${senderId}`).emit('message:reaction', emitData);
      if (payload.receiverId) {
        this.server.to(`user:${payload.receiverId}`).emit('message:reaction', emitData);
      }

      return { success: true, ...result };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Cập nhật cảm xúc tin nhắn thất bại',
      };
    }
  }

  /**
   * Cập nhật chủ đề / hình nền cuộc trò chuyện realtime
   */
  @SubscribeMessage('conversation:theme')
  async handleUpdateTheme(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; theme: string; partnerId?: string },
  ) {
    const userId = client.data?.user?.sub;
    if (!userId || !payload.conversationId || !payload.theme) return;

    try {
      await this.chatService.updateConversationTheme(
        payload.conversationId,
        userId,
        payload.theme,
      );

      const emitData = {
        conversationId: payload.conversationId,
        theme: payload.theme,
        updatedBy: userId,
      };

      this.server.to(`user:${userId}`).emit('conversation:theme_updated', emitData);
      if (payload.partnerId) {
        this.server.to(`user:${payload.partnerId}`).emit('conversation:theme_updated', emitData);
      }

      return { success: true, theme: payload.theme };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Đổi hình nền thất bại',
      };
    }
  }

  /**
   * Chặn cuộc trò chuyện realtime
   */
  @SubscribeMessage('conversation:block')
  async handleBlockConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; partnerId?: string },
  ) {
    const userId = client.data?.user?.sub;
    if (!userId || !payload.conversationId) return;

    try {
      await this.chatService.blockConversation(payload.conversationId, userId);

      const emitData = {
        conversationId: payload.conversationId,
        blockedBy: userId,
      };

      this.server.to(`user:${userId}`).emit('conversation:blocked', emitData);
      if (payload.partnerId) {
        this.server.to(`user:${payload.partnerId}`).emit('conversation:blocked', emitData);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Chặn thất bại',
      };
    }
  }

  /**
   * Bỏ chặn cuộc trò chuyện realtime
   */
  @SubscribeMessage('conversation:unblock')
  async handleUnblockConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; partnerId?: string },
  ) {
    const userId = client.data?.user?.sub;
    if (!userId || !payload.conversationId) return;

    try {
      await this.chatService.unblockConversation(payload.conversationId, userId);

      const emitData = {
        conversationId: payload.conversationId,
      };

      this.server.to(`user:${userId}`).emit('conversation:unblocked', emitData);
      if (payload.partnerId) {
        this.server.to(`user:${payload.partnerId}`).emit('conversation:unblocked', emitData);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Bỏ chặn thất bại',
      };
    }
  }

  // ───────────────────────── WebRTC 1-1 Calling Signaling ─────────────────────────

  /**
   * Khởi tạo cuộc gọi tới người dùng khác
   */
  @SubscribeMessage('call:initiate')
  handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      targetUserId: string;
      callType: 'audio' | 'video';
      callerName?: string;
      callerAvatar?: string;
      conversationId?: string;
    },
  ) {
    const callerId = client.data?.user?.sub;
    if (!callerId || !payload?.targetUserId) return;

    const callKey = [callerId, payload.targetUserId].sort().join(':');
    this.activeCalls.set(callKey, {
      callerId,
      targetUserId: payload.targetUserId,
      callType: payload.callType || 'audio',
      conversationId: payload.conversationId,
      initiatedAt: Date.now(),
    });

    this.logger.log(`Cuộc gọi [${payload.callType}] từ ${callerId} tới ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:incoming', {
      callerId,
      callerName: payload.callerName || client.data?.user?.email,
      callerAvatar: payload.callerAvatar,
      callType: payload.callType || 'audio',
      conversationId: payload.conversationId,
    });
  }

  /**
   * Người nhận chấp nhận cuộc gọi
   */
  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { callerId: string },
  ) {
    const calleeId = client.data?.user?.sub;
    if (!calleeId || !payload?.callerId) return;

    const callKey = [calleeId, payload.callerId].sort().join(':');
    const session = this.activeCalls.get(callKey);
    if (session) {
      session.acceptedAt = Date.now();
    }

    this.logger.log(`Cuộc gọi được chấp nhận bởi ${calleeId} cho ${payload.callerId}`);
    this.server.to(`user:${payload.callerId}`).emit('call:accepted', {
      calleeId,
    });
  }

  /**
   * Từ chối hoặc hủy cuộc gọi
   */
  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      targetUserId: string;
      reason?: string;
      callType?: 'audio' | 'video';
      conversationId?: string;
    },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload?.targetUserId) return;

    const callKey = [senderId, payload.targetUserId].sort().join(':');
    const session = this.activeCalls.get(callKey);
    this.activeCalls.delete(callKey);

    this.logger.log(`Cuộc gọi bị từ chối/hủy giữa ${senderId} và ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:rejected', {
      by: senderId,
      reason: payload.reason || 'declined',
    });

    // Lưu bản ghi tin nhắn cuộc gọi vào đoạn chat
    try {
      const callerId = session?.callerId || (payload.reason === 'cancelled' ? senderId : payload.targetUserId);
      const calleeId = session?.targetUserId || (payload.reason === 'cancelled' ? payload.targetUserId : senderId);
      const callType: CallType = session?.callType || payload.callType || 'audio';
      const status: CallStatus =
        payload.reason === 'busy' ? 'busy' : payload.reason === 'cancelled' ? 'missed' : 'declined';

      const message = await this.chatService.saveCallMessage(
        callerId,
        calleeId,
        callType,
        status,
        0,
        session?.conversationId || payload.conversationId,
      );

      this.broadcastNewMessage(message);
    } catch (err) {
      this.logger.error(`Lỗi lưu log cuộc gọi reject: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Kết thúc cuộc gọi
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      targetUserId: string;
      duration?: number;
      callType?: 'audio' | 'video';
      conversationId?: string;
    },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload?.targetUserId) return;

    const callKey = [senderId, payload.targetUserId].sort().join(':');
    const session = this.activeCalls.get(callKey);
    this.activeCalls.delete(callKey);

    this.logger.log(`Cuộc gọi kết thúc giữa ${senderId} và ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:ended', {
      by: senderId,
    });

    // Lưu bản ghi tin nhắn cuộc gọi vào đoạn chat
    try {
      const callerId = session?.callerId || senderId;
      const calleeId = session?.targetUserId || payload.targetUserId;
      const callType: CallType = session?.callType || payload.callType || 'audio';

      let duration = typeof payload.duration === 'number' ? payload.duration : 0;
      if (!duration && session?.acceptedAt) {
        duration = Math.max(1, Math.round((Date.now() - session.acceptedAt) / 1000));
      }

      const status: CallStatus = session?.acceptedAt || duration > 0 ? 'completed' : 'missed';

      const message = await this.chatService.saveCallMessage(
        callerId,
        calleeId,
        callType,
        status,
        duration,
        session?.conversationId || payload.conversationId,
      );

      this.broadcastNewMessage(message);
    } catch (err) {
      this.logger.error(`Lỗi lưu log cuộc gọi end: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Chuyển tiếp tín hiệu WebRTC (Offer, Answer, ICE Candidates)
   */
  @SubscribeMessage('webrtc:signal')
  handleWebrtcSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { targetUserId: string; signal: unknown },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload?.targetUserId || !payload?.signal) return;

    this.server.to(`user:${payload.targetUserId}`).emit('webrtc:signal', {
      senderId,
      signal: payload.signal,
    });
  }

  /**
   * Trích xuất token từ handshake auth, header hoặc cookie
   */
  private extractToken(client: Socket): string | null {
    // 1. Auth payload
    if (client.handshake.auth?.token) {
      const token = client.handshake.auth.token;
      return token.startsWith('Bearer ') ? token.slice(7) : token;
    }

    // 2. Authorization Header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 3. Cookie accessToken
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/accessToken=([^;]+)/);
      if (match) return match[1];
    }

    return null;
  }
}
