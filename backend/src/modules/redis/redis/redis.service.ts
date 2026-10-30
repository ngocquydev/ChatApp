// src/modules/redis/redis.service.ts
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  onModuleInit() {
    const host =
      this.configService?.get<string>('REDIS_HOST') ||
      process.env.REDIS_HOST ||
      'localhost';
    const port = Number(
      this.configService?.get<number>('REDIS_PORT') ||
        process.env.REDIS_PORT ||
        6379,
    );
    const password =
      this.configService?.get<string>('REDIS_PASSWORD') ||
      process.env.REDIS_PASSWORD ||
      undefined;

    this.client = new Redis({
      host,
      port,
      password,
      lazyConnect: false,
      enableOfflineQueue: false, // Fail-fast: không xếp hàng lệnh vô hạn khi mất kết nối
      maxRetriesPerRequest: 1, // Giới hạn số lần thử lại tránh nghẽn luồng xử lý
      connectTimeout: 5000,
      retryStrategy: (times) => Math.min(times * 200, 3000),
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Lỗi kết nối Redis: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log(`Đã thiết lập kết nối tới Redis tại ${host}:${port}`);
    });

    this.client.on('ready', () => {
      this.logger.log(`Redis sẵn sàng phục vụ yêu cầu tại ${host}:${port}`);
    });

    this.client.on('close', () => {
      this.logger.warn(`Kết nối Redis đã bị đóng`);
    });
  }

  /**
   * Kiểm tra xem Redis client có đang sẵn sàng nhận lệnh hay không.
   * Hỗ trợ mock client trong unit tests (status undefined).
   */
  public isAvailable(): boolean {
    if (!this.client) return false;
    if (typeof this.client.status === 'undefined') return true;
    return this.client.status === 'ready' || this.client.status === 'connect';
  }

  async onModuleDestroy() {
    try {
      if (this.client) {
        await this.client.quit();
      }
    } catch (err) {
      this.logger.warn(
        `Lỗi khi ngắt kết nối Redis: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (!this.isAvailable()) return;
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch (err) {
      this.logger.warn(
        `Lỗi ghi cache Redis [${key}]: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isAvailable()) return null;
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(
        `Lỗi đọc cache Redis [${key}]: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isAvailable()) return;
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Lỗi xóa cache Redis [${key}]: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    try {
      if (!this.isAvailable()) return;
      await this.client.set(`bl_${token}`, 'revoked', 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Lỗi lưu blacklist Redis: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Kiểm tra xem token có nằm trong blacklist không (chế độ Fail-safe: lỗi -> trả về false)
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      const result = await this.client.get(`bl_${token}`);
      return result !== null;
    } catch (err) {
      this.logger.warn(
        `Lỗi kiểm tra Redis blacklist (Kích hoạt Fail-safe): ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  getClient(): Redis {
    return this.client;
  }
}
