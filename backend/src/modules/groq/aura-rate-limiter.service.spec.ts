import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { AuraRateLimiterService } from './aura-rate-limiter.service.js';
import { RedisService } from '../redis/redis/redis.service.js';

describe('AuraRateLimiterService', () => {
  let service: AuraRateLimiterService;
  let mockRedisClient: Record<string, ReturnType<typeof vi.fn>>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(() => {
    mockRedisClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(3),
    };

    mockRedisService = {
      isAvailable: vi.fn().mockReturnValue(true),
      getClient: vi.fn().mockReturnValue(mockRedisClient as unknown),
      get: vi.fn().mockImplementation((key: string) => mockRedisClient.get(key)),
      set: vi.fn().mockImplementation((key: string, val: string, ttl?: number) =>
        mockRedisClient.set(key, val, 'EX', ttl),
      ),
      del: vi.fn().mockImplementation((key: string) => mockRedisClient.del(key)),
    };

    const configService = new ConfigService({
      AURA_COOLDOWN_SECONDS: 3,
      AURA_RPM_LIMIT: 5,
      AURA_DAILY_QUOTA: 10,
      AURA_MAX_PROMPT_CHARS: 50,
      AURA_SUMMARY_CACHE_TTL: 600,
    });

    service = new AuraRateLimiterService(
      configService,
      mockRedisService as RedisService,
    );
  });

  it('khởi tạo thành công với cấu hình mong đợi', () => {
    expect(service).toBeDefined();
    expect(service.cooldownSeconds).toBe(3);
    expect(service.rpmLimit).toBe(5);
    expect(service.dailyQuota).toBe(10);
    expect(service.maxPromptChars).toBe(50);
  });

  describe('checkAndConsumeQuota', () => {
    it('chặn ngay lập tức nếu prompt vượt quá độ dài tối đa', async () => {
      const longPrompt = 'a'.repeat(60);
      const res = await service.checkAndConsumeQuota('user1', longPrompt);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('prompt_too_long');
      expect(res.message).toContain('quá dài');
    });

    it('cho phép request hợp lệ đầu tiên và thiết lập cooldown & lock', async () => {
      const res = await service.checkAndConsumeQuota('user1', 'Chào bạn');
      expect(res.allowed).toBe(true);
      expect(res.remainingDailyQuota).toBe(9);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'aura:cooldown:user1',
        '1',
        'EX',
        3,
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'aura:busy:user1',
        '1',
        'EX',
        30,
      );
    });

    it('chặn nếu Aura đang bận trả lời tin nhắn trước (Concurrency Lock)', async () => {
      mockRedisClient.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'aura:busy:user1') return Promise.resolve('1');
        return Promise.resolve(null);
      });

      const res = await service.checkAndConsumeQuota('user1', 'Câu hỏi 2');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('busy');
      expect(res.message).toContain('Aura đang trả lời');
    });

    it('chặn nếu người dùng nhắn quá nhanh trong thời gian cooldown', async () => {
      mockRedisClient.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'aura:cooldown:user1') return Promise.resolve('1');
        return Promise.resolve(null);
      });
      mockRedisClient.ttl = vi.fn().mockResolvedValue(2);

      const res = await service.checkAndConsumeQuota('user1', 'Câu hỏi nhanh');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('cooldown');
      expect(res.message).toContain('nhắn quá nhanh');
      expect(res.retryAfterSeconds).toBe(2);
    });

    it('chặn khi vượt quá giới hạn RPM (Requests Per Minute)', async () => {
      mockRedisClient.incr = vi.fn().mockResolvedValue(6); // Vượt quá 5

      const res = await service.checkAndConsumeQuota('user1', 'Câu hỏi spam');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('rpm_limit');
      expect(res.message).toContain('giới hạn 5 tin nhắn/phút');
    });

    it('chặn khi vượt quá hạn ngạch ngày (Daily Quota)', async () => {
      mockRedisClient.incr = vi.fn().mockImplementation((key: string) => {
        if (key.startsWith('aura:rpm:')) return Promise.resolve(1);
        if (key.startsWith('aura:daily:')) return Promise.resolve(11); // Vượt quá 10
        return Promise.resolve(1);
      });

      const res = await service.checkAndConsumeQuota('user1', 'Hết hạn ngạch');
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('daily_quota');
      expect(res.message).toContain('hết hạn mức AI miễn phí trong ngày');
    });

    it('chế độ Fail-safe: khi Redis không khả dụng, vẫn cho phép người dùng tiếp tục', async () => {
      mockRedisService.isAvailable = vi.fn().mockReturnValue(false);
      const res = await service.checkAndConsumeQuota('user1', 'Chào bạn');
      expect(res.allowed).toBe(true);
    });
  });

  describe('releaseConcurrencyLock', () => {
    it('xóa khóa bận của người dùng', async () => {
      await service.releaseConcurrencyLock('user1');
      expect(mockRedisService.del).toHaveBeenCalledWith('aura:busy:user1');
    });
  });

  describe('Caching tóm tắt bình luận', () => {
    it('lấy cache và ghi cache tóm tắt bình luận', async () => {
      mockRedisClient.get = vi.fn().mockResolvedValue('Bản tóm tắt đã lưu');
      const cached = await service.getCachedCommentSummary('post123', 5);
      expect(cached).toBe('Bản tóm tắt đã lưu');

      await service.setCachedCommentSummary('post123', 5, 'Tóm tắt mới');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'aura:cache:summary:post:post123:5',
        'Tóm tắt mới',
        600,
      );
    });
  });

  describe('getUserDailyUsage', () => {
    it('trả về số lượt đã dùng và số lượt còn lại chính xác', async () => {
      mockRedisClient.get = vi.fn().mockResolvedValue('4');
      const usage = await service.getUserDailyUsage('user1');
      expect(usage.used).toBe(4);
      expect(usage.limit).toBe(10);
      expect(usage.remaining).toBe(6);
    });
  });
});

