import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../../redis/redis/redis.service.js';
import type { AccessRuleMode, CloudflareApiClient } from './cloudflare-api.client.js';
import type { CloudflareWafManager, CloudflareWafStatus, SecurityLevelStore } from './cloudflare-waf.manager.js';
import { createCloudflareManager, readCloudflareEnv, type CloudflareEnvConfig } from './cloudflare-waf.config.js';

const PREVIOUS_LEVEL_KEY = 'waf:cf:previous_security_level';

export interface CloudflareStatusResponse extends Partial<CloudflareWafStatus> {
  configured: boolean;
  autoBan: boolean;
  error?: string;
}

/** Cầu nối giữa app và Cloudflare API; mọi chức năng trả "chưa cấu hình" nếu thiếu token/zone */
@Injectable()
export class CloudflareWafService {
  private readonly logger = new Logger(CloudflareWafService.name);
  private readonly config: CloudflareEnvConfig | null;
  private readonly client: CloudflareApiClient | null = null;
  private readonly manager: CloudflareWafManager | null = null;
  private memoryLevel: string | null = null;

  constructor(private readonly redisService: RedisService) {
    this.config = readCloudflareEnv();
    if (!this.config) return;
    try {
      const created = createCloudflareManager(this.config, this.levelStore());
      this.client = created.client;
      this.manager = created.manager;
    } catch (err) {
      this.logger.warn(`Cấu hình Cloudflare không hợp lệ: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private levelStore(): SecurityLevelStore {
    return {
      get: async () => {
        if (!this.redisService.isAvailable()) return this.memoryLevel;
        return (await this.redisService.get(PREVIOUS_LEVEL_KEY)) ?? this.memoryLevel;
      },
      set: async (value: string) => {
        this.memoryLevel = value;
        if (this.redisService.isAvailable()) await this.redisService.set(PREVIOUS_LEVEL_KEY, value);
      },
    };
  }

  isConfigured(): boolean {
    return this.manager !== null;
  }

  isAutoBanEnabled(): boolean {
    return this.isConfigured() && Boolean(this.config?.autoBan);
  }

  autoBanMode(): AccessRuleMode {
    return this.config?.autoBanMode ?? 'managed_challenge';
  }

  private requireManager(): CloudflareWafManager {
    if (!this.manager) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình Cloudflare (thiếu CLOUDFLARE_API_TOKEN hoặc CLOUDFLARE_ZONE_ID).',
      );
    }
    return this.manager;
  }

  async getStatus(): Promise<CloudflareStatusResponse> {
    if (!this.manager) return { configured: false, autoBan: false };
    return { configured: true, autoBan: this.isAutoBanEnabled(), ...(await this.manager.getStatus()) };
  }

  syncRules() {
    return this.requireManager().syncRules();
  }

  setUnderAttack(enabled: boolean) {
    return this.requireManager().setUnderAttack(enabled);
  }

  setBotFightMode(enabled: boolean) {
    return this.requireManager().setBotFightMode(enabled);
  }

  async createIpBan(ip: string, notes: string): Promise<string | null> {
    if (!this.client || !this.isAutoBanEnabled()) return null;
    return this.client.createAccessRule(ip, this.autoBanMode(), notes);
  }

  async deleteIpBan(ruleId: string): Promise<void> {
    if (!this.client) return;
    await this.client.deleteAccessRule(ruleId);
  }
}

