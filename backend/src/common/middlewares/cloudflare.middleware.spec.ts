import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudflareMiddleware } from './cloudflare.middleware.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

type CfRequest = Request & {
  realClientIp?: string;
  isCloudflare?: boolean;
  cfRay?: string | null;
  cfCountry?: string | null;
};

function makeReq(
  remoteAddress: string,
  headers: Record<string, string> = {},
): CfRequest {
  return { headers, socket: { remoteAddress } } as unknown as CfRequest;
}

const CF_HEADERS = {
  'cf-ray': '8dc89a2b1c4e7f8a-SIN',
  'cf-connecting-ip': '113.161.72.10',
  'cf-ipcountry': 'VN',
};

describe('CloudflareMiddleware', () => {
  let middleware: CloudflareMiddleware;
  let mockRes: { setHeader: ReturnType<typeof vi.fn> };
  let mockNext: NextFunction;
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    delete process.env.TRUSTED_PROXY_CIDRS;
    middleware = new CloudflareMiddleware();
    mockRes = { setHeader: vi.fn() };
    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  function expectForbidden(req: Request) {
    let caught: unknown;
    try {
      middleware.use(req, mockRes as unknown as Response, mockNext);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(mockNext).not.toHaveBeenCalled();
  }

  it('gắn thông tin realClientIp, isCloudflare và cfRay vào request từ Cloudflare Edge', () => {
    const mockReq = makeReq('172.64.10.20', CF_HEADERS);

    middleware.use(mockReq, mockRes as unknown as Response, mockNext);

    expect(mockReq.realClientIp).toBe('113.161.72.10');
    expect(mockReq.isCloudflare).toBe(true);
    expect(mockReq.cfRay).toBe('8dc89a2b1c4e7f8a-SIN');
    expect(mockReq.cfCountry).toBe('VN');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Edge-Protected-By', 'Cloudflare-DDoS-Shield');
    expect(mockNext).toHaveBeenCalled();
  });

  it('cho phép request không qua Cloudflare khi CLOUDFLARE_PROXY_ONLY không bật', () => {
    delete process.env.CLOUDFLARE_PROXY_ONLY;

    const mockReq = makeReq('127.0.0.1');

    middleware.use(mockReq, mockRes as unknown as Response, mockNext);

    expect(mockReq.isCloudflare).toBe(false);
    expect(mockNext).toHaveBeenCalled();
  });

  it('[abuse] không tin cf-ray / cf-ipcountry giả mạo từ peer không phải Cloudflare', () => {
    const mockReq = makeReq('198.51.100.23', CF_HEADERS);

    middleware.use(mockReq, mockRes as unknown as Response, mockNext);

    expect(mockReq.isCloudflare).toBe(false);
    expect(mockReq.realClientIp).toBe('198.51.100.23');
    expect(mockReq.cfRay).toBeNull();
    expect(mockReq.cfCountry).toBeNull();
    expect(mockRes.setHeader).not.toHaveBeenCalled();
  });

  it('chặn request truy cập trực tiếp IP khi CLOUDFLARE_PROXY_ONLY=true', () => {
    process.env.CLOUDFLARE_PROXY_ONLY = 'true';

    expectForbidden(makeReq('198.51.100.23'));
  });

  it('[abuse] chặn request giả header Cloudflare gửi thẳng vào IP máy chủ khi CLOUDFLARE_PROXY_ONLY=true', () => {
    process.env.CLOUDFLARE_PROXY_ONLY = 'true';

    expectForbidden(makeReq('198.51.100.23', CF_HEADERS));
  });

  it('cho phép request qua cloudflared tunnel khi CLOUDFLARE_PROXY_ONLY=true', () => {
    process.env.CLOUDFLARE_PROXY_ONLY = 'true';

    const mockReq = makeReq('::ffff:127.0.0.1', CF_HEADERS);
    middleware.use(mockReq, mockRes as unknown as Response, mockNext);

    expect(mockReq.isCloudflare).toBe(true);
    expect(mockNext).toHaveBeenCalled();
  });
});
