import { describe, it, expect } from 'vitest';
import { createWafEngine } from './waf-rules.engine.js';
import { DEFAULT_WAF_CONFIG, type WafConfig, type WafRequestContext } from './waf.types.js';

const baseCtx: WafRequestContext = {
  ip: '203.0.113.10',
  method: 'GET',
  path: '/posts',
  url: '/posts?cursor=abc',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0',
  country: 'VN',
  hasClearance: false,
  isBanned: false,
};

function evaluate(ctx: Partial<WafRequestContext>, config: Partial<WafConfig> = {}) {
  return createWafEngine({ ...DEFAULT_WAF_CONFIG, ...config }).evaluate({ ...baseCtx, ...ctx });
}

describe('WAF rules engine', () => {
  it('cho phép request bình thường', () => {
    expect(evaluate({})).toEqual({ action: 'allow' });
  });

  it('không làm gì khi WAF bị tắt', () => {
    expect(evaluate({ path: '/.env', url: '/.env' }, { enabled: false })).toEqual({ action: 'allow' });
  });

  describe('danh sách IP', () => {
    it('chặn IP / dải CIDR trong blocklist (IPv4 và IPv6)', () => {
      const config = { ipBlocklist: ['198.51.100.0/24', '2001:db8::/32'] };
      expect(evaluate({ ip: '198.51.100.7' }, config)).toEqual({ action: 'block', reason: 'ip_blocklist' });
      expect(evaluate({ ip: '2001:db8::1' }, config)).toEqual({ action: 'block', reason: 'ip_blocklist' });
    });

    it('allowlist bỏ qua mọi luật, kể cả khi IP đang bị ban', () => {
      const decision = evaluate(
        { ip: '10.0.0.5', isBanned: true, path: '/.env', url: '/.env' },
        { ipAllowlist: ['10.0.0.0/8'], ipBlocklist: ['10.0.0.5'] },
      );
      expect(decision).toEqual({ action: 'allow', reason: 'ip_allowlist' });
    });

    it('chặn IP đang bị ban tự động', () => {
      expect(evaluate({ isBanned: true })).toEqual({ action: 'block', reason: 'banned' });
    });
  });

  describe('đường dẫn dò lỗ hổng', () => {
    it.each([
      '/.env',
      '/.git/config',
      '/wp-admin/install.php',
      '/wp-login.php',
      '/xmlrpc.php',
      '/phpmyadmin/index.php',
      '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
      '/cgi-bin/luci',
      '/uploads/../../etc/passwd',
      '/uploads/%2e%2e%2fsecret',
      '/index.php?s=/Index/think',
    ])('chặn %s', (url) => {
      expect(evaluate({ url, path: url.split('?')[0] })).toEqual({ action: 'block', reason: 'scanner_path' });
    });

    it.each(['/uploads/posts/6f1c2a9e-1b2c-4d5e-9f00-112233445566.webp', '/auth/login', '/posts?q=envelope'])(
      'không chặn nhầm đường dẫn hợp lệ %s',
      (url) => {
        expect(evaluate({ url, path: url.split('?')[0] })).toEqual({ action: 'allow' });
      },
    );

    it('tắt được nhóm luật dò lỗ hổng', () => {
      expect(evaluate({ url: '/.env', path: '/.env' }, { blockScanners: false })).toEqual({ action: 'allow' });
    });
  });

  describe('User-Agent công cụ tấn công', () => {
    it.each(['sqlmap/1.7.2#stable', 'Mozilla/5.00 (Nikto/2.1.6)', 'masscan/1.3', 'Nuclei - Open-source project', 'WPScan v3.8'])(
      'chặn %s',
      (userAgent) => {
        expect(evaluate({ userAgent })).toEqual({ action: 'block', reason: 'bad_user_agent' });
      },
    );

    it('không chặn trình duyệt, curl hay UA rỗng (healthcheck)', () => {
      expect(evaluate({ userAgent: 'curl/8.4.0' })).toEqual({ action: 'allow' });
      expect(evaluate({ userAgent: '' })).toEqual({ action: 'allow' });
    });
  });

  describe('Under Attack Mode trong app', () => {
    const config = { underAttack: true };

    it('yêu cầu xác minh cho request ghi dữ liệu khi chưa có clearance', () => {
      expect(evaluate({ method: 'POST', path: '/posts', url: '/posts' }, config)).toEqual({
        action: 'challenge',
        reason: 'under_attack',
      });
    });

    it('cho qua request ghi khi đã có clearance hợp lệ', () => {
      expect(evaluate({ method: 'POST', path: '/posts', url: '/posts', hasClearance: true }, config)).toEqual({
        action: 'allow',
      });
    });

    it('không chặn request đọc (GET)', () => {
      expect(evaluate({ method: 'GET' }, config)).toEqual({ action: 'allow' });
    });

    it.each(['/waf/clearance', '/auth/login', '/auth/refresh', '/auth/logout'])(
      'miễn challenge cho %s (đã có Turnstile hoặc cần để giữ phiên)',
      (path) => {
        expect(evaluate({ method: 'POST', path, url: path }, config)).toEqual({ action: 'allow' });
      },
    );
  });

  describe('Xác minh với lưu lượng nước ngoài vào luồng xác thực', () => {
    const config = { challengeForeignAuth: true, allowedCountries: ['VN'] };

    it('yêu cầu xác minh khi IP ngoài VN gọi đăng ký', () => {
      expect(evaluate({ method: 'POST', path: '/auth/register', url: '/auth/register', country: 'US' }, config)).toEqual({
        action: 'challenge',
        reason: 'foreign_auth',
      });
    });

    it('cho qua IP Việt Nam, và IP nước ngoài đã có clearance', () => {
      const req = { method: 'POST', path: '/auth/register', url: '/auth/register' };
      expect(evaluate({ ...req, country: 'VN' }, config)).toEqual({ action: 'allow' });
      expect(evaluate({ ...req, country: 'US', hasClearance: true }, config)).toEqual({ action: 'allow' });
    });

    it('không áp dụng khi không biết quốc gia (request không qua Cloudflare)', () => {
      expect(evaluate({ method: 'POST', path: '/auth/register', url: '/auth/register', country: null }, config)).toEqual({
        action: 'allow',
      });
    });

    it('không áp dụng cho đường dẫn ngoài luồng xác thực', () => {
      expect(evaluate({ method: 'POST', path: '/posts', url: '/posts', country: 'US' }, config)).toEqual({ action: 'allow' });
    });
  });

  it('bỏ qua CIDR sai định dạng trong cấu hình', () => {
    expect(evaluate({ ip: '198.51.100.7' }, { ipBlocklist: ['not-a-cidr', '198.51.100.7/99'] })).toEqual({
      action: 'allow',
    });
  });
});

