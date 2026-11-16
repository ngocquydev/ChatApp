import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis/redis.service.js';

export interface AuraQuotaCheckResult {
  allowed: boolean;
  reason?: 'cooldown' | 'rpm_limit' | 'daily_quota' | 'busy' | 'prompt_too_long';
  message?: string;
  retryAfterSeconds?: number;
  remainingDailyQuota?: number;
}

@Injectable()
export class AuraRateLimiterService {
  private readonly logger = new Logger(AuraRateLimiterService.name);

  // Cấu hình ngưỡng mặc định (an toàn & tiết kiệm quota API Groq)
  readonly cooldownSeconds: number;
  readonly rpmLimit: number;
  readonly dailyQuota: number;
  readonly maxPromptChars: number;
  readonly summaryCacheTtlSeconds: number;

  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {
    this.cooldownSeconds = Number(
      this.configService?.get<number>('AURA_COOLDOWN_SECONDS') ||
        process.env.AURA_COOLDOWN_SECONDS ||
        3,
    );
    this.rpmLimit = Number(
      this.configService?.get<number>('AURA_RPM_LIMIT') ||
        process.env.AURA_RPM_LIMIT ||
        6,
    );
    this.dailyQuota = Number(
      this.configService?.get<number>('AURA_DAILY_QUOTA') ||
        process.env.AURA_DAILY_QUOTA ||
        50,
    );
    this.maxPromptChars = Number(
      this.configService?.get<number>('AURA_MAX_PROMPT_CHARS') ||
        process.env.AURA_MAX_PROMPT_CHARS ||
        1000,
    );
    this.summaryCacheTtlSeconds = Number(
      this.configService?.get<number>('AURA_SUMMARY_CACHE_TTL') ||
        process.env.AURA_SUMMARY_CACHE_TTL ||
        1800,
    );
  }

  /**
   * Kiểm tra và trừ hạn ngạch sử dụng AI của người dùng.
   * Ngăn chặn bot cào dữ liệu, spam dồn dập và tiêu tốn API Key Groq.
   */
  async checkAndConsumeQuota(
    userId: string,
    promptText?: string,
  ): Promise<AuraQuotaCheckResult> {
    // 1. Kiểm tra độ dài prompt (Token Flooding / DoS)
    if (promptText && promptText.length > this.maxPromptChars) {
      return {
        allowed: false,
        reason: 'prompt_too_long',
        message: `Nội dung câu hỏi quá dài (tối đa ${this.maxPromptChars} ký tự). Vui lòng rút ngắn lại nhé! ✂️`,
      };
    }

    // Nếu Redis không khả dụng -> Chế độ Fail-safe: Cho phép request để không làm gián đoạn người dùng
    if (!this.redisService || !this.redisService.isAvailable()) {
      return { allowed: true, remainingDailyQuota: this.dailyQuota };
    }

    const client = this.redisService.getClient();

    try {
      // 2. Kiểm tra Concurrency Lock (Mỗi user chỉ có 1 luồng sinh AI đồng thời)
      const busyKey = `aura:busy:${userId}`;
      const isBusy = await client.get(busyKey);
      if (isBusy) {
        return {
          allowed: false,
          reason: 'busy',
          message: 'Aura đang trả lời tin nhắn trước của bạn, vui lòng đợi trong giây lát nhé! ⏳',
        };
      }

      // 3. Kiểm tra Cooldown (Thời gian nghỉ giữa 2 câu hỏi liên tiếp)
      const cooldownKey = `aura:cooldown:${userId}`;
      const inCooldown = await client.get(cooldownKey);
      if (inCooldown) {
        const ttl = await client.ttl(cooldownKey);
        return {
          allowed: false,
          reason: 'cooldown',
          message: `Bạn đang nhắn quá nhanh! Vui lòng chờ ${ttl > 0 ? ttl : this.cooldownSeconds}s trước khi nhắn tiếp cho Aura nhé ⏳`,
          retryAfterSeconds: ttl > 0 ? ttl : this.cooldownSeconds,
        };
      }

      // 4. Kiểm tra Giới hạn theo Phút (Requests Per Minute - RPM)
      const currentMinute = Math.floor(Date.now() / 60000);
      const rpmKey = `aura:rpm:${userId}:${currentMinute}`;
      const currentRpm = await client.incr(rpmKey);
      if (currentRpm === 1) {
        await client.expire(rpmKey, 65);
      }
      if (currentRpm > this.rpmLimit) {
        return {
          allowed: false,
          reason: 'rpm_limit',
          message: `Bạn đã đạt giới hạn ${this.rpmLimit} tin nhắn/phút cho Aura AI. Vui lòng nghỉ tay ít giây nhé! ☕`,
          retryAfterSeconds: 30,
        };
      }

      // 5. Kiểm tra Hạn ngạch Ngày (Daily Quota)
      const todayStr = new Date().toISOString().slice(0, 10);
      const dailyKey = `aura:daily:${userId}:${todayStr}`;
      const currentDaily = await client.incr(dailyKey);
      if (currentDaily === 1) {
        await client.expire(dailyKey, 86400 + 3600); // 25h TTL
      }
      if (currentDaily > this.dailyQuota) {
        return {
          allowed: false,
          reason: 'daily_quota',
          message: `Bạn đã sử dụng hết hạn mức AI miễn phí trong ngày (${this.dailyQuota} lượt). Hạn mức sẽ được làm mới vào ngày mai nhé! 🌙`,
          remainingDailyQuota: 0,
        };
      }

      // 6. Tất cả kiểm tra hợp lệ -> Khóa Cooldown và Lock xử lý
      await client.set(cooldownKey, '1', 'EX', this.cooldownSeconds);
      await client.set(busyKey, '1', 'EX', 30); // Tự giải phóng sau tối đa 30s nếu crash

      return {
        allowed: true,
        remainingDailyQuota: Math.max(0, this.dailyQuota - currentDaily),
      };
    } catch (err: unknown) {
      this.logger.warn(`Lỗi khi kiểm tra quota Aura qua Redis: ${err instanceof Error ? err.message : String(err)}`);
      // Fail-safe: khi lỗi Redis, cho phép người dùng tiếp tục
      return { allowed: true, remainingDailyQuota: this.dailyQuota };
    }
  }

