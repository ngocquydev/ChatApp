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
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log(`Kết nối Redis thành công tại ${host}:${port}`);
    });
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
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return;
    await this.client.set(`bl_${token}`, 'revoked', 'EX', ttlSeconds);
  }

  // Kiểm tra xem token có nằm trong blacklist không
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`bl_${token}`);
    return result !== null;
  }
}

