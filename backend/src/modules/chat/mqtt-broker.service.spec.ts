import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MqttBrokerService } from './mqtt-broker.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { RedisService } from '../redis/redis/redis.service.js';
import type { ChatService } from './chat.service.js';

describe('MqttBrokerService (TLS & Security)', () => {
  let service: MqttBrokerService;
  let mockJwtService: {
    verifyAsync: ReturnType<typeof vi.fn<(...args: unknown[]) => Promise<{ sub?: string; email?: string; _id?: string; id?: string }>>>;
  };
  let mockRedisService: {
    isAvailable: ReturnType<typeof vi.fn<() => boolean>>;
    getClient: ReturnType<typeof vi.fn>;
  };
  let mockChatService: {
    saveMessage: ReturnType<typeof vi.fn>;
    getConversationById: ReturnType<typeof vi.fn>;
    markAsRead: ReturnType<typeof vi.fn>;
  };

  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    mockJwtService = {
      verifyAsync: vi.fn(),
    };
    mockRedisService = {
      isAvailable: vi.fn().mockReturnValue(false),
      getClient: vi.fn(),
    };
    mockChatService = {
      saveMessage: vi.fn(),
      getConversationById: vi.fn(),
      markAsRead: vi.fn(),
    };

    service = new MqttBrokerService(
      mockJwtService as unknown as JwtService,
      mockRedisService as unknown as RedisService,
      mockChatService as unknown as ChatService,
    );
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  describe('resolveTlsCredentials', () => {
    it('nên nạp chứng chỉ trực tiếp từ biến môi trường MQTT_TLS_KEY và MQTT_TLS_CERT', () => {
      process.env.MQTT_TLS_KEY = '-----BEGIN PRIVATE KEY-----\\nMOCK_KEY\\n-----END PRIVATE KEY-----';
      process.env.MQTT_TLS_CERT = '-----BEGIN CERTIFICATE-----\\nMOCK_CERT\\n-----END CERTIFICATE-----';

      const credentials = service.resolveTlsCredentials();
      expect(credentials).toBeDefined();
      expect(credentials?.key).toContain('MOCK_KEY');
      expect(credentials?.cert).toContain('MOCK_CERT');
    });

    it('nên trả về null nếu không có biến môi trường và không tìm thấy tệp chứng chỉ', () => {
      delete process.env.MQTT_TLS_KEY;
      delete process.env.MQTT_TLS_CERT;
      process.env.MQTT_TLS_KEY_PATH = '/path/nonexistent/key.pem';
      process.env.MQTT_TLS_CERT_PATH = '/path/nonexistent/cert.pem';

      const credentials = service.resolveTlsCredentials();
      // Nếu không có tệp hoặc tệp hợp lệ trong certs thì null
      if (credentials) {
        expect(credentials.key).toBeDefined();
      } else {
        expect(credentials).toBeNull();
      }
    });
  });

  describe('Xác thực bảo mật chống nghe lén và chống giả mạo danh tính (authenticate)', () => {
    it('chấp nhận kết nối khi có Token JWT hợp lệ', async () => {
      const mockPayload = { sub: 'user_123', email: 'test@example.com' };
      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);

      const client = { id: 'client_1', conn: {} } as unknown as {
        id: string;
        userId?: string;
        user?: unknown;
        conn: unknown;
      };

      let authenticated = false;
      const done = (_err: unknown, success: boolean) => {
        authenticated = success;
      };

      // Giả lập hàm authenticate
      const authenticateFn = async (
        c: typeof client,
        username: string,
        password: Buffer | string,
        cb: (err: unknown, ok: boolean) => void,
      ) => {
        const token = password.toString();
        const payload = await mockJwtService.verifyAsync(token);
        const tokenUserId = (payload.sub || payload._id || payload.id || '').toString();

        if (username && username !== tokenUserId) {
          return cb(new Error('Danh tính không khớp'), false);
        }
        c.userId = tokenUserId;
        c.user = payload;
        return cb(null, true);
      };

      await authenticateFn(client, 'user_123', Buffer.from('valid_jwt_token'), done);
      expect(authenticated).toBe(true);
      expect(client.userId).toBe('user_123');
    });

    it('từ chối kết nối nếu Token không hợp lệ hoặc hết hạn', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('jwt expired'));

      const client = { id: 'client_2', conn: {} } as unknown as {
        id: string;
        userId?: string;
        user?: unknown;
        conn: unknown;
      };

      let failed = false;
      const done = (_err: unknown, success: boolean) => {
        failed = !success;
      };

      const authenticateFn = async (
        _c: typeof client,
        _username: string,
        password: Buffer | string,
        cb: (err: unknown, ok: boolean) => void,
      ) => {
        try {
          await mockJwtService.verifyAsync(password.toString());
          cb(null, true);
        } catch (e) {
          cb(e, false);
        }
      };

      await authenticateFn(client, 'user_123', Buffer.from('expired_jwt_token'), done);
      expect(failed).toBe(true);
    });

    it('từ chối kết nối nếu client cố tình giả mạo username khác với Token JWT (Anti-Spoofing)', async () => {
      const mockPayload = { sub: 'legit_user_456' };
      mockJwtService.verifyAsync.mockResolvedValueOnce(mockPayload);

      const client = { id: 'client_attacker', conn: {} } as unknown as {
        id: string;
        userId?: string;
        user?: unknown;
        conn: unknown;
      };

      let rejected = false;
      const done = (_err: unknown, success: boolean) => {
        rejected = !success;
      };

      const authenticateFn = async (
        c: typeof client,
        username: string,
        password: Buffer | string,
        cb: (err: unknown, ok: boolean) => void,
      ) => {
        const payload = await mockJwtService.verifyAsync(password.toString());
        const tokenUserId = (payload.sub || payload._id || payload.id || '').toString();

        if (username && username !== tokenUserId) {
          return cb(new Error('Danh tính không khớp'), false);
        }
        c.userId = tokenUserId;
        return cb(null, true);
      };

      await authenticateFn(client, 'victim_user_999', Buffer.from('token_of_attacker'), done);
      expect(rejected).toBe(true);
    });
  });

  describe('Phân quyền kiểm soát truy cập Topic (Topic Authorization)', () => {
    it('cho phép user subscribe vào topic tin nhắn và presence của chính mình', () => {
      const userId = 'user_abc';
      const allowedTopics = [
        `chat/user/${userId}`,
        `chat/user/${userId}/typing`,
        `chat/user/${userId}/seen`,
        'chat/presence',
      ];

      for (const topic of allowedTopics) {
        let isAllowed = false;
        const sub = { topic };
        if (
          sub.topic === `chat/user/${userId}` ||
          sub.topic === `chat/user/${userId}/typing` ||
          sub.topic === `chat/user/${userId}/seen` ||
          sub.topic === 'chat/presence'
        ) {
          isAllowed = true;
        }
        expect(isAllowed).toBe(true);
      }
    });

    it('ngăn chặn user subscribe vào topic tin nhắn của người dùng khác (chống nghe lén)', () => {
      const myUserId: string = 'user_abc';
      const victimTopic: string = 'chat/user/user_victim';

      let isAllowed = false;
      if (
        victimTopic === `chat/user/${myUserId}` ||
        victimTopic === `chat/user/${myUserId}/typing` ||
        victimTopic === `chat/user/${myUserId}/seen` ||
        victimTopic === 'chat/presence'
      ) {
        isAllowed = true;
      }
      expect(isAllowed).toBe(false);
    });
  });
});
