import { BlockList, isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';
import type { Request } from 'express';
import {
  CLOUDFLARE_IPV4_RANGES,
  CLOUDFLARE_IPV6_RANGES,
  DEFAULT_TRUSTED_PROXY_CIDRS,
} from './cloudflare-ip-ranges.js';

type AnyRequest = Request | IncomingMessage;
type IpFamily = 'ipv4' | 'ipv6';

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
 * Làm mờ địa chỉ IP (che giấu 2 octet cuối của IPv4 hoặc các hextet cuối của IPv6)
 * Đảm bảo địa chỉ IP thật của quản trị viên và người dùng không bị công khai ra ngoài.
 */
export function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return '***';
  const clean = cleanIp(ip.trim());
  if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  } else if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****`;
    }
  }
  return '***';
}

/** Trả về IP đã chuẩn hóa kèm họ địa chỉ, hoặc null nếu chuỗi không phải IP hợp lệ */
function normalizeIp(raw: string): { ip: string; family: IpFamily } | null {
  const ip = cleanIp(raw.trim());
  const version = isIP(ip);
  if (version === 4) return { ip, family: 'ipv4' };
  if (version === 6) return { ip, family: 'ipv6' };
  return null;
}

/** Nạp danh sách CIDR vào BlockList; CIDR sai định dạng bị bỏ qua để không làm sập ứng dụng */
function buildBlockList(cidrs: readonly string[]): BlockList {
  const list = new BlockList();
  for (const entry of cidrs) {
    const [address = '', prefixRaw] = entry.trim().split('/');
    const normalized = normalizeIp(address);
    if (!normalized) continue;

    const maxPrefix = normalized.family === 'ipv4' ? 32 : 128;
    const prefix = prefixRaw === undefined ? maxPrefix : Number(prefixRaw);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) continue;

    list.addSubnet(normalized.ip, prefix, normalized.family);
  }
  return list;
}

const cloudflareBlockList = buildBlockList([
  ...CLOUDFLARE_IPV4_RANGES,
  ...CLOUDFLARE_IPV6_RANGES,
]);

/**
 * Tạo hàm kiểm tra IP có thuộc danh sách CIDR hay không (CIDR sai định dạng bị bỏ qua).
 * Địa chỉ không kèm prefix được hiểu là một IP đơn (/32 hoặc /128).
 */
export function createIpMatcher(cidrs: readonly string[]): (ip: string) => boolean {
  const list = buildBlockList(cidrs);
  return (ip: string) => {
    const normalized = normalizeIp(ip);
    return normalized !== null && list.check(normalized.ip, normalized.family);
  };
}

/** Chuỗi có phải địa chỉ IPv4/IPv6 hợp lệ (chấp nhận dạng IPv4-mapped) */
export function isValidIp(ip: string): boolean {
  return normalizeIp(ip) !== null;
}

/** Chuỗi có phải CIDR hoặc IP đơn hợp lệ */
export function isValidCidr(cidr: string): boolean {
  const [address = '', prefixRaw] = cidr.trim().split('/');
  const normalized = normalizeIp(address);
  if (!normalized) return false;
  if (prefixRaw === undefined) return true;
  const prefix = Number(prefixRaw);
  const maxPrefix = normalized.family === 'ipv4' ? 32 : 128;
  return /^\d+$/.test(prefixRaw) && prefix >= 0 && prefix <= maxPrefix;
}

let cachedProxyCidrs: string | undefined;
let cachedProxyBlockList = new BlockList();

/** Danh sách proxy nội bộ từ TRUSTED_PROXY_CIDRS (mặc định loopback), cache theo giá trị env */
function getTrustedProxyBlockList(): BlockList {
  const raw = process.env.TRUSTED_PROXY_CIDRS ?? DEFAULT_TRUSTED_PROXY_CIDRS;
  if (raw !== cachedProxyCidrs) {
    cachedProxyCidrs = raw;
    cachedProxyBlockList = buildBlockList(raw.split(',').filter((c) => c.trim()));
  }
  return cachedProxyBlockList;
}

/** IP có thuộc dải Cloudflare Edge chính thức hay không */
export function isCloudflareIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return normalized !== null && cloudflareBlockList.check(normalized.ip, normalized.family);
}

/**
 * IP có phải proxy được phép khai báo IP client hay không:
 * Cloudflare Edge, hoặc proxy nội bộ trong TRUSTED_PROXY_CIDRS (mặc định loopback cho cloudflared tunnel).
 * Dùng được làm hàm `trust proxy` của Express.
 */
export function isTrustedProxyIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;
  return (
    cloudflareBlockList.check(normalized.ip, normalized.family) ||
    getTrustedProxyBlockList().check(normalized.ip, normalized.family)
  );
}

/** Lấy giá trị header dạng chuỗi đơn (header lặp lại → lấy giá trị đầu) */
function headerValue(req: AnyRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** IP hợp lệ trong header, hoặc null */
function ipFromHeader(req: AnyRequest, name: string): string | null {
  const value = headerValue(req, name);
  return value ? (normalizeIp(value)?.ip ?? null) : null;
}

/**
 * Địa chỉ TCP peer thật sự kết nối tới server — không thể giả mạo bằng header.
 */
export function getPeerIp(req: AnyRequest): string | null {
  const remote = req.socket?.remoteAddress;
  return remote ? (normalizeIp(remote)?.ip ?? null) : null;
}

/**
 * Trích xuất địa chỉ IP thực của client.
 * Header proxy (cf-connecting-ip, true-client-ip, x-forwarded-for) CHỈ được tin khi TCP peer là
 * Cloudflare Edge hoặc proxy nội bộ tin cậy (cloudflared tunnel). Kết nối thẳng vào IP máy chủ
 * luôn dùng IP peer, nên kẻ tấn công không thể giả IP để né rate limit.
 * Thứ tự ưu tiên khi peer tin cậy:
 * 1. cf-connecting-ip: Header tiêu chuẩn được Cloudflare Edge chèn và xác thực
 * 2. true-client-ip: Header bổ sung cho Cloudflare Enterprise
 * 3. x-forwarded-for: đọc từ phải sang trái, lấy IP đầu tiên không phải proxy tin cậy
 * 4. IP peer
 */
export function getClientIp(req: AnyRequest): string {
  const peer = getPeerIp(req);
  if (!peer) return 'unknown';
  if (!isTrustedProxyIp(peer)) return peer;

  const cfIp = ipFromHeader(req, 'cf-connecting-ip') ?? ipFromHeader(req, 'true-client-ip');
  if (cfIp) return cfIp;

  const forwarded = headerValue(req, 'x-forwarded-for');
  if (forwarded) {
    const chain = forwarded
      .split(',')
      .map((part) => normalizeIp(part)?.ip)
      .filter((ip): ip is string => Boolean(ip));
    for (let i = chain.length - 1; i >= 0; i--) {
      if (!isTrustedProxyIp(chain[i])) return chain[i];
    }
    if (chain.length > 0) return chain[0];
  }

  return peer;
}

/**
 * Kiểm tra request có thật sự đến qua mạng Cloudflare hay không:
 * TCP peer phải là Cloudflare Edge hoặc cloudflared tunnel, và có đủ header `cf-ray` cùng
 * `cf-connecting-ip` hợp lệ. Header do client tự gửi thẳng vào IP máy chủ sẽ không được tính.
 */
export function isCloudflareRequest(req: AnyRequest): boolean {
  const peer = getPeerIp(req);
  if (!peer || !isTrustedProxyIp(peer)) return false;

  const hasCfRay = Boolean(headerValue(req, 'cf-ray'));
  const hasCfIp = ipFromHeader(req, 'cf-connecting-ip') !== null;
  return hasCfRay && hasCfIp;
}
