import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';

/**
 * Trích xuất địa chỉ IP thực của client với độ ưu tiên cao nhất cho Cloudflare Proxy
 * Thứ tự ưu tiên:
 * 1. cf-connecting-ip: Header tiêu chuẩn được Cloudflare Edge chèn và xác thực
 * 2. true-client-ip: Header bổ sung cho Cloudflare Enterprise
 * 3. x-forwarded-for: Chuỗi proxy IP tiêu chuẩn (lấy IP đầu tiên)
 * 4. req.ip: IP do Express giải quyết (dựa trên cấu hình trust proxy)
 * 5. req.socket.remoteAddress: Địa chỉ IP socket mạng trực tiếp
 */
export function getClientIp(req: Request | IncomingMessage): string {
  const headers = req.headers;

  // 1. Cloudflare Connecting IP
  const cfIp = headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim().length > 0) {
    return cleanIp(cfIp.trim());
  }

  // 2. True-Client-IP (Cloudflare Enterprise / CDN)
  const trueClientIp = headers['true-client-ip'];
  if (typeof trueClientIp === 'string' && trueClientIp.trim().length > 0) {
    return cleanIp(trueClientIp.trim());
  }

  // 3. X-Forwarded-For
  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    const raw = typeof xForwardedFor === 'string'
      ? xForwardedFor
      : Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : '';
    const firstIp = raw.split(',')[0]?.trim();
    if (firstIp) {
      return cleanIp(firstIp);
    }
  }

  // 4. Express req.ip
  const expressReq = req as Request;
  if (typeof expressReq.ip === 'string' && expressReq.ip.length > 0) {
    return cleanIp(expressReq.ip);
  }

  // 5. Socket remote address
  const socketIp = req.socket?.remoteAddress;
  if (socketIp) {
    return cleanIp(socketIp);
  }

  return '127.0.0.1';
}

/**
 * Chuẩn hóa chuỗi IP (loại bỏ prefix IPv4-mapped IPv6 `::ffff:`)
 */
export function cleanIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Kiểm tra xem request có phải đến qua mạng Proxy của Cloudflare hay không
 * Cloudflare luôn đính kèm header `cf-ray` và `cf-connecting-ip` trên mọi yêu cầu hợp lệ
 */
export function isCloudflareRequest(req: Request | IncomingMessage): boolean {
  const hasCfRay = Boolean(req.headers['cf-ray']);
  const hasCfIp = Boolean(req.headers['cf-connecting-ip']);
  return hasCfRay && hasCfIp;
}
