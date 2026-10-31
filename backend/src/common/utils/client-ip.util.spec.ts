import { describe, it, expect } from 'vitest';
import { getClientIp, cleanIp, isCloudflareRequest } from './client-ip.util.js';
import type { Request } from 'express';

describe('client-ip.util (Cloudflare & Proxy IP Parsing)', () => {
  describe('cleanIp', () => {
    it('loại bỏ tiền tố IPv4-mapped IPv6 ::ffff:', () => {
      expect(cleanIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('giữ nguyên IPv4 và IPv6 chuẩn', () => {
      expect(cleanIp('1.1.1.1')).toBe('1.1.1.1');
      expect(cleanIp('2606:4700::6810:85e5')).toBe('2606:4700::6810:85e5');
    });
  });

  describe('getClientIp', () => {
    it('ưu tiên header cf-connecting-ip của Cloudflare trên hết', () => {
      const mockReq = {
        headers: {
          'cf-connecting-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 10.0.0.1',
        },
        ip: '10.0.0.1',
      } as unknown as Request;

      expect(getClientIp(mockReq)).toBe('203.0.113.195');
    });

    it('ưu tiên true-client-ip nếu không có cf-connecting-ip', () => {
      const mockReq = {
        headers: {
          'true-client-ip': '198.51.100.42',
          'x-forwarded-for': '10.0.0.2',
        },
        ip: '10.0.0.2',
      } as unknown as Request;

      expect(getClientIp(mockReq)).toBe('198.51.100.42');
    });

    it('trích xuất IP đầu tiên trong chuỗi x-forwarded-for', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.0.2.1, 10.0.0.5',
        },
        ip: '10.0.0.5',
      } as unknown as Request;

      expect(getClientIp(mockReq)).toBe('192.0.2.1');
    });

    it('fallback về req.ip nếu không có headers', () => {
      const mockReq = {
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;

      expect(getClientIp(mockReq)).toBe('127.0.0.1');
    });

    it('fallback về socket remoteAddress nếu không có req.ip', () => {
      const mockReq = {
        headers: {},
        socket: { remoteAddress: '10.10.10.10' },
      } as unknown as Request;

      expect(getClientIp(mockReq)).toBe('10.10.10.10');
    });
  });

  describe('isCloudflareRequest', () => {
    it('trả về true khi có đủ header cf-ray và cf-connecting-ip', () => {
      const mockReq = {
        headers: {
          'cf-ray': '8dc89a2b1c4e7f8a-SIN',
          'cf-connecting-ip': '113.161.72.10',
        },
      } as unknown as Request;

      expect(isCloudflareRequest(mockReq)).toBe(true);
    });

    it('trả về false khi thiếu cf-ray hoặc cf-connecting-ip (truy cập trực tiếp IP máy chủ)', () => {
      const directReq = {
        headers: {
          host: '103.200.23.15',
        },
      } as unknown as Request;

      expect(isCloudflareRequest(directReq)).toBe(false);
    });
  });
});
