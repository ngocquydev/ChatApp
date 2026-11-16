import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { RedisService } from '../redis/redis/redis.service.js';
import { createIpMatcher, isCloudflareIp, isValidIp, cleanIp } from '../../common/utils/client-ip.util.js';
import { CloudflareWafService } from './cloudflare/cloudflare-waf.service.js';
import { WafEventsService, type WafEvent } from './waf-events.service.js';

export type BanReason = WafEvent['reason'];

export interface BanRecord {
  ip: string;
  reason: BanReason;
  createdAt: string;
  expiresAt: string;
  cloudflareRuleId: string | null;
}

const BAN_KEY = (ip: string) => `waf:ban:${ip}`;
const OFFENSE_KEY = (ip: string) => `waf:offense:${ip}`;
const BANS_INDEX = 'waf:bans';
const BAN_RECORDS = 'waf:ban_records';
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** Token đồng hồ (chỉ thay trong test) */
export const WAF_CLOCK = 'WAF_CLOCK';

/** IP không bao giờ được chặn: chặn nhầm proxy/tunnel sẽ làm sập toàn bộ site */
const isInternalIp = createIpMatcher([
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
]);

export function isProtectedIp(ip: string): boolean {
  return !isValidIp(ip) || isInternalIp(ip) || isCloudflareIp(ip);
}

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/**
 * Đếm vi phạm theo IP và tự động chặn kẻ tái phạm: chặn trong app (Redis, có thời hạn) và —
 * nếu CLOUDFLARE_AUTO_BAN=true — tạo IP Access Rule trên Cloudflare, tự gỡ khi hết hạn.
 * Redis không sẵn sàng → bỏ qua (fail-open), không chặn nhầm.
 */
@Injectable()
export class EdgeBanService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EdgeBanService.name);
  private sweepTimer: NodeJS.Timeout | null = null;
  private readonly now: () => number;

  constructor(
    private readonly redisService: RedisService,
    private readonly cloudflare: CloudflareWafService,
    private readonly events: WafEventsService,
    @Optional() @Inject(WAF_CLOCK) clock?: () => number,
  ) {
    this.now = clock ?? Date.now;
  }

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      this.sweepExpired().catch((err: unknown) =>
        this.logger.warn(`Dọn lệnh chặn hết hạn thất bại: ${err instanceof Error ? err.message : String(err)}`),
      );
    }, SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  private get threshold() {
    return intEnv('WAF_BAN_THRESHOLD', 3);
  }
  private get windowSeconds() {
    return intEnv('WAF_BAN_WINDOW_SECONDS', 600);
  }
  private get durationSeconds() {
    return intEnv('WAF_BAN_DURATION_SECONDS', 3600);
  }

  private get redis() {
    return this.redisService.client;
  }

  async isBanned(ip: string): Promise<boolean> {
    if (!this.redisService.isAvailable() || isProtectedIp(ip)) return false;
    try {
      return (await this.redis.get(BAN_KEY(cleanIp(ip)))) !== null;
    } catch {
      return false;
    }
  }

  /** Ghi nhận một lần vi phạm; đủ ngưỡng trong cửa sổ thời gian thì tự động chặn */
  async reportOffense(ip: string, reason: BanReason): Promise<void> {
    if (!this.redisService.isAvailable() || isProtectedIp(ip)) return;
    const key = OFFENSE_KEY(cleanIp(ip));
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, this.windowSeconds);
      if (count >= this.threshold && !(await this.isBanned(ip))) {
        await this.ban(ip, reason);
        await this.redis.del(key);
      }
    } catch (err) {
      this.logger.warn(`Không ghi nhận được vi phạm WAF: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async ban(rawIp: string, reason: BanReason, durationSeconds = this.durationSeconds): Promise<BanRecord> {
    const ip = cleanIp(rawIp.trim());
    if (isProtectedIp(ip)) {
      throw new BadRequestException('Không thể chặn IP nội bộ, loopback, Cloudflare hoặc giá trị không phải IP.');
    }
    const expiresAtMs = this.now() + durationSeconds * 1000;
    const record: BanRecord = {
      ip,
      reason,
      createdAt: new Date(this.now()).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      cloudflareRuleId: null,
    };

    try {
      record.cloudflareRuleId = await this.cloudflare.createIpBan(ip, `chatapp-auto-ban ${reason} until ${record.expiresAt}`);
    } catch (err) {
      this.logger.warn(`Không tạo được IP Access Rule trên Cloudflare: ${err instanceof Error ? err.message : String(err)}`);
    }

    await this.redis.set(BAN_KEY(ip), reason, 'EX', durationSeconds);
    await this.redis.zadd(BANS_INDEX, expiresAtMs, ip);
    await this.redis.hset(BAN_RECORDS, ip, JSON.stringify(record));
    this.events.record({ ip, action: 'ban', reason: reason === 'manual' ? 'manual' : 'repeat_offender' });
    this.logger.warn(`[WAF] Đã chặn IP tái phạm (${reason}) tới ${record.expiresAt}`);
    return record;
  }

  async unban(rawIp: string, reason: 'manual' | 'expired' = 'manual'): Promise<boolean> {
    const ip = cleanIp(rawIp.trim());
    const raw = await this.redis.hget(BAN_RECORDS, ip);
    const record = raw ? (JSON.parse(raw) as BanRecord) : null;

    if (record?.cloudflareRuleId) {
      try {
        await this.cloudflare.deleteIpBan(record.cloudflareRuleId);
      } catch (err) {
        this.logger.warn(`Không xóa được IP Access Rule ${record.cloudflareRuleId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const removed = (await this.redis.del(BAN_KEY(ip))) > 0 || record !== null;
    await this.redis.zrem(BANS_INDEX, ip);
    await this.redis.hdel(BAN_RECORDS, ip);
    if (removed) this.events.record({ ip, action: 'unban', reason });
    return removed;
  }

  async listBans(): Promise<BanRecord[]> {
    if (!this.redisService.isAvailable()) return [];
    const ips = await this.redis.zrangebyscore(BANS_INDEX, this.now(), '+inf');
    const records = await Promise.all(ips.map((ip) => this.redis.hget(BAN_RECORDS, ip)));
    return records.flatMap((raw) => (raw ? [JSON.parse(raw) as BanRecord] : []));
  }

  /** Gỡ các lệnh chặn đã hết hạn (cả rule trên Cloudflare). Trả về số lệnh đã gỡ. */
  async sweepExpired(): Promise<number> {
    if (!this.redisService.isAvailable()) return 0;
    const expired = await this.redis.zrangebyscore(BANS_INDEX, '-inf', this.now());
    for (const ip of expired) await this.unban(ip, 'expired');
    return expired.length;
  }
}
