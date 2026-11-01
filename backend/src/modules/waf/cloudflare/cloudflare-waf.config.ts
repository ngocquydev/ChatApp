import { CloudflareApiClient, type AccessRuleMode } from './cloudflare-api.client.js';
import { CloudflareWafManager, type SecurityLevelStore } from './cloudflare-waf.manager.js';

export interface CloudflareEnvConfig {
  apiToken: string;
  zoneId: string;
  frontendHost?: string;
  apiHost?: string;
  allowedCountries: string[];
  rateLimitRequests: number;
  autoBan: boolean;
  autoBanMode: AccessRuleMode;
}

const AUTO_BAN_MODES: readonly AccessRuleMode[] = ['block', 'managed_challenge', 'js_challenge', 'challenge'];

/** Đọc cấu hình Cloudflare từ biến môi trường; trả về null nếu chưa cấu hình token + zone */
export function readCloudflareEnv(env: NodeJS.ProcessEnv = process.env): CloudflareEnvConfig | null {
  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = env.CLOUDFLARE_ZONE_ID?.trim();
  if (!apiToken || !zoneId) return null;

  const mode = env.CLOUDFLARE_AUTO_BAN_MODE?.trim() as AccessRuleMode | undefined;
  return {
    apiToken,
    zoneId,
    frontendHost: env.CLOUDFLARE_FRONTEND_HOST?.trim() || undefined,
    apiHost: env.CLOUDFLARE_API_HOST?.trim() || undefined,
    allowedCountries: (env.CLOUDFLARE_ALLOWED_COUNTRIES ?? 'VN')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
    rateLimitRequests: Number(env.CLOUDFLARE_RATELIMIT_REQUESTS) || 20,
    autoBan: env.CLOUDFLARE_AUTO_BAN === 'true',
    autoBanMode: mode && AUTO_BAN_MODES.includes(mode) ? mode : 'managed_challenge',
  };
}

export function createCloudflareManager(
  config: CloudflareEnvConfig,
  store: SecurityLevelStore,
): { client: CloudflareApiClient; manager: CloudflareWafManager } {
  const client = new CloudflareApiClient({ apiToken: config.apiToken, zoneId: config.zoneId });
  const manager = new CloudflareWafManager(client, {
    frontendHost: config.frontendHost,
    apiHost: config.apiHost,
    allowedCountries: config.allowedCountries,
    rateLimitRequests: config.rateLimitRequests,
    store,
  });
  return { client, manager };
}

