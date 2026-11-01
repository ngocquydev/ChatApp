import { createIpMatcher } from '../../common/utils/client-ip.util.js';
import type { WafConfig, WafDecision, WafRequestContext } from './waf.types.js';

/**
 * Đường dẫn/payload đặc trưng của công cụ dò lỗ hổng. App là Node.js nên mọi file .php/.asp… đều là dò quét.
 * Dùng chung cho WAF trong app và biểu thức Custom Rule trên Cloudflare (xem cloudflare-waf.rules.ts).
 */
export const SCANNER_PATH_PATTERNS: readonly RegExp[] = [
  /\/\.(env|git|svn|hg|aws|ssh|htaccess|htpasswd|ds_store)(\/|$|\.|\?)/i,
  /\/wp-(admin|login|content|includes|config)/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/vendor\/phpunit/i,
  /\.(php|asp|aspx|jsp|cgi)(\/|\?|$)/i,
  /\/(cgi-bin|boaform|hnap1)(\/|$)/i,
  /\.\.(\/|\\)/,
  /\/etc\/passwd/i,
];

/** Chuỗi con (viết thường) trong User-Agent của công cụ tấn công phổ biến */
export const BAD_USER_AGENT_TOKENS: readonly string[] = [
  'sqlmap',
  'nikto',
  'masscan',
  'zgrab',
  'nmap',
  'nuclei',
  'acunetix',
  'netsparker',
  'wpscan',
  'dirbuster',
  'gobuster',
  'feroxbuster',
  'hydra',
  'havij',
];

/** Luồng xác thực áp dụng xác minh với IP nước ngoài */
export const AUTH_CHALLENGE_PATHS: readonly string[] = [
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-otp',
  '/auth/reset-password',
  '/auth/firebase-login',
];

/**
 * Miễn challenge: endpoint cấp clearance, đăng nhập (đã có Turnstile riêng),
 * refresh/logout (cần để giữ hoặc kết thúc phiên an toàn).
 */
export const CHALLENGE_EXEMPT_PATHS: readonly string[] = [
  '/waf/clearance',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
];

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isScannerUrl(url: string): boolean {
  const decoded = safeDecode(url);
  return SCANNER_PATH_PATTERNS.some((re) => re.test(url) || re.test(decoded));
}

function isBadUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.length > 0 && BAD_USER_AGENT_TOKENS.some((token) => ua.includes(token));
}

/** Bỏ dấu "/" cuối để "/auth/register/" khớp "/auth/register" */
function normalizePath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

export interface WafEngine {
  evaluate(ctx: WafRequestContext): WafDecision;
}

/**
 * Biên dịch cấu hình WAF một lần (danh sách CIDR → BlockList) rồi đánh giá từng request.
 * Thứ tự: allowlist → blocklist → ban → dò lỗ hổng → UA xấu → challenge.
 */
export function createWafEngine(config: WafConfig): WafEngine {
  const isAllowlisted = createIpMatcher(config.ipAllowlist);
  const isBlocklisted = createIpMatcher(config.ipBlocklist);
  const allowedCountries = new Set(config.allowedCountries.map((c) => c.toUpperCase()));

  return {
    evaluate(ctx: WafRequestContext): WafDecision {
      if (!config.enabled) return { action: 'allow' };
      if (isAllowlisted(ctx.ip)) return { action: 'allow', reason: 'ip_allowlist' };
      if (isBlocklisted(ctx.ip)) return { action: 'block', reason: 'ip_blocklist' };
      if (ctx.isBanned) return { action: 'block', reason: 'banned' };
      if (config.blockScanners && isScannerUrl(ctx.url)) return { action: 'block', reason: 'scanner_path' };
      if (config.blockBadUserAgents && isBadUserAgent(ctx.userAgent)) {
        return { action: 'block', reason: 'bad_user_agent' };
      }

      const path = normalizePath(ctx.path);
      if (ctx.hasClearance || CHALLENGE_EXEMPT_PATHS.includes(path)) return { action: 'allow' };

      if (config.underAttack && WRITE_METHODS.has(ctx.method.toUpperCase())) {
        return { action: 'challenge', reason: 'under_attack' };
      }
      if (
        config.challengeForeignAuth &&
        ctx.country !== null &&
        !allowedCountries.has(ctx.country.toUpperCase()) &&
        AUTH_CHALLENGE_PATHS.includes(path)
      ) {
        return { action: 'challenge', reason: 'foreign_auth' };
      }
      return { action: 'allow' };
    },
  };
}

