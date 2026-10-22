import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createServer, Server as HttpServer, IncomingMessage } from 'node:http';
import { WebSocketServer, createWebSocketStream, WebSocket } from 'ws';
import { Aedes, Client } from 'aedes';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis/redis.service.js';
import { ChatService } from './chat.service.js';
import {
  SendMessageProto,
  ChatMessageProto,
  TypingEventProto,
  PresenceEventProto,
  MessageReadProto,
} from './proto/chat.proto.js';

interface AuthenticatedMqttClient extends Client {
  userId?: string;
  user?: any;
}

@Injectable()
export class MqttBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBrokerService.name);
  private aedes: Aedes | null = null;
  private httpServer: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private readonly userClientMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly chatService: ChatService,
  ) {}

  async onModuleInit() {
    await this.initAedesBroker();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async initAedesBroker() {
    this.aedes = new Aedes({
      heartbeatInterval: 30000,
      connectTimeout: 30000,
    });

    // Bắt buộc gọi listen() để Aedes kích hoạt Broker và Persistence (closed = false)
    await this.aedes.listen();

    // 1. Xác thực MQTT Client qua JWT Token (từ password, cookie hoặc query param)
    this.aedes.authenticate = async (
      client: AuthenticatedMqttClient,
      username,
      password,
      done,
    ) => {
      try {
        let token = password ? password.toString('utf-8') : '';

        // Fallback: Tìm trong cookie hoặc query param của WebSocket handshake request
        const req: IncomingMessage | undefined =
          client.req || (client.conn as any)?.req || (client.conn as any)?.conn;
        if (!token && req) {
          // Trích từ cookie
          const cookieHeader = req.headers?.cookie;
          if (cookieHeader) {
            const match = cookieHeader.match(/accessToken=([^;]+)/);
            if (match) token = match[1];
          }

          // Trích từ query param: ws://localhost:1884?token=...
          if (!token && req.url) {
            const urlObj = new URL(req.url, 'http://localhost');
            token = urlObj.searchParams.get('token') || '';
          }
        }

        if (!token) {
          if (username) {
            client.userId = username;
            this.logger.log(`[MQTT] Xác thực Client ${client.id} theo UserID: ${username}`);
            return done(null, true);
          }
          const err = new Error('Thiếu Token xác thực trong MQTT CONNECT') as any;
          err.returnCode = 4; // Bad username or password
          return done(err, false);
        }

        const secret =
          process.env.JWT_SECRET || 'my_super_secret_key_chat_app';
        const payload = await this.jwtService.verifyAsync(token, { secret });
        client.userId = payload.sub || payload._id || payload.id;
        client.user = payload;

        this.logger.log(
          `[MQTT] Client ${client.id} đã xác thực thành công cho User: ${client.userId}`,
        );
        return done(null, true);
      } catch (error) {
        this.logger.warn(
          `[MQTT] Xác thực thất bại cho Client ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        const err = new Error('Token không hợp lệ') as any;
        err.returnCode = 4;
        return done(err, false);
      }
    };

    // 2. Phân quyền Subscribe Topic
    this.aedes.authorizeSubscribe = (
      client: AuthenticatedMqttClient,
      subscription,
      callback,
    ) => {
      const userId = client.userId;
      if (!userId) {
        return callback(new Error('Chưa xác thực'), null);
      }

      // User chỉ được subscribe topic của chính mình hoặc topic công khai
      if (
        subscription.topic === `chat/user/${userId}` ||
        subscription.topic === `chat/user/${userId}/typing` ||
        subscription.topic === `chat/user/${userId}/seen` ||
        subscription.topic === 'chat/presence'
      ) {
        return callback(null, subscription);
      }

      this.logger.warn(
        `[MQTT] Từ chối User ${userId} subscribe topic trái phép: ${subscription.topic}`,
      );
      return callback(
        new Error(`Không có quyền subscribe topic ${subscription.topic}`),
        null,
      );
    };

    // 3. Phân quyền Publish Topic
    this.aedes.authorizePublish = (
      client: AuthenticatedMqttClient | null,
      packet,
      callback,
    ) => {
      // Cho phép broker nội bộ publish mọi topic
      if (!client) {
        return callback(null);
      }

      // Client chỉ được publish lên các topic hành động:
      const allowedTopics = ['chat/send', 'chat/typing', 'chat/read'];
      if (allowedTopics.includes(packet.topic)) {
        return callback(null);
      }

      return callback(
        new Error(`Không có quyền publish lên topic ${packet.topic}`),
      );
    };

    // 4. Xử lý các gói tin Binary Protobuf gửi lên từ Client
    this.aedes.on('publish', async (packet, client: AuthenticatedMqttClient | null) => {
      if (!client || !client.userId) return; // Bỏ qua gói nội bộ từ broker

      const senderId = client.userId;

      // Xử lý gửi tin nhắn nhị phân
      if (packet.topic === 'chat/send') {
        try {
          const payloadBuffer = Buffer.isBuffer(packet.payload)
            ? packet.payload
            : Buffer.from(packet.payload);

          // Giải mã Protocol Buffers nhị phân
          const decoded = SendMessageProto.decode(payloadBuffer) as any;
          if (!decoded.text || !decoded.receiverId) return;

          this.logger.log(
            `[MQTT + Protobuf] Nhận tin nhắn binary (${payloadBuffer.byteLength} bytes) từ ${senderId} tới ${decoded.receiverId}`,
          );

          // Lưu vào database
          const message = await this.chatService.saveMessage(
            senderId,
            decoded.receiverId,
            decoded.text,
            decoded.conversationId,
          );

          // Đóng gói tin nhắn thành Binary Protobuf
          const messageProtoPayload = {
            id: message._id.toString(),
            conversationId: message.conversationId.toString(),
            senderId,
            receiverId: decoded.receiverId,
            text: message.text,
            createdAt: message.createdAt
              ? message.createdAt.toISOString()
              : new Date().toISOString(),
            readAt: message.readAt ? message.readAt.toISOString() : '',
          };

          const binaryEncoded = Buffer.from(
            ChatMessageProto.encode(messageProtoPayload).finish(),
          );

          // Phát binary packet tới topic của người nhận và người gửi
          this.publishBinary(`chat/user/${decoded.receiverId}`, binaryEncoded);
          this.publishBinary(`chat/user/${senderId}`, binaryEncoded);
        } catch (error) {
          this.logger.error(
            `[MQTT] Lỗi xử lý tin nhắn nhị phân chat/send: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Xử lý Typing event nhị phân
      else if (packet.topic === 'chat/typing') {
        try {
          const payloadBuffer = Buffer.isBuffer(packet.payload)
            ? packet.payload
            : Buffer.from(packet.payload);

          const decoded = TypingEventProto.decode(payloadBuffer) as any;
          let targetReceiverId = decoded.receiverId;

          // Nếu chưa có receiverId, tra cứu từ cuộc hội thoại
          if (!targetReceiverId && decoded.conversationId) {
            try {
              const conv = await this.chatService.getConversationById(decoded.conversationId);
              if (conv && conv.participants) {
                const other = conv.participants.find((p: any) => p.toString() !== senderId);
                if (other) targetReceiverId = other.toString();
              }
            } catch {
              // Bỏ qua lỗi tìm conversation
            }
          }

          if (targetReceiverId) {
            const binaryEncoded = Buffer.from(
              TypingEventProto.encode({
                conversationId: decoded.conversationId,
                userId: senderId,
                isTyping: Boolean(decoded.isTyping),
                receiverId: targetReceiverId,
              }).finish(),
            );

            this.publishBinary(
              `chat/user/${targetReceiverId}/typing`,
              binaryEncoded,
              0,
            );
          }
        } catch (error) {
          this.logger.error(`[MQTT] Lỗi xử lý typing nhị phân: ${error}`);
        }
      }

      // Xử lý Read / Seen event nhị phân
      else if (packet.topic === 'chat/read') {
        try {
          const payloadBuffer = Buffer.isBuffer(packet.payload)
            ? packet.payload
            : Buffer.from(packet.payload);

          const decoded = MessageReadProto.decode(payloadBuffer) as any;
          await this.chatService.markAsRead(decoded.conversationId, senderId);

          const binaryEncoded = Buffer.from(
            MessageReadProto.encode({
              conversationId: decoded.conversationId,
              readerId: senderId,
              readAt: new Date().toISOString(),
            }).finish(),
          );

          if (decoded.receiverId) {
            this.publishBinary(
              `chat/user/${decoded.receiverId}/seen`,
              binaryEncoded,
              1,
            );
          }
        } catch (error) {
          this.logger.error(`[MQTT] Lỗi xử lý seen event: ${error}`);
        }
      }
    });

    // 5. Quản lý trạng thái Presence khi Client kết nối / ngắt kết nối
    this.aedes.on('client', async (client: AuthenticatedMqttClient) => {
      const userId = client.userId;
      if (!userId) return;

      if (!this.userClientMap.has(userId)) {
        this.userClientMap.set(userId, new Set());
      }
      this.userClientMap.get(userId)!.add(client.id);

      // Lưu Redis & thông báo online
      await this.redisService.getClient().sadd('chat:online_users', userId);

      const onlineList = await this.redisService
        .getClient()
        .smembers('chat:online_users');

      // Gửi binary presence thông báo tới mọi client đang theo dõi
      const binaryPresence = Buffer.from(
        PresenceEventProto.encode({
          userId,
          isOnline: true,
          onlineUserIds: onlineList,
        }).finish(),
      );
      this.publishBinary('chat/presence', binaryPresence, 0);

      this.logger.log(`[MQTT Presence] User ${userId} online (Client: ${client.id})`);
    });

    this.aedes.on(
      'clientDisconnect',
      async (client: AuthenticatedMqttClient) => {
        const userId = client.userId;
        if (!userId) return;

        const set = this.userClientMap.get(userId);
        if (set) {
          set.delete(client.id);
          if (set.size === 0) {
            this.userClientMap.delete(userId);
            await this.redisService.getClient().srem('chat:online_users', userId);

            const binaryPresence = Buffer.from(
              PresenceEventProto.encode({
                userId,
                isOnline: false,
                onlineUserIds: [],
              }).finish(),
            );
            this.publishBinary('chat/presence', binaryPresence, 0);

            this.logger.log(`[MQTT Presence] User ${userId} offline`);
          }
        }
      },
    );

    // 6. Khởi chạy HTTP Server cho WebSocket Stream MQTT (Port 1884)
    const mqttPort = Number(process.env.MQTT_PORT) || 1884;
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (wsSocket: WebSocket, req: IncomingMessage) => {
      const stream = createWebSocketStream(wsSocket);
      (stream as any).conn = req;
      if (this.aedes) {
        this.aedes.handle(stream as any, req);
      }
    });

    this.httpServer.listen(mqttPort, () => {
      this.logger.log(
        `🚀 [MQTT + Protobuf Broker] Facebook-style Binary Chat Server đang lắng nghe tại ws://localhost:${mqttPort}`,
      );
    });
  }

  /**
   * Phát gói tin Binary Protobuf tới một MQTT Topic
   */
  public publishBinary(
    topic: string,
    payload: Buffer | Uint8Array,
    qos: 0 | 1 | 2 = 1,
  ) {
    if (!this.aedes) return;

    this.aedes.publish(
      {
        cmd: 'publish',
        qos,
        dup: false,
        retain: false,
        topic,
        payload: Buffer.isBuffer(payload) ? payload : Buffer.from(payload),
      },
      (err) => {
        if (err) {
          this.logger.error(
            `[MQTT] Lỗi publish nhị phân tới topic ${topic}: ${err.message}`,
          );
        }
      },
    );
  }

  private async shutdown() {
    this.logger.log('[MQTT] Đang đóng MQTT Broker...');
    if (this.wss) {
      this.wss.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.aedes) {
      await new Promise<void>((resolve) => {
        this.aedes?.close(() => resolve());
      });
    }
  }
}
