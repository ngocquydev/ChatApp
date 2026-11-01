import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EdgeBanService } from './edge-ban.service.js';
import type { RedisService } from '../redis/redis/redis.service.js';
import type { CloudflareWafService } from './cloudflare/cloudflare-waf.service.js';
import type { WafEventsService } from './waf-events.service.js';

/** Redis giả trong bộ nhớ, chỉ hỗ trợ các lệnh EdgeBanService dùng */
function fakeRedis(now: () => number) {
  const kv = new Map<string, { value: string; expiresAt: number | null }>();
  const zsets = new Map<string, Map<string, number>>();
  const hashes = new Map<string, Map<string, string>>();
  const alive = (key: string) => {
    const e = kv.get(key);
    if (e && e.expiresAt !== null && e.expiresAt <= now()) kv.delete(key);
    return kv.get(key);
  };
  const client = {
    get: async (k: string) => alive(k)?.value ?? null,
    set: async (k: string, v: string, _ex?: string, sec?: number) => {
      kv.set(k, { value: v, expiresAt: sec ? now() + sec * 1000 : null });
      return 'OK';
    },
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    incr: async (k: string) => {
      const e = alive(k);
      const next = Number(e?.value ?? 0) + 1;
      kv.set(k, { value: String(next), expiresAt: e?.expiresAt ?? null });
      return next;
    },
    expire: async (k: string, sec: number) => {
      const e = kv.get(k);
      if (e) e.expiresAt = now() + sec * 1000;
      return 1;
    },
    zadd: async (k: string, score: number, m: string) => {
      if (!zsets.has(k)) zsets.set(k, new Map());
      zsets.get(k)!.set(m, score);
      return 1;
    },
    zrem: async (k: string, m: string) => (zsets.get(k)?.delete(m) ? 1 : 0),
    zrangebyscore: async (k: string, min: number | string, max: number | string) => {
      const lo = min === '-inf' ? -Infinity : Number(min);
      const hi = max === '+inf' ? Infinity : Number(max);
      return [...(zsets.get(k) ?? new Map<string, number>()).entries()]
        .filter(([, s]) => s >= lo && s <= hi)
        .map(([m]) => m);
    },
    hset: async (k: string, f: string, v: string) => {
      if (!hashes.has(k)) hashes.set(k, new Map());
      hashes.get(k)!.set(f, v);
      return 1;
    },
    hget: async (k: string, f: string) => hashes.get(k)?.get(f) ?? null,
    hdel: async (k: string, f: string) => (hashes.get(k)?.delete(f) ? 1 : 0),
  };
  return { isAvailable: () => true, client } as unknown as RedisService;
}

describe('EdgeBanService', () => {
  let now: number;
  let cloudflare: { createIpBan: ReturnType<typeof vi.fn>; deleteIpBan: ReturnType<typeof vi.fn> };
  let events: { record: ReturnType<typeof vi.fn> };
  let service: EdgeBanService;
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv, WAF_BAN_THRESHOLD: '3', WAF_BAN_WINDOW_SECONDS: '600', WAF_BAN_DURATION_SECONDS: '3600' };
    now = 1_800_000_000_000;
    cloudflare = { createIpBan: vi.fn().mockResolvedValue('cf-rule-1'), deleteIpBan: vi.fn().mockResolvedValue(undefined) };
    events = { record: vi.fn() };
    service = new EdgeBanService(
      fakeRedis(() => now),
      cloudflare as unknown as CloudflareWafService,
      events as unknown as WafEventsService,
      () => now,
    );
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('chặn IP sau khi đủ số lần vi phạm trong cửa sổ thời gian, đồng thời chặn ở Cloudflare', async () => {
    await service.reportOffense('203.0.113.9', 'rate_limit');
    await service.reportOffense('203.0.113.9', 'rate_limit');
    expect(await service.isBanned('203.0.113.9')).toBe(false);

    await service.reportOffense('203.0.113.9', 'scanner_path');
    expect(await service.isBanned('203.0.113.9')).toBe(true);
    expect(cloudflare.createIpBan).toHaveBeenCalledWith('203.0.113.9', expect.stringContaining('chatapp-auto-ban'));
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ ip: '203.0.113.9', action: 'ban' }));

    const [ban] = await service.listBans();
    expect(ban).toMatchObject({ ip: '203.0.113.9', reason: 'scanner_path', cloudflareRuleId: 'cf-rule-1' });
  });

  it.each(['127.0.0.1', '::1', '10.1.2.3', '192.168.1.10', '172.20.0.5', '172.64.10.20', '2606:4700::1', 'unknown'])(
    '[abuse] không bao giờ chặn IP được bảo vệ %s (loopback / nội bộ / Cloudflare)',
    async (ip) => {
      for (let i = 0; i < 10; i++) await service.reportOffense(ip, 'rate_limit');
      expect(await service.isBanned(ip)).toBe(false);
      expect(cloudflare.createIpBan).not.toHaveBeenCalled();
    },
  );

  it('vẫn chặn trong app khi gọi Cloudflare lỗi', async () => {
    cloudflare.createIpBan.mockRejectedValue(new Error('Cloudflare API lỗi'));
    await service.ban('203.0.113.20', 'manual');
    expect(await service.isBanned('203.0.113.20')).toBe(true);
    expect((await service.listBans())[0].cloudflareRuleId).toBeNull();
  });

  it('gỡ chặn thủ công xóa luôn IP Access Rule trên Cloudflare', async () => {
    await service.ban('203.0.113.30', 'manual');
    expect(await service.unban('203.0.113.30')).toBe(true);
    expect(await service.isBanned('203.0.113.30')).toBe(false);
    expect(cloudflare.deleteIpBan).toHaveBeenCalledWith('cf-rule-1');
    expect(await service.listBans()).toEqual([]);
  });

  it('dọn lệnh chặn hết hạn: xóa rule Cloudflare và bản ghi', async () => {
    await service.ban('203.0.113.40', 'manual');
    now += 3601_000;
    expect(await service.sweepExpired()).toBe(1);
    expect(cloudflare.deleteIpBan).toHaveBeenCalledWith('cf-rule-1');
    expect(await service.listBans()).toEqual([]);
    expect(events.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'unban', reason: 'expired' }));
  });

  it('[abuse] từ chối chặn thủ công IP được bảo vệ hoặc chuỗi không phải IP', async () => {
    await expect(service.ban('127.0.0.1', 'manual')).rejects.toThrow();
    await expect(service.ban('not-an-ip', 'manual')).rejects.toThrow();
  });
});

