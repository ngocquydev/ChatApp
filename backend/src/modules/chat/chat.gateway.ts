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

      // Báo cho người gửi biết tin nhắn đã được xem
      if (payload.receiverId) {
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
