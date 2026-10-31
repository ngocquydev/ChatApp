import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getClientIp,
  cleanIp,
  isCloudflareRequest,
  isCloudflareIp,
  isTrustedProxyIp,
} from './client-ip.util.js';
import type { Request } from 'express';

/** Tạo request giả với địa chỉ TCP peer (socket.remoteAddress) và headers tùy ý */
function makeReq(
  remoteAddress: string | undefined,
  headers: Record<string, string | string[]> = {},
): Request {
  return {
    headers,
    socket: { remoteAddress },
  } as unknown as Request;
}

const CF_EDGE_V4 = '172.64.10.20';
const CF_EDGE_V6 = '2606:4700:10::ac43:1';
const ATTACKER = '198.51.100.23';

describe('client-ip.util (Cloudflare & Proxy IP Parsing)', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    delete process.env.TRUSTED_PROXY_CIDRS;
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  describe('cleanIp', () => {
    it('loại bỏ tiền tố IPv4-mapped IPv6 ::ffff:', () => {
      expect(cleanIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('giữ nguyên IPv4 và IPv6 chuẩn', () => {
      expect(cleanIp('1.1.1.1')).toBe('1.1.1.1');
      expect(cleanIp('2606:4700::6810:85e5')).toBe('2606:4700::6810:85e5');
    });
  });

  describe('isCloudflareIp', () => {
    it('nhận diện IP thuộc dải Cloudflare (IPv4, IPv6, IPv4-mapped)', () => {
      expect(isCloudflareIp(CF_EDGE_V4)).toBe(true);
      expect(isCloudflareIp(CF_EDGE_V6)).toBe(true);
      expect(isCloudflareIp('::ffff:104.16.0.1')).toBe(true);
    });

    it('từ chối IP ngoài dải Cloudflare và chuỗi không phải IP', () => {
      expect(isCloudflareIp(ATTACKER)).toBe(false);
      expect(isCloudflareIp('127.0.0.1')).toBe(false);
      expect(isCloudflareIp('not-an-ip')).toBe(false);
      expect(isCloudflareIp('')).toBe(false);
    });
  });

  describe('isTrustedProxyIp', () => {
    it('mặc định tin Cloudflare và loopback (cloudflared tunnel chạy cùng máy)', () => {
      expect(isTrustedProxyIp(CF_EDGE_V4)).toBe(true);
      expect(isTrustedProxyIp('127.0.0.1')).toBe(true);
      expect(isTrustedProxyIp('::ffff:127.0.0.1')).toBe(true);
      expect(isTrustedProxyIp('::1')).toBe(true);
      expect(isTrustedProxyIp(ATTACKER)).toBe(false);
    });

    it('TRUSTED_PROXY_CIDRS thay thế danh sách proxy mặc định', () => {
      process.env.TRUSTED_PROXY_CIDRS = '172.18.0.0/16';

      expect(isTrustedProxyIp('172.18.0.5')).toBe(true);
      expect(isTrustedProxyIp('127.0.0.1')).toBe(false);
      // Dải Cloudflare luôn được tin
      expect(isTrustedProxyIp(CF_EDGE_V4)).toBe(true);
    });

    it('TRUSTED_PROXY_CIDRS rỗng chỉ còn tin dải Cloudflare', () => {
      process.env.TRUSTED_PROXY_CIDRS = '';

      expect(isTrustedProxyIp('127.0.0.1')).toBe(false);
      expect(isTrustedProxyIp(CF_EDGE_V6)).toBe(true);
    });

    it('bỏ qua CIDR sai định dạng thay vì làm sập ứng dụng', () => {
      process.env.TRUSTED_PROXY_CIDRS = 'abc, 10.0.0.0/99, 10.0.0.0/8, ::1';

      expect(isTrustedProxyIp('10.1.2.3')).toBe(true);
      expect(isTrustedProxyIp('::1')).toBe(true);
      expect(isTrustedProxyIp('127.0.0.1')).toBe(false);
    });
  });

  describe('getClientIp', () => {
    it('dùng cf-connecting-ip khi request đến từ Cloudflare Edge', () => {
      const req = makeReq(CF_EDGE_V4, {
        'cf-connecting-ip': '203.0.113.195',
        'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      });

      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('dùng cf-connecting-ip khi request đến từ cloudflared tunnel (loopback)', () => {
      const req = makeReq('::ffff:127.0.0.1', {
        'cf-connecting-ip': '2001:db8::42',
      });

      expect(getClientIp(req)).toBe('2001:db8::42');
    });

    it('dùng true-client-ip từ proxy tin cậy nếu không có cf-connecting-ip', () => {
      const req = makeReq(CF_EDGE_V6, { 'true-client-ip': '198.51.100.42' });

      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    it('[abuse] bỏ qua cf-connecting-ip giả mạo khi kết nối thẳng vào IP máy chủ', () => {
      const req = makeReq(ATTACKER, {
        'cf-connecting-ip': '1.2.3.4',
        'cf-ray': '8dc89a2b1c4e7f8a-SIN',
      });

      expect(getClientIp(req)).toBe(ATTACKER);
    });

    it('[abuse] bỏ qua true-client-ip và x-forwarded-for giả mạo từ peer không tin cậy', () => {
      const req = makeReq(`::ffff:${ATTACKER}`, {
        'true-client-ip': '5.5.5.5',
        'x-forwarded-for': '6.6.6.6',
      });

      expect(getClientIp(req)).toBe(ATTACKER);
    });

    it('[abuse] bỏ qua cf-connecting-ip không phải IP hợp lệ (chống chèn khóa Redis)', () => {
      const req = makeReq(CF_EDGE_V4, {
        'cf-connecting-ip': 'evil:key*',
        'x-forwarded-for': '203.0.113.7',
      });

      expect(getClientIp(req)).toBe('203.0.113.7');
    });

    it('[abuse] x-forwarded-for được đọc từ phải sang trái, bỏ qua IP client tự chèn', () => {
      const req = makeReq(CF_EDGE_V4, {
        'x-forwarded-for': '6.6.6.6, 203.0.113.9, 172.64.0.5',
      });

      expect(getClientIp(req)).toBe('203.0.113.9');
    });

    it('trả về IP peer khi không có header proxy', () => {
      expect(getClientIp(makeReq('10.10.10.10'))).toBe('10.10.10.10');
      expect(getClientIp(makeReq('::ffff:127.0.0.1'))).toBe('127.0.0.1');
    });

    it('trả về "unknown" khi socket đã đóng và không xác định được peer', () => {
      expect(getClientIp(makeReq(undefined, { 'cf-connecting-ip': '1.2.3.4' }))).toBe(
        'unknown',
      );
    });
  });

  describe('isCloudflareRequest', () => {
    const cfHeaders = {
      'cf-ray': '8dc89a2b1c4e7f8a-SIN',
      'cf-connecting-ip': '113.161.72.10',
    };

    it('true khi có đủ header Cloudflare và peer là Cloudflare Edge', () => {
      expect(isCloudflareRequest(makeReq(CF_EDGE_V4, cfHeaders))).toBe(true);
      expect(isCloudflareRequest(makeReq(CF_EDGE_V6, cfHeaders))).toBe(true);
    });

    it('true khi có đủ header Cloudflare và peer là cloudflared tunnel', () => {
      expect(isCloudflareRequest(makeReq('127.0.0.1', cfHeaders))).toBe(true);
    });

    it('[abuse] false khi kẻ tấn công tự gửi cf-ray và cf-connecting-ip thẳng vào IP máy chủ', () => {
      expect(isCloudflareRequest(makeReq(ATTACKER, cfHeaders))).toBe(false);
    });

    it('false khi thiếu cf-ray hoặc cf-connecting-ip', () => {
      expect(
        isCloudflareRequest(makeReq(CF_EDGE_V4, { 'cf-ray': cfHeaders['cf-ray'] })),
      ).toBe(false);
      expect(isCloudflareRequest(makeReq(CF_EDGE_V4, { host: '103.200.23.15' }))).toBe(
        false,
      );
    });

    it('false khi cf-connecting-ip không phải IP hợp lệ', () => {
      expect(
        isCloudflareRequest(
          makeReq(CF_EDGE_V4, { 'cf-ray': cfHeaders['cf-ray'], 'cf-connecting-ip': 'x' }),
        ),
      ).toBe(false);
    });
  });
});
