import type { CloudflareApiClient, SecurityLevel } from './cloudflare-api.client.js';
import {
  buildCustomRules,
  buildRateLimitRule,
  mergeManagedRules,
  MANAGED_REF_PREFIX,
  type CloudflareRule,
} from './cloudflare-waf.rules.js';

/** Nơi lưu mức Security Level trước khi bật Under Attack (Redis trong app, bộ nhớ trong CLI) */
export interface SecurityLevelStore {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
}

export interface CloudflareWafManagerOptions {
  frontendHost?: string;
  apiHost?: string;
  allowedCountries: string[];
  rateLimitRequests: number;
  store: SecurityLevelStore;
}

export interface ManagedRuleStatus {
  ref: string;
  description: string;
  action: string;
  phase: 'custom' | 'ratelimit';
  deployed: boolean;
}

export interface CloudflareWafStatus {
  zone: { name: string; status: string; plan: string | null } | null;
  securityLevel: SecurityLevel | null;
  underAttack: boolean | null;
  botFightMode: boolean | null;
  rules: ManagedRuleStatus[];
  warnings: string[];
}

const VALID_LEVELS: readonly SecurityLevel[] = ['essentially_off', 'low', 'medium', 'high', 'under_attack'];
const FALLBACK_LEVEL: SecurityLevel = 'medium';

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Điều phối các thao tác WAF trên Cloudflare; dùng chung cho CLI và trang quản trị */
export class CloudflareWafManager {
  constructor(
    private readonly client: CloudflareApiClient,
    private readonly options: CloudflareWafManagerOptions,
  ) {}

  private desiredCustomRules(): CloudflareRule[] {
    return buildCustomRules({
      frontendHost: this.options.frontendHost,
      apiHost: this.options.apiHost,
      allowedCountries: this.options.allowedCountries,
    });
  }

  private desiredRateLimitRule(): CloudflareRule {
    return buildRateLimitRule({ apiHost: this.options.apiHost, requestsPerPeriod: this.options.rateLimitRequests });
  }

  /** Đồng bộ luật lên Cloudflare; chạy lại nhiều lần không tạo trùng, không đụng rule người dùng */
  async syncRules(): Promise<{ customRules: number; rateLimitRules: number; preservedUserRules: number }> {
    const customDesired = this.desiredCustomRules();
    const existingCustom = (await this.client.getPhaseEntrypoint('http_request_firewall_custom'))?.rules ?? [];
    const mergedCustom = mergeManagedRules(existingCustom, customDesired);
    await this.client.putPhaseEntrypoint('http_request_firewall_custom', mergedCustom);

    const existingRateLimit = (await this.client.getPhaseEntrypoint('http_ratelimit'))?.rules ?? [];
    const mergedRateLimit = mergeManagedRules(existingRateLimit, [this.desiredRateLimitRule()]);
    await this.client.putPhaseEntrypoint('http_ratelimit', mergedRateLimit);

    return {
      customRules: customDesired.length,
      rateLimitRules: 1,
      preservedUserRules: mergedCustom.length - customDesired.length + (mergedRateLimit.length - 1),
    };
  }

  async setUnderAttack(enabled: boolean): Promise<SecurityLevel> {
    const current = await this.client.getSecurityLevel();
    if (enabled) {
      if (current !== 'under_attack') await this.options.store.set(current);
      return this.client.setSecurityLevel('under_attack');
    }
    const saved = await this.options.store.get();
    const restore = VALID_LEVELS.includes(saved as SecurityLevel) && saved !== 'under_attack' ? (saved as SecurityLevel) : FALLBACK_LEVEL;
    return this.client.setSecurityLevel(restore);
  }

  async setBotFightMode(enabled: boolean): Promise<boolean> {
    return this.client.setBotFightMode(enabled);
  }

  async getStatus(): Promise<CloudflareWafStatus> {
    const warnings: string[] = [];
    const attempt = async <T>(label: string, fn: () => Promise<T>): Promise<T | null> => {
      try {
        return await fn();
      } catch (err) {
        warnings.push(`${label}: ${message(err)}`);
        return null;
      }
    };

    const [zone, securityLevel, botFightMode, custom, rateLimit] = await Promise.all([
      attempt('Zone', () => this.client.getZone()),
      attempt('Security Level', () => this.client.getSecurityLevel()),
      attempt('Bot Fight Mode', () => this.client.getBotFightMode()),
      attempt('Custom rules', () => this.client.getPhaseEntrypoint('http_request_firewall_custom')),
      attempt('Rate limiting rules', () => this.client.getPhaseEntrypoint('http_ratelimit')),
    ]);

    const deployedRefs = new Set(
      [...(custom?.rules ?? []), ...(rateLimit?.rules ?? [])]
        .map((r) => r.ref)
        .filter((ref): ref is string => Boolean(ref?.startsWith(MANAGED_REF_PREFIX))),
    );
    const describe = (rule: CloudflareRule, phase: ManagedRuleStatus['phase']): ManagedRuleStatus => ({
      ref: rule.ref ?? '',
      description: rule.description ?? '',
      action: rule.action,
      phase,
      deployed: deployedRefs.has(rule.ref ?? ''),
    });

    return {
      zone: zone ? { name: zone.name, status: zone.status, plan: zone.plan?.name ?? null } : null,
      securityLevel,
      underAttack: securityLevel === null ? null : securityLevel === 'under_attack',
      botFightMode,
      rules: [
        ...this.desiredCustomRules().map((r) => describe(r, 'custom')),
        describe(this.desiredRateLimitRule(), 'ratelimit'),
      ],
      warnings,
    };
  }
}

