import { describe, it, expect, vi } from 'vitest';
import { CloudflareApiClient, CloudflareApiError } from './cloudflare-api.client.js';

const TOKEN = 'cf-test-token-should-never-be-logged';
const ZONE = '0123456789abcdef0123456789abcdef';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Đọc body JSON của một lần gọi fetch (body luôn là chuỗi do client JSON.stringify) */
function jsonBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') throw new Error('Body phải là chuỗi JSON');
  return JSON.parse(init.body);
}

function makeClient(responses: Response[]) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const r of responses) fetchFn.mockResolvedValueOnce(r);
  const client = new CloudflareApiClient({ apiToken: TOKEN, zoneId: ZONE, fetchFn });
  return { client, fetchFn };
}

describe('CloudflareApiClient', () => {
  it('gửi Bearer token và trả về result', async () => {
    const { client, fetchFn } = makeClient([
      jsonResponse(200, { success: true, errors: [], result: { value: 'medium' } }),
    ]);
    expect(await client.getSecurityLevel()).toBe('medium');

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`https://api.cloudflare.com/client/v4/zones/${ZONE}/settings/security_level`);
    expect(new Headers(init?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('PATCH security_level khi bật Under Attack', async () => {
    const { client, fetchFn } = makeClient([
      jsonResponse(200, { success: true, errors: [], result: { value: 'under_attack' } }),
    ]);
    await client.setSecurityLevel('under_attack');
    const [, init] = fetchFn.mock.calls[0];
    expect(init?.method).toBe('PATCH');
    expect(jsonBody(init)).toEqual({ value: 'under_attack' });
  });

  it('trả về null khi phase entrypoint chưa tồn tại (404)', async () => {
    const { client } = makeClient([
      jsonResponse(404, { success: false, errors: [{ code: 10003, message: 'not found' }], result: null }),
    ]);
    expect(await client.getPhaseEntrypoint('http_request_firewall_custom')).toBeNull();
  });

  it('PUT phase entrypoint với danh sách rule', async () => {
    const { client, fetchFn } = makeClient([
      jsonResponse(200, { success: true, errors: [], result: { id: 'rs1', rules: [] } }),
    ]);
    await client.putPhaseEntrypoint('http_ratelimit', [{ ref: 'r', action: 'block', expression: 'true', enabled: true }]);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toContain(`/zones/${ZONE}/rulesets/phases/http_ratelimit/entrypoint`);
    expect(init?.method).toBe('PUT');
    expect((jsonBody(init) as { rules: unknown[] }).rules).toHaveLength(1);
  });

  it('tạo IP Access Rule với target ip6 cho IPv6', async () => {
    const { client, fetchFn } = makeClient([
      jsonResponse(200, { success: true, errors: [], result: { id: 'ar1' } }),
    ]);
    expect(await client.createAccessRule('2001:db8::1', 'managed_challenge', 'chatapp-auto-ban')).toBe('ar1');
    expect(jsonBody(fetchFn.mock.calls[0][1])).toEqual({
      mode: 'managed_challenge',
      configuration: { target: 'ip6', value: '2001:db8::1' },
      notes: 'chatapp-auto-ban',
    });
  });

  it('ném CloudflareApiError kèm mã lỗi, không lộ token trong thông báo', async () => {
    const { client } = makeClient([
      jsonResponse(403, { success: false, errors: [{ code: 10000, message: 'Authentication error' }], result: null }),
    ]);
    const err = await client.getSecurityLevel().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CloudflareApiError);
    expect((err as CloudflareApiError).status).toBe(403);
    expect((err as Error).message).toContain('10000');
    expect((err as Error).message).not.toContain(TOKEN);
  });

  it('[abuse] từ chối tạo access rule với giá trị không phải IP', async () => {
    const { client, fetchFn } = makeClient([]);
    await expect(client.createAccessRule('1.2.3.4/0', 'block', 'x')).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('CloudflareApiClient options', () => {
  it('[abuse] từ chối Zone ID sai định dạng (chặn chèn đường dẫn)', () => {
    expect(() => new CloudflareApiClient({ apiToken: TOKEN, zoneId: '../accounts/x' })).toThrow();
  });
});
