export type WafAction = 'allow' | 'block' | 'challenge';

export type WafReason =
  | 'ip_allowlist'
  | 'ip_blocklist'
  | 'banned'
  | 'scanner_path'
  | 'bad_user_agent'
  | 'under_attack'
  | 'foreign_auth';

export interface WafDecision {
  action: WafAction;
  reason?: WafReason;
}

/** Thông tin request đã được chuẩn hóa để đánh giá luật (không phụ thuộc Express) */
export interface WafRequestContext {
  ip: string;
  method: string;
  /** Đường dẫn không kèm query string */
  path: string;
  /** URL đầy đủ gồm query string (dùng để dò payload lỗ hổng) */
  url: string;
  userAgent: string;
  /** Mã quốc gia ISO từ cf-ipcountry — null nếu request không thật sự đi qua Cloudflare */
  country: string | null;
  hasClearance: boolean;
  isBanned: boolean;
}

/** Cấu hình WAF trong app (lưu MongoDB, sửa qua trang quản trị) */
export interface WafConfig {
  enabled: boolean;
  blockScanners: boolean;
  blockBadUserAgents: boolean;
  /** Under Attack Mode trong app: request ghi dữ liệu phải qua xác minh Turnstile */
  underAttack: boolean;
  /** Bắt xác minh với IP ngoài allowedCountries khi gọi luồng xác thực */
  challengeForeignAuth: boolean;
  allowedCountries: string[];
  ipAllowlist: string[];
  ipBlocklist: string[];
}

export const DEFAULT_WAF_CONFIG: WafConfig = {
  enabled: true,
  blockScanners: true,
  blockBadUserAgents: true,
  underAttack: false,
  challengeForeignAuth: true,
  allowedCountries: ['VN'],
  ipAllowlist: [],
  ipBlocklist: [],
};

/** Mã lỗi trả về client (trường `error` của response 403) */
export const WAF_ERROR_BLOCKED = 'WAF_BLOCKED';
export const WAF_ERROR_CHALLENGE = 'WAF_CHALLENGE_REQUIRED';
export const WAF_CLEARANCE_COOKIE = 'waf_clearance';
