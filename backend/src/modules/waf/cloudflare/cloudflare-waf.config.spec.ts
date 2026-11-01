import { describe, it, expect } from 'vitest';
import { readCloudflareEnv } from './cloudflare-waf.config.js';

describe('readCloudflareEnv', () => {
  it('trả về null khi thiếu token hoặc zone (tính năng Cloudflare tắt)', () => {
    expect(readCloudflareEnv({})).toBeNull();
    expect(readCloudflareEnv({ CLOUDFLARE_API_TOKEN: 't' })).toBeNull();
    expect(readCloudflareEnv({ CLOUDFLARE_ZONE_ID: 'z' })).toBeNull();
  });

  it('áp dụng giá trị mặc định an toàn', () => {
    const cfg = readCloudflareEnv({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: 'z' });
    expect(cfg).toMatchObject({
      allowedCountries: ['VN'],
      rateLimitRequests: 20,
      autoBan: false,
      autoBanMode: 'managed_challenge',
    });
  });

  it('đọc cấu hình tùy chỉnh và bỏ qua chế độ auto-ban không hợp lệ', () => {
    const cfg = readCloudflareEnv({
      CLOUDFLARE_API_TOKEN: 't',
      CLOUDFLARE_ZONE_ID: 'z',
      CLOUDFLARE_FRONTEND_HOST: 'chat.example.com',
      CLOUDFLARE_ALLOWED_COUNTRIES: 'vn, sg',
      CLOUDFLARE_RATELIMIT_REQUESTS: '30',
      CLOUDFLARE_AUTO_BAN: 'true',
      CLOUDFLARE_AUTO_BAN_MODE: 'whitelist',
    });
    expect(cfg).toMatchObject({
      frontendHost: 'chat.example.com',
      allowedCountries: ['VN', 'SG'],
      rateLimitRequests: 30,
      autoBan: true,
      autoBanMode: 'managed_challenge',
    });
  });
});

