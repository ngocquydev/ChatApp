import { z } from "zod";

type Tr = (vi: string, en: string) => string;

/** Nhãn dễ hiểu cho lý do chặn/xác minh của WAF */
export function wafReasonLabel(reason: string, tr: Tr): string {
  const labels: Record<string, [string, string]> = {
    ip_blocklist: ["IP trong danh sách chặn", "IP on blocklist"],
    banned: ["IP đang bị chặn tự động", "Auto-banned IP"],
    scanner_path: ["Dò lỗ hổng (đường dẫn đáng ngờ)", "Vulnerability scan (suspicious path)"],
    bad_user_agent: ["Công cụ tấn công (User-Agent)", "Attack tool (User-Agent)"],
    under_attack: ["Under Attack Mode — cần xác minh", "Under Attack Mode — verification"],
    foreign_auth: ["IP nước ngoài vào luồng xác thực", "Foreign IP on auth flow"],
    rate_limit: ["Vượt giới hạn tốc độ", "Rate limit exceeded"],
    repeat_offender: ["Tái phạm nhiều lần", "Repeat offender"],
    manual: ["Admin chặn thủ công", "Manually banned by admin"],
    expired: ["Hết thời hạn chặn", "Ban expired"],
  };
  const pair = labels[reason];
  return pair ? tr(pair[0], pair[1]) : reason;
}

export function wafActionLabel(action: string, tr: Tr): string {
  const labels: Record<string, [string, string]> = {
    block: ["Chặn", "Block"],
    challenge: ["Xác minh", "Challenge"],
    ban: ["Cấm IP", "Ban"],
    unban: ["Gỡ cấm", "Unban"],
  };
  const pair = labels[action];
  return pair ? tr(pair[0], pair[1]) : action;
}

export function securityLevelLabel(level: string | null | undefined, tr: Tr): string {
  const labels: Record<string, [string, string]> = {
    essentially_off: ["Gần như tắt", "Essentially off"],
    low: ["Thấp", "Low"],
    medium: ["Trung bình", "Medium"],
    high: ["Cao", "High"],
    under_attack: ["Đang bị tấn công (Under Attack)", "I'm Under Attack"],
  };
  if (!level) return tr("Không rõ", "Unknown");
  const pair = labels[level];
  return pair ? tr(pair[0], pair[1]) : level;
}

const ipSchema = z.union([z.ipv4(), z.ipv6()]);
const cidrSchema = z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()]);

export function isValidIpInput(value: string): boolean {
  return ipSchema.safeParse(value.trim()).success;
}

export function parseCidrList(text: string): { values: string[]; invalid: string[] } {
  const values = [...new Set(text.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))];
  return { values, invalid: values.filter((v) => !cidrSchema.safeParse(v).success) };
}

export function parseCountryList(text: string): { values: string[]; invalid: string[] } {
  const values = [...new Set(text.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
  return { values, invalid: values.filter((v) => !/^[A-Z]{2}$/.test(v)) };
}