  /**
   * Giải phóng khóa đồng thời khi Aura đã hoàn tất stream câu trả lời
   */
  async releaseConcurrencyLock(userId: string): Promise<void> {
    if (!this.redisService || !this.redisService.isAvailable()) return;
    try {
      await this.redisService.del(`aura:busy:${userId}`);
    } catch (err: unknown) {
      this.logger.warn(`Lỗi khi giải phóng khóa Aura busy [${userId}]: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Lấy kết quả tóm tắt bình luận đã được lưu đệm trong Redis
   */
  async getCachedCommentSummary(postId: string, commentCount: number): Promise<string | null> {
    if (!this.redisService || !this.redisService.isAvailable()) return null;
    const cacheKey = `aura:cache:summary:post:${postId}:${commentCount}`;
    return await this.redisService.get(cacheKey);
  }

  /**
   * Lưu kết quả tóm tắt bình luận vào Redis (Tránh gọi Groq trùng lặp)
   */
  async setCachedCommentSummary(
    postId: string,
    commentCount: number,
    summary: string,
  ): Promise<void> {
    if (!this.redisService || !this.redisService.isAvailable()) return;
    const cacheKey = `aura:cache:summary:post:${postId}:${commentCount}`;
    await this.redisService.set(cacheKey, summary, this.summaryCacheTtlSeconds);
  }

  /**
   * Lấy thống kê sử dụng hạn ngạch trong ngày của người dùng
   */
  async getUserDailyUsage(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
    if (!this.redisService || !this.redisService.isAvailable()) {
      return { used: 0, limit: this.dailyQuota, remaining: this.dailyQuota };
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyKey = `aura:daily:${userId}:${todayStr}`;
    const usedStr = await this.redisService.get(dailyKey);
    const used = usedStr ? parseInt(usedStr, 10) : 0;
    return {
      used,
      limit: this.dailyQuota,
      remaining: Math.max(0, this.dailyQuota - used),
    };
  }
}

