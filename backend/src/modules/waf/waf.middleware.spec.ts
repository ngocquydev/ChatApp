import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { WafMiddleware, buildWafContext } from './waf.middleware.js';
import { createWafEngine } from './waf-rules.engine.js';
import { DEFAULT_WAF_CONFIG, WAF_ERROR_BLOCKED, WAF_ERROR_CHALLENGE, type WafConfig } from './waf.types.js';
import type { WafConfigService } from './waf-config.service.js';
import type { WafEventsService } from './waf-events.service.js';
import type { WafClearanceService } from './waf-clearance.service.js';

function makeReq(overrides: Record<string, unknown> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/posts',
    headers: { 'user-agent': 'Mozilla/5.0' },
    socket: { remoteAddress: '203.0.113.10' },
    ...overrides,
  } as unknown as Request;
}

describe('WafMiddleware', () => {
  let record: ReturnType<typeof vi.fn>;
  let isValid: ReturnType<typeof vi.fn>;
  let next: NextFunction;

  function makeMiddleware(config: Partial<WafConfig> = {}) {
    const full = { ...DEFAULT_WAF_CONFIG, ...config };
    const configService = {
      getEngine: vi.fn().mockResolvedValue({ config: full, engine: createWafEngine(full), loadedAt: Date.now() }),
    } as unknown as WafConfigService;
    return new WafMiddleware(
      configService,
      { record } as unknown as WafEventsService,
      { isValid } as unknown as WafClearanceService,
    );
  }

  async function run(mw: WafMiddleware, req: Request): Promise<HttpException | undefined> {
    try {
      await mw.use(req, {} as Response, next);
      return undefined;
    } catch (err) {
      return err as HttpException;
    }
  }

  beforeEach(() => {
    record = vi.fn();
    isValid = vi.fn().mockReturnValue(false);
    next = vi.fn();
  });

  it('cho request hợp lệ đi tiếp và không ghi sự kiện', async () => {
    expect(await run(makeMiddleware(), makeReq())).toBeUndefined();
    expect(next).toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('chặn đường dẫn dò lỗ hổng với 403 WAF_BLOCKED và ghi sự kiện', async () => {
    const err = await run(makeMiddleware(), makeReq({ originalUrl: '/.env' }));
    expect(err?.getStatus()).toBe(403);
    expect(err?.getResponse()).toMatchObject({ error: WAF_ERROR_BLOCKED });
    expect(next).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '203.0.113.10', action: 'block', reason: 'scanner_path', path: '/.env' }),
    );
  });

  it('yêu cầu xác minh (WAF_CHALLENGE_REQUIRED) khi bật Under Attack và chưa có clearance', async () => {
    const err = await run(makeMiddleware({ underAttack: true }), makeReq({ method: 'POST' }));
    expect(err?.getResponse()).toMatchObject({ error: WAF_ERROR_CHALLENGE });
  });

  it('cho qua khi cookie clearance hợp lệ cho đúng IP client', async () => {
    isValid.mockReturnValue(true);
    expect(await run(makeMiddleware({ underAttack: true }), makeReq({ method: 'POST' }))).toBeUndefined();
    expect(isValid).toHaveBeenCalledWith(expect.anything(), '203.0.113.10');
  });
});

describe('buildWafContext', () => {
  it('chỉ dùng cf-ipcountry khi request thật sự đến từ Cloudflare', () => {
    const viaCf = buildWafContext(makeReq({ isCloudflare: true, cfCountry: 'us' }) as never, () => false);
    const spoofed = buildWafContext(makeReq({ isCloudflare: false, cfCountry: 'VN' }) as never, () => false);
    expect(viaCf.country).toBe('US');
    expect(spoofed.country).toBeNull();
  });

  it('ưu tiên realClientIp do CloudflareMiddleware gắn và tách query khỏi path', () => {
    const ctx = buildWafContext(
      makeReq({ realClientIp: '113.161.72.10', originalUrl: '/posts?cursor=1' }) as never,
      () => false,
    );
    expect(ctx.ip).toBe('113.161.72.10');
    expect(ctx.path).toBe('/posts');
    expect(ctx.url).toBe('/posts?cursor=1');
  });

  it('bỏ qua mã quốc gia không hợp lệ', () => {
    expect(buildWafContext(makeReq({ isCloudflare: true, cfCountry: 'XYZ1' }) as never, () => false).country).toBeNull();
  });
});
