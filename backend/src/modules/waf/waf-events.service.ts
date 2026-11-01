import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis/redis.service.js';
import type { WafAction, WafReason } from './waf.types.js';

export interface WafEvent {
  at: string;
  ip: string;
  action: Exclude<WafAction, 'allow'> | 'ban' | 'unban';
  reason: WafReason | 'rate_limit' | 'repeat_offender' | 'manual' | 'expired';
  method?: string;
  path?: string;
  country?: string | null;
}

const EVENTS_KEY = 'waf:events';
export const MAX_WAF_EVENTS = 100;

/**
 * Nhật ký 100 sự kiện WAF gần nhất (Redis list, dự phòng bộ nhớ khi Redis không sẵn sàng).
 * Chỉ admin xem được; không ghi header, cookie hay nội dung request.
 */
@Injectable()
export class WafEventsService {
  private readonly logger = new Logger(WafEventsService.name);
  private readonly memory: WafEvent[] = [];

  constructor(private readonly redisService: RedisService) {}

  record(event: Omit<WafEvent, 'at'>): void {
    const full: WafEvent = { at: new Date().toISOString(), ...event, path: event.path?.slice(0, 200) };
    this.memory.unshift(full);
    this.memory.length = Math.min(this.memory.length, MAX_WAF_EVENTS);

    if (!this.redisService.isAvailable()) return;
    this.redisService.client
      .multi()
      .lpush(EVENTS_KEY, JSON.stringify(full))
      .ltrim(EVENTS_KEY, 0, MAX_WAF_EVENTS - 1)
      .exec()
      .catch((err: unknown) => {
        this.logger.warn(`Không ghi được sự kiện WAF: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  async list(): Promise<WafEvent[]> {
    if (!this.redisService.isAvailable()) return [...this.memory];
    try {
      const raw = await this.redisService.client.lrange(EVENTS_KEY, 0, MAX_WAF_EVENTS - 1);
      return raw.flatMap((item) => {
        try {
          return [JSON.parse(item) as WafEvent];
        } catch {
          return [];
        }
      });
    } catch {
      return [...this.memory];
    }
  }
}
