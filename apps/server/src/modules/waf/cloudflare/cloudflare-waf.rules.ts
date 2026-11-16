import { BAD_USER_AGENT_TOKENS } from '../waf-rules.engine.js';

/** Mọi rule do ChatApp quản lý có ref bắt đầu bằng tiền tố này; rule khác là của người dùng và được giữ nguyên */
export const MANAGED_REF_PREFIX = 'chatapp-';

export type CloudflareRuleAction = 'block' | 'managed_challenge' | 'js_challenge' | 'challenge' | 'skip' | 'log';

export interface CloudflareRateLimit {
  characteristics: string[];
  period: number;
  requests_per_period: number;
  mitigation_timeout: number;
}

export interface CloudflareRule {
  id?: string;
  ref?: string;
  description?: string;
  expression: string;
  /** Rule do ChatApp tạo dùng CloudflareRuleAction; rule của người dùng có thể mang action khác (execute, rewrite…) */
  action: string;
  enabled: boolean;
  action_parameters?: Record<string, unknown>;
  ratelimit?: CloudflareRateLimit;
  logging?: Record<string, unknown>;
}

/** Các trường được phép gửi lại khi PUT (bỏ trường chỉ-đọc như version, last_updated) */
const WRITABLE_RULE_KEYS: readonly (keyof CloudflareRule)[] = [
  'id',
  'ref',
  'description',
  'expression',
  'action',
  'enabled',
  'action_parameters',
  'ratelimit',
  'logging',
];

/** Trang HTML của frontend cần Managed Challenge với IP nước ngoài */
const FRONTEND_AUTH_PAGES = ['/login', '/register', '/forgot-password'];

/** Endpoint API được rate limit tại biên Cloudflare */
const API_RATE_LIMITED_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/verify-otp',
  '/auth/reset-password',
  '/waf/clearance',
];

const SCANNER_PATH_FRAGMENTS = ['/.env', '/.git', '/.svn', '/.aws', '/.ssh', '/wp-', '/xmlrpc', '/phpmyadmin', '/vendor/phpunit', '/cgi-bin', '/etc/passwd'];
const SCANNER_EXTENSIONS = ['php', 'asp', 'aspx', 'jsp', 'cgi'];

const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;

/** Host phải là tên miền hợp lệ — chặn chèn biểu thức qua biến môi trường */
function assertHost(host: string, name: string): string {
  const normalized = host.trim().toLowerCase();
  if (!HOST_RE.test(normalized)) throw new Error(`${name} không phải tên miền hợp lệ: "${host}"`);
  return normalized;
}

function quoteList(values: readonly string[]): string {
  return `{${values.map((v) => `"${v}"`).join(' ')}}`;
}

function anyOf(conditions: string[]): string {
  return conditions.map((c) => `(${c})`).join(' or ');
}

export interface CustomRuleOptions {
  frontendHost?: string;
  apiHost?: string;
  allowedCountries: string[];
}

export function buildCustomRules(options: CustomRuleOptions): CloudflareRule[] {
  const rules: CloudflareRule[] = [
    {
      ref: `${MANAGED_REF_PREFIX}block-scanners`,
      description: 'ChatApp: chặn đường dẫn dò lỗ hổng (.env, .git, wp-*, *.php…)',
      action: 'block',
      enabled: true,
      expression: anyOf([
        ...SCANNER_PATH_FRAGMENTS.map((f) => `lower(http.request.uri.path) contains "${f}"`),
        `http.request.uri.path.extension in ${quoteList(SCANNER_EXTENSIONS)}`,
        'http.request.uri contains "../"',
      ]),
    },
    {
      ref: `${MANAGED_REF_PREFIX}block-bad-ua`,
      description: 'ChatApp: chặn User-Agent của công cụ tấn công',
      action: 'block',
      enabled: true,
      expression: anyOf(BAD_USER_AGENT_TOKENS.map((t) => `lower(http.user_agent) contains "${t}"`)),
    },
  ];

  if (options.frontendHost) {
    const host = assertHost(options.frontendHost, 'CLOUDFLARE_FRONTEND_HOST');
    const countries = options.allowedCountries.map((c) => c.trim().toUpperCase()).filter((c) => COUNTRY_RE.test(c));
    if (countries.length > 0) {
      rules.push({
        ref: `${MANAGED_REF_PREFIX}challenge-auth-foreign`,
        description: 'ChatApp: Managed Challenge với IP nước ngoài vào trang đăng nhập/đăng ký',
        action: 'managed_challenge',
        enabled: true,
        expression: `http.host eq "${host}" and http.request.uri.path in ${quoteList(FRONTEND_AUTH_PAGES)} and not ip.src.country in ${quoteList(countries)}`,
      });
    }
  }
  return rules;
}

export interface RateLimitOptions {
  apiHost?: string;
  requestsPerPeriod: number;
}

/** Gói Free: 1 rule, chu kỳ 10 giây, thời gian chặn 10 giây, đặc trưng bắt buộc cf.colo.id + ip.src */
export function buildRateLimitRule(options: RateLimitOptions): CloudflareRule {
  const pathCondition = `http.request.uri.path in ${quoteList(API_RATE_LIMITED_PATHS)}`;
  const expression = options.apiHost
    ? `http.host eq "${assertHost(options.apiHost, 'CLOUDFLARE_API_HOST')}" and ${pathCondition}`
    : pathCondition;
  const requests = Number.isInteger(options.requestsPerPeriod) && options.requestsPerPeriod > 0 ? options.requestsPerPeriod : 20;

  return {
    ref: `${MANAGED_REF_PREFIX}ratelimit-auth`,
    description: 'ChatApp: giới hạn tốc độ các endpoint xác thực',
    action: 'block',
    enabled: true,
    expression,
    ratelimit: {
      characteristics: ['cf.colo.id', 'ip.src'],
      period: 10,
      requests_per_period: requests,
      mitigation_timeout: 10,
    },
  };
}

function toWritable(rule: CloudflareRule): CloudflareRule {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE_RULE_KEYS) {
    if (rule[key] !== undefined) out[key] = rule[key];
  }
  return out as unknown as CloudflareRule;
}

/** Giữ rule của người dùng (giữ thứ tự), thay toàn bộ rule chatapp-* bằng bản mới ở cuối danh sách */
export function mergeManagedRules(existing: readonly CloudflareRule[], managed: readonly CloudflareRule[]): CloudflareRule[] {
  const userRules = existing.filter((r) => !r.ref?.startsWith(MANAGED_REF_PREFIX)).map(toWritable);
  return [...userRules, ...managed.map(toWritable)];
}

