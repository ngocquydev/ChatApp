import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service.js';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return false for isAvailable when client is not ready', () => {
    service.client = { status: 'close' } as any;
    expect(service.isAvailable()).toBe(false);
  });

  it('should return true for isAvailable when client status is ready or undefined (test mock)', () => {
    service.client = { status: 'ready' } as any;
    expect(service.isAvailable()).toBe(true);

    service.client = {} as any;
    expect(service.isAvailable()).toBe(true);
  });

  describe('Fail-safe behavior', () => {
    it('isTokenBlacklisted should return false when Redis is offline', async () => {
      service.client = { status: 'close', get: vi.fn() } as any;
      const result = await service.isTokenBlacklisted('some_jwt_token');
      expect(result).toBe(false);
    });

    it('isTokenBlacklisted should return false when Redis throws an error', async () => {
      service.client = {
        status: 'ready',
        get: vi.fn().mockRejectedValue(new Error('Connection lost')),
      } as any;
      const result = await service.isTokenBlacklisted('some_jwt_token');
      expect(result).toBe(false);
    });

    it('get should return null safely when Redis throws', async () => {
      service.client = {
        status: 'ready',
        get: vi.fn().mockRejectedValue(new Error('MaxRetriesPerRequestError')),
      } as any;
      const val = await service.get('test_key');
      expect(val).toBeNull();
    });

    it('set and del should not throw when Redis throws', async () => {
      service.client = {
        status: 'ready',
        set: vi.fn().mockRejectedValue(new Error('Redis disconnected')),
        del: vi.fn().mockRejectedValue(new Error('Redis disconnected')),
      } as any;

      await expect(service.set('key', 'val')).resolves.toBeUndefined();
      await expect(service.del('key')).resolves.toBeUndefined();
    });

    it('blacklistToken should not throw when Redis throws', async () => {
      service.client = {
        status: 'ready',
        set: vi.fn().mockRejectedValue(new Error('Redis disconnected')),
      } as any;

      await expect(service.blacklistToken('token', 3600)).resolves.toBeUndefined();
    });
  });
});
