import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudflareMiddleware } from './cloudflare.middleware.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

describe('CloudflareMiddleware', () => {
  let middleware: CloudflareMiddleware;
  let mockRes: { setHeader: ReturnType<typeof vi.fn> };
  let mockNext: NextFunction;
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    middleware = new CloudflareMiddleware();
    mockRes = { setHeader: vi.fn() };
    mockNext = vi.fn();
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('gắn thông tin realClientIp, isCloudflare và cfRay vào request', () => {
    const mockReq = {
      headers: {
        'cf-ray': '8dc89a2b1c4e7f8a-SIN',
        'cf-connecting-ip': '113.161.72.10',
        'cf-ipcountry': 'VN',
      },
    } as unknown as Request & {
      realClientIp?: string;
      isCloudflare?: boolean;
      cfRay?: string;
      cfCountry?: string;
    };

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

    const mockReq = {
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request & { isCloudflare?: boolean };

    middleware.use(mockReq, mockRes as unknown as Response, mockNext);

    expect(mockReq.isCloudflare).toBe(false);
    expect(mockNext).toHaveBeenCalled();
  });

  it('chặn request truy cập trực tiếp IP khi CLOUDFLARE_PROXY_ONLY=true', () => {
    process.env.CLOUDFLARE_PROXY_ONLY = 'true';

    const directReq = {
      headers: {},
      ip: '198.51.100.23',
    } as unknown as Request;

    expect(() => {
      middleware.use(directReq, mockRes as unknown as Response, mockNext);
    }).toThrow(HttpException);

    try {
      middleware.use(directReq, mockRes as unknown as Response, mockNext);
    } catch (err) {
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });
});
