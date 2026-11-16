import { describe, it, expect } from 'vitest';
import {
  MANAGED_REF_PREFIX,
  buildCustomRules,
  buildRateLimitRule,
  mergeManagedRules,
  type CloudflareRule,
} from './cloudflare-waf.rules.js';

const options = { frontendHost: 'chat.example.com', apiHost: 'api.example.com', allowedCountries: ['VN'] };

describe('cloudflare-waf.rules', () => {
  it('tạo 3 custom rule có ref chatapp-* (trong giới hạn 5 rule của gói Free)', () => {
    const rules = buildCustomRules(options);
    expect(rules.map((r) => r.ref)).toEqual([
      'chatapp-block-scanners',
      'chatapp-block-bad-ua',
      'chatapp-challenge-auth-foreign',
    ]);
    expect(rules.every((r) => r.ref?.startsWith(MANAGED_REF_PREFIX) && r.enabled)).toBe(true);
  });

  it('luật dò lỗ hổng chặn .env, .git, wp-*, file .php', () => {
    const [scanners] = buildCustomRules(options);
    expect(scanners.action).toBe('block');
    expect(scanners.expression).toContain('"/.env"');
    expect(scanners.expression).toContain('"/.git"');
    expect(scanners.expression).toContain('"/wp-"');
    expect(scanners.expression).toContain('http.request.uri.path.extension in {"php"');
  });

  it('luật UA xấu dùng lower(http.user_agent)', () => {
    const [, ua] = buildCustomRules(options);
    expect(ua.action).toBe('block');
    expect(ua.expression).toContain('lower(http.user_agent) contains "sqlmap"');
  });

  it('chỉ áp Managed Challenge lên trang HTML của frontend, không lên API', () => {
    const [, , foreign] = buildCustomRules(options);
    expect(foreign.action).toBe('managed_challenge');
    expect(foreign.expression).toContain('http.host eq "chat.example.com"');
    expect(foreign.expression).not.toContain('api.example.com');
    expect(foreign.expression).toContain('not ip.src.country in {"VN"}');
    expect(foreign.expression).toContain('"/login"');
  });

  it('bỏ luật quốc gia khi chưa cấu hình host frontend (tránh challenge nhầm API)', () => {
    expect(buildCustomRules({ ...options, frontendHost: '' }).map((r) => r.ref)).not.toContain(
      'chatapp-challenge-auth-foreign',
    );
  });

  it('[abuse] từ chối host chứa ký tự có thể chèn biểu thức', () => {
    expect(() => buildCustomRules({ ...options, frontendHost: 'chat.example.com" or true or "' })).toThrow();
  });

  it('rate limit rule đúng ràng buộc gói Free: chu kỳ 10s, đặc trưng cf.colo.id + ip.src', () => {
    const rule = buildRateLimitRule({ apiHost: 'api.example.com', requestsPerPeriod: 20 });
    expect(rule.ref).toBe('chatapp-ratelimit-auth');
    expect(rule.action).toBe('block');
    expect(rule.ratelimit).toEqual({
      characteristics: ['cf.colo.id', 'ip.src'],
      period: 10,
      requests_per_period: 20,
      mitigation_timeout: 10,
    });
    expect(rule.expression).toContain('http.host eq "api.example.com"');
    expect(rule.expression).toContain('"/auth/login"');
  });

  describe('mergeManagedRules', () => {
    const userRule: CloudflareRule = {
      id: 'u1',
      ref: 'my-own-rule',
      action: 'block',
      expression: 'ip.src eq 1.2.3.4',
      description: 'Luật bạn tự tạo',
      enabled: true,
      version: '3',
      last_updated: '2026-01-01T00:00:00Z',
    } as CloudflareRule;
    const oldManaged: CloudflareRule = {
      id: 'm1',
      ref: 'chatapp-block-scanners',
      action: 'block',
      expression: 'old',
      description: 'cũ',
      enabled: true,
    };

    it('giữ nguyên rule người dùng tự tạo, thay rule chatapp-* cũ bằng bản mới', () => {
      const merged = mergeManagedRules([userRule, oldManaged], buildCustomRules(options));
      expect(merged[0]).toMatchObject({ id: 'u1', ref: 'my-own-rule', expression: 'ip.src eq 1.2.3.4' });
      expect(merged.filter((r) => r.ref === 'chatapp-block-scanners')).toHaveLength(1);
      expect(merged.find((r) => r.ref === 'chatapp-block-scanners')?.expression).not.toBe('old');
    });

    it('bỏ trường chỉ-đọc (version, last_updated) trước khi PUT', () => {
      const [first] = mergeManagedRules([userRule], []);
      expect(first).not.toHaveProperty('version');
      expect(first).not.toHaveProperty('last_updated');
    });

    it('chạy lại nhiều lần cho cùng kết quả (không tạo trùng)', () => {
      const once = mergeManagedRules([userRule], buildCustomRules(options));
      const twice = mergeManagedRules(once, buildCustomRules(options));
      expect(twice.map((r) => r.ref)).toEqual(once.map((r) => r.ref));
    });
  });
});

