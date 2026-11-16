import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudflareWafManager, type SecurityLevelStore } from './cloudflare-waf.manager.js';
import type { CloudflareApiClient } from './cloudflare-api.client.js';

function makeClient() {
  return {
    getZone: vi.fn().mockResolvedValue({ id: 'z', name: 'example.com', status: 'active', plan: { name: 'Free Website' } }),
    getSecurityLevel: vi.fn().mockResolvedValue('medium'),
    setSecurityLevel: vi.fn().mockImplementation((v: string) => Promise.resolve(v)),
    getBotFightMode: vi.fn().mockResolvedValue(false),
    setBotFightMode: vi.fn().mockImplementation((v: boolean) => Promise.resolve(v)),
    getPhaseEntrypoint: vi.fn().mockResolvedValue(null),
    putPhaseEntrypoint: vi.fn().mockResolvedValue({ id: 'rs', rules: [] }),
    createAccessRule: vi.fn().mockResolvedValue('ar1'),
    deleteAccessRule: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CloudflareWafManager', () => {
  let client: ReturnType<typeof makeClient>;
  let store: SecurityLevelStore & { value: string | null };
  let manager: CloudflareWafManager;

  beforeEach(() => {
    client = makeClient();
    store = {
      value: null,
      get: vi.fn(async () => store.value),
      set: vi.fn(async (v: string) => {
        store.value = v;
      }),
    };
    manager = new CloudflareWafManager(client as unknown as CloudflareApiClient, {
      frontendHost: 'chat.example.com',
      apiHost: 'api.example.com',
      allowedCountries: ['VN'],
      rateLimitRequests: 20,
      store,
    });
  });

  it('syncRules ghi custom rules và rate limit rule, giữ rule người dùng', async () => {
    client.getPhaseEntrypoint.mockImplementation((phase: string) =>
      Promise.resolve(
        phase === 'http_request_firewall_custom'
          ? { id: 'c', rules: [{ ref: 'mine', action: 'block', expression: 'ip.src eq 1.1.1.1', enabled: true }] }
          : null,
      ),
    );

    const result = await manager.syncRules();

    expect(result).toEqual({ customRules: 3, rateLimitRules: 1, preservedUserRules: 1 });
    const customCall = client.putPhaseEntrypoint.mock.calls.find(([phase]) => phase === 'http_request_firewall_custom');
    expect(customCall?.[1].map((r: { ref: string }) => r.ref)).toEqual([
      'mine',
      'chatapp-block-scanners',
      'chatapp-block-bad-ua',
      'chatapp-challenge-auth-foreign',
    ]);
    expect(client.putPhaseEntrypoint).toHaveBeenCalledWith('http_ratelimit', [
      expect.objectContaining({ ref: 'chatapp-ratelimit-auth' }),
    ]);
  });

  it('bật Under Attack lưu mức bảo mật cũ, tắt thì khôi phục đúng mức đó', async () => {
    client.getSecurityLevel.mockResolvedValue('high');
    await manager.setUnderAttack(true);
    expect(client.setSecurityLevel).toHaveBeenLastCalledWith('under_attack');
    expect(store.value).toBe('high');

    client.getSecurityLevel.mockResolvedValue('under_attack');
    await manager.setUnderAttack(false);
    expect(client.setSecurityLevel).toHaveBeenLastCalledWith('high');
  });

  it('bật Under Attack hai lần không ghi đè mức cũ bằng under_attack', async () => {
    client.getSecurityLevel.mockResolvedValue('under_attack');
    store.value = 'low';
    await manager.setUnderAttack(true);
    expect(store.value).toBe('low');
  });

  it('tắt Under Attack khi không có mức cũ thì về medium', async () => {
    client.getSecurityLevel.mockResolvedValue('under_attack');
    await manager.setUnderAttack(false);
    expect(client.setSecurityLevel).toHaveBeenLastCalledWith('medium');
  });

  it('getStatus tổng hợp zone, security level, bot fight mode và trạng thái luật', async () => {
    client.getPhaseEntrypoint.mockImplementation((phase: string) =>
      Promise.resolve(
        phase === 'http_request_firewall_custom'
          ? { id: 'c', rules: [{ ref: 'chatapp-block-scanners', action: 'block', expression: 'x', enabled: true }] }
          : null,
      ),
    );
    const status = await manager.getStatus();
    expect(status.zone).toEqual({ name: 'example.com', status: 'active', plan: 'Free Website' });
    expect(status.underAttack).toBe(false);
    expect(status.botFightMode).toBe(false);
    expect(status.rules.find((r) => r.ref === 'chatapp-block-scanners')?.deployed).toBe(true);
    expect(status.rules.find((r) => r.ref === 'chatapp-ratelimit-auth')?.deployed).toBe(false);
  });

  it('getStatus vẫn trả kết quả từng phần khi một API lỗi (vd. token thiếu quyền Bot Management)', async () => {
    client.getBotFightMode.mockRejectedValue(new Error('Cloudflare API lỗi (HTTP 403): [10000] Authentication error'));
    const status = await manager.getStatus();
    expect(status.botFightMode).toBeNull();
    expect(status.warnings[0]).toContain('Bot Fight Mode');
    expect(status.securityLevel).toBe('medium');
  });
});

