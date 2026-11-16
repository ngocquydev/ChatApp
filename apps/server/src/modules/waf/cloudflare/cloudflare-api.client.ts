import { isIP } from 'node:net';
import type { CloudflareRule } from './cloudflare-waf.rules.js';

const DEFAULT_BASE_URL = 'https://api.cloudflare.com/client/v4';
const REQUEST_TIMEOUT_MS = 15_000;

export type SecurityLevel = 'essentially_off' | 'low' | 'medium' | 'high' | 'under_attack';
export type AccessRuleMode = 'block' | 'challenge' | 'js_challenge' | 'managed_challenge';
export type RulesetPhase = 'http_request_firewall_custom' | 'http_ratelimit';

export interface CloudflareRuleset {
  id: string;
  rules?: CloudflareRule[];
}

interface Envelope<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  result: T;
}

/** Lỗi từ Cloudflare API — thông báo chỉ gồm mã/nội dung lỗi, không bao giờ chứa token */
export class CloudflareApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codes: number[],
  ) {
    super(message);
    this.name = 'CloudflareApiError';
  }
}

export interface CloudflareApiClientOptions {
  apiToken: string;
  zoneId: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

/** Client tối giản cho các API Cloudflare mà tính năng chống DDoS cần (zone-scoped) */
export class CloudflareApiClient {
  private readonly fetchFn: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: CloudflareApiClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    if (!/^[a-f0-9]{32}$/i.test(options.zoneId)) {
      throw new Error('CLOUDFLARE_ZONE_ID không hợp lệ (phải là chuỗi hex 32 ký tự).');
    }
  }

  private zonePath(suffix = ''): string {
    return `/zones/${this.options.zoneId}${suffix}`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: Envelope<T> }> {
    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.options.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    let data: Envelope<T>;
    try {
      data = (await res.json()) as Envelope<T>;
    } catch {
      throw new CloudflareApiError(`Cloudflare trả về dữ liệu không hợp lệ (HTTP ${res.status})`, res.status, []);
    }
    return { status: res.status, data };
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await this.request<T>(method, path, body);
    if (status >= 400 || !data.success) throw this.toError(status, data);
    return data.result;
  }

  private toError(status: number, data: Envelope<unknown>): CloudflareApiError {
    const errors = data.errors ?? [];
    const detail = errors.map((e) => `[${e.code}] ${e.message}`).join('; ') || 'không rõ nguyên nhân';
    return new CloudflareApiError(`Cloudflare API lỗi (HTTP ${status}): ${detail}`, status, errors.map((e) => e.code));
  }

  async getZone(): Promise<{ id: string; name: string; status: string; plan?: { name?: string } }> {
    return this.call('GET', this.zonePath());
  }

  async getSecurityLevel(): Promise<SecurityLevel> {
    return (await this.call<{ value: SecurityLevel }>('GET', this.zonePath('/settings/security_level'))).value;
  }

  async setSecurityLevel(value: SecurityLevel): Promise<SecurityLevel> {
    return (await this.call<{ value: SecurityLevel }>('PATCH', this.zonePath('/settings/security_level'), { value })).value;
  }

  async getBotFightMode(): Promise<boolean> {
    return Boolean((await this.call<{ fight_mode?: boolean }>('GET', this.zonePath('/bot_management'))).fight_mode);
  }

  async setBotFightMode(enabled: boolean): Promise<boolean> {
    const result = await this.call<{ fight_mode?: boolean }>('PUT', this.zonePath('/bot_management'), { fight_mode: enabled });
    return Boolean(result.fight_mode);
  }

  /** Trả về null nếu phase chưa có entrypoint ruleset (zone chưa từng tạo rule ở phase này) */
  async getPhaseEntrypoint(phase: RulesetPhase): Promise<CloudflareRuleset | null> {
    const { status, data } = await this.request<CloudflareRuleset>('GET', this.zonePath(`/rulesets/phases/${phase}/entrypoint`));
    if (status === 404) return null;
    if (status >= 400 || !data.success) throw this.toError(status, data);
    return data.result;
  }

  async putPhaseEntrypoint(phase: RulesetPhase, rules: CloudflareRule[]): Promise<CloudflareRuleset> {
    return this.call('PUT', this.zonePath(`/rulesets/phases/${phase}/entrypoint`), { rules });
  }

  async createAccessRule(ip: string, mode: AccessRuleMode, notes: string): Promise<string> {
    const version = isIP(ip);
    if (version === 0) throw new Error(`Không thể tạo IP Access Rule cho giá trị không phải IP: "${ip}"`);
    const result = await this.call<{ id: string }>('POST', this.zonePath('/firewall/access_rules/rules'), {
      mode,
      configuration: { target: version === 6 ? 'ip6' : 'ip', value: ip },
      notes: notes.slice(0, 100),
    });
    return result.id;
  }

  async deleteAccessRule(ruleId: string): Promise<void> {
    if (!/^[a-zA-Z0-9]{1,64}$/.test(ruleId)) throw new Error('ID IP Access Rule không hợp lệ');
    await this.call('DELETE', this.zonePath(`/firewall/access_rules/rules/${ruleId}`));
  }
}
