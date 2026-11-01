import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createServer as createHttpServer, Server as HttpServer, IncomingMessage } from 'node:http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'node:https';
import { createServer as createTlsServer, Server as TlsServer } from 'node:tls';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
  user?: unknown;
}

@Injectable()
export class MqttBrokerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBrokerService.name);
  private aedes: Aedes | null = null;
  private httpServer: HttpServer | null = null;
  private httpsServer: HttpsServer | null = null;
  private tlsServer: TlsServer | null = null;
  private wss: WebSocketServer | null = null;
  private wssSecure: WebSocketServer | null = null;
  private readonly userClientMap = new Map<string, Set<string>>();

  /** Callback lắng nghe tin nhắn mới nhận được từ MQTT để Gateway kích hoạt Aura AI */
  public onChatMessageReceived?: (data: {
    senderId: string;
    receiverId: string;
    text: string;
    conversationId: string;
  }) => void;

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

  /**
   * Nạp khóa riêng và chứng chỉ SSL/TLS để mã hóa đường truyền MQTT (chống bắt gói tin)
   */
  public resolveTlsCredentials(): { key: Buffer | string; cert: Buffer | string } | null {
    // 1. Kiểm tra trực tiếp từ Environment Variables dạng chuỗi PEM
    const envKey = process.env.MQTT_TLS_KEY;
    const envCert = process.env.MQTT_TLS_CERT;
    if (envKey && envCert) {
      this.logger.log('🔐 [MQTT TLS] Nạp chứng chỉ SSL/TLS từ biến môi trường (MQTT_TLS_KEY / MQTT_TLS_CERT)');
      return {
        key: envKey.replace(/\\n/g, '\n'),
        cert: envCert.replace(/\\n/g, '\n'),
      };
    }

    // 2. Kiểm tra đường dẫn file chứng chỉ tùy chỉnh hoặc mặc định trong certs/
    const candidatePaths = [
      {
        key: process.env.MQTT_TLS_KEY_PATH,
        cert: process.env.MQTT_TLS_CERT_PATH,
      },
      {
        key: path.resolve(process.cwd(), 'certs/mqtt-key.pem'),
        cert: path.resolve(process.cwd(), 'certs/mqtt-cert.pem'),
      },
      {
        key: path.resolve(process.cwd(), 'backend/certs/mqtt-key.pem'),
        cert: path.resolve(process.cwd(), 'backend/certs/mqtt-cert.pem'),
      },
      {
        key: path.resolve(process.cwd(), '../backend/certs/mqtt-key.pem'),
        cert: path.resolve(process.cwd(), '../backend/certs/mqtt-cert.pem'),
      },
    ];

    for (const p of candidatePaths) {
      if (p.key && p.cert && fs.existsSync(p.key) && fs.existsSync(p.cert)) {
        try {
          const key = fs.readFileSync(p.key);
          const cert = fs.readFileSync(p.cert);
          this.logger.log(`🔐 [MQTT TLS] Nạp chứng chỉ SSL/TLS thành công từ tệp: ${p.cert}`);
          return { key, cert };
        } catch (readErr) {
          this.logger.warn(`[MQTT TLS] Lỗi đọc tệp chứng chỉ: ${readErr instanceof Error ? readErr.message : String(readErr)}`);
        }
      }
    }

    return null;
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
        const clientConn = client.conn as unknown as
          | { req?: IncomingMessage; conn?: IncomingMessage }
          | undefined;
        const req: IncomingMessage | undefined =
          client.req || clientConn?.req || clientConn?.conn;
        if (!token && req) {
          // Trích từ cookie
          const cookieHeader = req.headers?.cookie;
          if (cookieHeader) {
            const match = cookieHeader.match(/accessToken=([^;]+)/);
            if (match) token = match[1];
          }

          // Trích từ query param: wss://localhost:8884?token=... hoặc ws://...
          if (!token && req.url) {
            const urlObj = new URL(req.url, 'http://localhost');
            token = urlObj.searchParams.get('token') || '';
          }
        }

        if (!token) {
          const isDev = process.env.NODE_ENV !== 'production';
          const allowDevFallback = isDev && process.env.MQTT_REQUIRE_AUTH !== 'true';
          if (allowDevFallback && username) {
            client.userId = username;
            this.logger.log(`[MQTT DEV] Xác thực Client ${client.id} theo UserID: ${username}`);
            return done(null, true);
          }
          const err = Object.assign(
            new Error('Thiếu Token xác thực trong MQTT CONNECT'),
            { returnCode: 4 }, // Bad username or password
          );
          return done(err, false);
        }

        const secret =
          process.env.JWT_SECRET || 'my_super_secret_key_chat_app';
        const payload = await this.jwtService.verifyAsync(token, { secret });
        const tokenUserId = (payload.sub || payload._id || payload.id || '').toString();

        if (!tokenUserId) {
          const err = Object.assign(new Error('Token không chứa định danh người dùng'), {
            returnCode: 4,
          });
          return done(err, false);
        }

        // Chống giả mạo danh tính: Nếu client gửi username thì phải trùng với tokenUserId
        if (username && username !== tokenUserId) {
          this.logger.warn(
            `[MQTT SECURITY] Phát hiện giả mạo danh tính: Token user (${tokenUserId}) khác username (${username})`,
          );
          const err = Object.assign(new Error('Danh tính không khớp với Token xác thực'), {
            returnCode: 4,
          });
          return done(err, false);
        }

        client.userId = tokenUserId;
        client.user = payload;

        this.logger.log(
          `[MQTT] Client ${client.id} đã xác thực thành công cho User: ${client.userId}`,
        );
        return done(null, true);
      } catch (error) {
        this.logger.warn(
          `[MQTT] Xác thực thất bại cho Client ${client.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        const err = Object.assign(new Error('Token không hợp lệ hoặc đã hết hạn'), {
          returnCode: 4,
        });
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
          const decoded = SendMessageProto.decode(payloadBuffer) as unknown as {
            text?: string;
            receiverId?: string;
            conversationId?: string;
          };
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
            type: message.type || 'text',
            callLog: message.callLog ? JSON.stringify(message.callLog) : '',
          };

          const binaryEncoded = Buffer.from(
            ChatMessageProto.encode(messageProtoPayload).finish(),
          );

          // Phát binary packet tới topic của người nhận và người gửi
          this.publishBinary(`chat/user/${decoded.receiverId}`, binaryEncoded);
          this.publishBinary(`chat/user/${senderId}`, binaryEncoded);

          // Kích hoạt Aura Bot nếu tin nhắn gửi tới Aura hoặc nhắc tới @aura
          if (this.onChatMessageReceived) {
            this.onChatMessageReceived({
              senderId,
              receiverId: decoded.receiverId,
              text: decoded.text,
              conversationId: message.conversationId.toString(),
            });
          }
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

          const decoded = TypingEventProto.decode(payloadBuffer) as unknown as {
            receiverId?: string;
            conversationId?: string;
            isTyping?: boolean;
          };
          let targetReceiverId = decoded.receiverId;

          // Nếu chưa có receiverId, tra cứu từ cuộc hội thoại
          if (!targetReceiverId && decoded.conversationId) {
            try {
              const conv = await this.chatService.getConversationById(decoded.conversationId);
              if (conv && conv.participants) {
                const other = conv.participants.find((p: unknown) => String(p) !== senderId);
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
          this.logger.error(
            `[MQTT] Lỗi xử lý typing nhị phân: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Xử lý Read / Seen event nhị phân
      else if (packet.topic === 'chat/read') {
        try {
          const payloadBuffer = Buffer.isBuffer(packet.payload)
            ? packet.payload
            : Buffer.from(packet.payload);

          const decoded = MessageReadProto.decode(payloadBuffer) as unknown as {
            conversationId: string;
            receiverId?: string;
          };
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
          this.logger.error(
            `[MQTT] Lỗi xử lý seen event: ${error instanceof Error ? error.message : String(error)}`,
          );
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
      let onlineList: string[] = [];
      try {
        if (this.redisService.isAvailable()) {
          await this.redisService.getClient().sadd('chat:online_users', userId);
          onlineList = await this.redisService
            .getClient()
            .smembers('chat:online_users');
        }
      } catch (err) {
        this.logger.warn(`[MQTT Presence] Lỗi Redis online: ${err instanceof Error ? err.message : String(err)}`);
      }

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
            try {
              if (this.redisService.isAvailable()) {
                await this.redisService.getClient().srem('chat:online_users', userId);
              }
            } catch (err) {
              this.logger.warn(`[MQTT Presence] Lỗi Redis offline: ${err instanceof Error ? err.message : String(err)}`);
            }

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

    // 6. Khởi chạy HTTP & HTTPS Server cho WebSocket Stream MQTT (ws:// và wss://)
    const mqttPort = Number(process.env.MQTT_PORT) || 1884;
    const mqttWssPort = Number(process.env.MQTT_WSS_PORT) || 8884;
    const mqttTlsPort = Number(process.env.MQTT_TLS_PORT) || 8883;

    // A. Khởi chạy Plain WebSocket Server (ws:// - Tương thích môi trường Dev/Test)
    this.httpServer = createHttpServer();
    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (wsSocket: WebSocket, req: IncomingMessage) => {
      const stream = createWebSocketStream(wsSocket);
      Object.assign(stream, { conn: req });
      if (this.aedes) {
        this.aedes.handle(stream as unknown as Parameters<typeof this.aedes.handle>[0], req);
      }
    });

    this.httpServer.listen(mqttPort, () => {
      this.logger.log(
        `🚀 [MQTT + Protobuf Broker] Plain WebSocket đang lắng nghe tại ws://localhost:${mqttPort}`,
      );
    });

    // B. Kiểm tra và kích hoạt mã hóa TLS / SSL (WSS & MQTTS) chống bắt gói tin (Packet Sniffing)
    const tlsCredentials = this.resolveTlsCredentials();
    if (tlsCredentials) {
      try {
        // Khởi chạy WSS (WebSocket Secure qua HTTPS Server - Cổng 8884)
        this.httpsServer = createHttpsServer({
          key: tlsCredentials.key,
          cert: tlsCredentials.cert,
        });
        this.wssSecure = new WebSocketServer({ server: this.httpsServer });

        this.wssSecure.on('connection', (wsSocket: WebSocket, req: IncomingMessage) => {
          const stream = createWebSocketStream(wsSocket);
          Object.assign(stream, { conn: req });
          if (this.aedes) {
            this.aedes.handle(stream as unknown as Parameters<typeof this.aedes.handle>[0], req);
          }
        });

        this.httpsServer.listen(mqttWssPort, () => {
          this.logger.log(
            `🔒 [MQTT TLS/WSS Broker] WebSocket Secure (WSS) đang lắng nghe tại wss://localhost:${mqttWssPort} (Mã hóa TLS 1.3 chống bắt gói tin Wireshark/MITM)`,
          );
        });

        // Khởi chạy Native MQTTS Server qua TLS Socket thuần (Cổng 8883)
        this.tlsServer = createTlsServer(
          {
            key: tlsCredentials.key,
            cert: tlsCredentials.cert,
          },
          (socket) => {
            if (this.aedes) {
              this.aedes.handle(socket as unknown as Parameters<typeof this.aedes.handle>[0]);
            }
          },
        );

        this.tlsServer.listen(mqttTlsPort, () => {
          this.logger.log(
            `🛡️ [MQTT Native TLS] MQTTS Server đang lắng nghe tại mqtts://localhost:${mqttTlsPort} (Port 8883 - Mã hóa bảo mật TLS)`,
          );
        });
      } catch (tlsInitErr) {
        this.logger.error(
          `[MQTT TLS] Lỗi khởi tạo máy chủ TLS/WSS: ${tlsInitErr instanceof Error ? tlsInitErr.message : String(tlsInitErr)}`,
        );
      }
    } else {
      this.logger.warn(
        '⚠️ [MQTT Security] Chưa kích hoạt chứng chỉ SSL/TLS. MQTT đang chạy chế độ Plaintext. Để bật mã hóa WSS/MQTTS tránh bị bắt gói tin, hãy tạo chứng chỉ tại backend/certs/ hoặc cấu hình MQTT_TLS_KEY / MQTT_TLS_CERT.',
      );
    }
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

  /**
   * Đóng gói tin nhắn dạng Binary Protobuf và phát tới Topic của cả người gửi và người nhận
   */
  public publishChatMessage(message: {
    _id?: { toString(): string } | string | null;
    id?: { toString(): string } | string | null;
    conversationId: { toString(): string } | string;
    senderId: { toString(): string } | string;
    receiverId: { toString(): string } | string;
    text: string;
    type?: string;
    callLog?: unknown;
    createdAt?: Date | string;
    readAt?: Date | string | null;
  }) {
    try {
      const msgId = (message._id || message.id || '').toString();
      const convId = message.conversationId ? message.conversationId.toString() : '';
      const senderId = message.senderId ? message.senderId.toString() : '';
      const receiverId = message.receiverId ? message.receiverId.toString() : '';

      const messageProtoPayload = {
        id: msgId,
        conversationId: convId,
        senderId,
        receiverId,
        text: message.text || '',
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
              : '',
        type: message.type || 'text',
        callLog: message.callLog ? JSON.stringify(message.callLog) : '',
      };

      const binaryEncoded = Buffer.from(
        ChatMessageProto.encode(messageProtoPayload).finish(),
      );

      this.publishBinary(`chat/user/${receiverId}`, binaryEncoded);
      this.publishBinary(`chat/user/${senderId}`, binaryEncoded);
    } catch (err) {
      this.logger.error(
        `[MQTT] Lỗi publishChatMessage: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async shutdown() {
    this.logger.log('[MQTT] Đang đóng MQTT Broker và các máy chủ TLS/WSS...');
    if (this.wssSecure) {
      this.wssSecure.close();
      this.wssSecure = null;
    }
    if (this.httpsServer) {
      this.httpsServer.close();
      this.httpsServer = null;
    }
    if (this.tlsServer) {
      this.tlsServer.close();
      this.tlsServer = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
    if (this.aedes) {
      await new Promise<void>((resolve) => {
        this.aedes?.close(() => resolve());
      });
      this.aedes = null;
    }
  }
}
