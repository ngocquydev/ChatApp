// src/modules/redis/redis.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  public client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
    });
  }

  onModuleDestroy() {
    this.client.quit();
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`bl_${token}`, 'revoked', 'EX', ttlSeconds);
  }

  // Kiểm tra xem token có nằm trong blacklist không
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.client.get(`bl_${token}`);
    return result !== null;
  }
}
