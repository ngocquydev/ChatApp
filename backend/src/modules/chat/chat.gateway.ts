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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { RedisService } from '../redis/redis/redis.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      sub: string;
      email: string;
      role: string;
    };
  };
}

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

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  afterInit() {
    this.logger.log('Chat WebSocket Gateway đã khởi tạo thành công');
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
      await this.redisService.getClient().sadd('chat:online_users', userId);

      // Thông báo cho các client khác user này đã Online
      this.server.emit('user:online', { userId });

      // Gửi danh sách các user hiện đang online cho client mới kết nối
      const onlineList = await this.redisService
        .getClient()
        .smembers('chat:online_users');
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
        await this.redisService.getClient().srem('chat:online_users', userId);
        this.server.emit('user:offline', { userId });
      }
    }

    this.logger.log(`User ${userId} đã ngắt kết nối Socket ${client.id}`);
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
      );

      // Bắn event message:new tới cả sender và receiver
      this.server
        .to(`user:${senderId}`)
        .to(`user:${dto.receiverId}`)
        .emit('message:new', message);

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
    },
  ) {
    const callerId = client.data?.user?.sub;
    if (!callerId || !payload?.targetUserId) return;

    this.logger.log(`Cuộc gọi [${payload.callType}] từ ${callerId} tới ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:incoming', {
      callerId,
      callerName: payload.callerName || client.data?.user?.email,
      callerAvatar: payload.callerAvatar,
      callType: payload.callType || 'audio',
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

    this.logger.log(`Cuộc gọi được chấp nhận bởi ${calleeId} cho ${payload.callerId}`);
    this.server.to(`user:${payload.callerId}`).emit('call:accepted', {
      calleeId,
    });
  }

  /**
   * Từ chối hoặc hủy cuộc gọi
   */
  @SubscribeMessage('call:reject')
  handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { targetUserId: string; reason?: string },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload?.targetUserId) return;

    this.logger.log(`Cuộc gọi bị từ chối/hủy giữa ${senderId} và ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:rejected', {
      by: senderId,
      reason: payload.reason || 'declined',
    });
  }

  /**
   * Kết thúc cuộc gọi
   */
  @SubscribeMessage('call:end')
  handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { targetUserId: string },
  ) {
    const senderId = client.data?.user?.sub;
    if (!senderId || !payload?.targetUserId) return;

    this.logger.log(`Cuộc gọi kết thúc giữa ${senderId} và ${payload.targetUserId}`);
    this.server.to(`user:${payload.targetUserId}`).emit('call:ended', {
      by: senderId,
    });
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
