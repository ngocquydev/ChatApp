import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { WafSettings, type WafSettingsDocument } from './schemas/waf-settings.schema.js';
import { createWafEngine, type WafEngine } from './waf-rules.engine.js';
import { DEFAULT_WAF_CONFIG, type WafConfig } from './waf.types.js';

/** Cấu hình được làm mới từ DB tối đa mỗi 30 giây (đồng bộ giữa nhiều instance backend) */
const CACHE_TTL_MS = 30_000;
const SETTINGS_KEY = 'global';

interface CachedEngine {
  config: WafConfig;
  engine: WafEngine;
  loadedAt: number;
}

function toConfig(doc: Partial<WafConfig> | null): WafConfig {
  return {
    enabled: doc?.enabled ?? DEFAULT_WAF_CONFIG.enabled,
    blockScanners: doc?.blockScanners ?? DEFAULT_WAF_CONFIG.blockScanners,
    blockBadUserAgents: doc?.blockBadUserAgents ?? DEFAULT_WAF_CONFIG.blockBadUserAgents,
    underAttack: doc?.underAttack ?? DEFAULT_WAF_CONFIG.underAttack,
    challengeForeignAuth: doc?.challengeForeignAuth ?? DEFAULT_WAF_CONFIG.challengeForeignAuth,
    allowedCountries: doc?.allowedCountries ?? [...DEFAULT_WAF_CONFIG.allowedCountries],
    ipAllowlist: doc?.ipAllowlist ?? [],
    ipBlocklist: doc?.ipBlocklist ?? [],
  };
}

@Injectable()
export class WafConfigService {
  private readonly logger = new Logger(WafConfigService.name);
  private cache: CachedEngine | null = null;
  private loading: Promise<CachedEngine> | null = null;

  constructor(
    @InjectModel(WafSettings.name) private readonly model: Model<WafSettingsDocument>,
  ) {}

  /** Engine đã biên dịch cho request hiện tại. Lỗi DB → dùng cấu hình cũ hoặc mặc định (fail-safe). */
  async getEngine(): Promise<CachedEngine> {
    if (this.cache && Date.now() - this.cache.loadedAt < CACHE_TTL_MS) return this.cache;
    if (!this.loading) {
      this.loading = this.load().finally(() => {
        this.loading = null;
      });
    }
    return this.loading;
  }

  async getConfig(): Promise<WafConfig> {
    return (await this.getEngine()).config;
  }

  async updateConfig(patch: Partial<WafConfig>, updatedBy: string): Promise<WafConfig> {
    const doc = await this.model
      .findOneAndUpdate(
        { key: SETTINGS_KEY },
        { $set: { ...patch, updatedBy } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean<Partial<WafConfig>>()
      .exec();
    this.cache = this.compile(toConfig(doc));
    return this.cache.config;
  }

  private async load(): Promise<CachedEngine> {
    try {
      const doc = await this.model.findOne({ key: SETTINGS_KEY }).lean<Partial<WafConfig>>().exec();
      this.cache = this.compile(toConfig(doc));
    } catch (err) {
      this.logger.warn(
        `Không đọc được cấu hình WAF, dùng cấu hình ${this.cache ? 'cũ' : 'mặc định'}: ${err instanceof Error ? err.message : String(err)}`,
      );
      this.cache = this.compile(this.cache?.config ?? toConfig(null));
    }
    return this.cache;
  }

  private compile(config: WafConfig): CachedEngine {
    return { config, engine: createWafEngine(config), loadedAt: Date.now() };
  }
}
