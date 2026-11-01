import { createHmac, timingSafeEqual } from 'node:crypto';

/** Thời hạn mặc định của clearance sau khi vượt qua Turnstile: 30 phút */
export const CLEARANCE_TTL_SECONDS = 30 * 60;

function signature(expSeconds: number, ip: string, secret: string): string {
  return createHmac('sha256', secret).update(`${expSeconds}|${ip}`).digest('base64url');
}

/**
 * Tạo token clearance `<exp>.<hmac>` gắn với IP client. Token nằm trong cookie HttpOnly,
 * không chứa dữ liệu cá nhân (IP chỉ tham gia vào chữ ký, không lưu trong token).
 */
export function signClearance(
  ip: string,
  secret: string,
  ttlSeconds = CLEARANCE_TTL_SECONDS,
  now = Date.now(),
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${signature(exp, ip, secret)}`;
}

export function verifyClearance(
  token: string | undefined,
  ip: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expRaw, sig] = parts;
  if (!/^\d{1,12}$/.test(expRaw) || !sig) return false;

  const exp = Number(expRaw);
  if (exp * 1000 < now) return false;

  const expected = Buffer.from(signature(exp, ip, secret));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

