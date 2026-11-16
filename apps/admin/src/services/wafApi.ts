import api from "./api";

export interface WafAppConfig {
  enabled: boolean;
  blockScanners: boolean;
  blockBadUserAgents: boolean;
  underAttack: boolean;
  challengeForeignAuth: boolean;
  allowedCountries: string[];
  ipAllowlist: string[];
  ipBlocklist: string[];
}

export interface CloudflareRuleStatus {
  ref: string;
  description: string;
  action: string;
  phase: "custom" | "ratelimit";
  deployed: boolean;
}

export interface CloudflareStatus {
  configured: boolean;
  autoBan: boolean;
  zone?: { name: string; status: string; plan: string | null } | null;
  securityLevel?: string | null;
  underAttack?: boolean | null;
  botFightMode?: boolean | null;
  rules?: CloudflareRuleStatus[];
  warnings?: string[];
}

export interface WafStatus {
  app: WafAppConfig;
  cloudflare: CloudflareStatus;
  activeBans: number;
}

export interface WafBan {
  ip: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  cloudflareRuleId: string | null;
}

export interface WafEvent {
  at: string;
  ip: string;
  action: "block" | "challenge" | "ban" | "unban";
  reason: string;
  method?: string;
  path?: string;
  country?: string | null;
}

export type UnderAttackScope = "app" | "cloudflare" | "both";
export type WafConfigPatch = Partial<Omit<WafAppConfig, "underAttack">>;

/** API quản trị WAF (chỉ admin; backend kiểm tra quyền ở mọi endpoint) */
export const wafApi = {
  getStatus: async () => (await api.get<WafStatus>("/admin/waf/status")).data,
  updateConfig: async (patch: WafConfigPatch) => (await api.patch<WafAppConfig>("/admin/waf/config", patch)).data,
  setUnderAttack: async (enabled: boolean, scope: UnderAttackScope) =>
    (await api.post<{ app?: boolean; cloudflareSecurityLevel?: string }>("/admin/waf/under-attack", { enabled, scope })).data,
  setBotFight: async (enabled: boolean) =>
    (await api.post<{ botFightMode: boolean }>("/admin/waf/cloudflare/bot-fight", { enabled })).data,
  syncCloudflare: async () =>
    (await api.post<{ customRules: number; rateLimitRules: number; preservedUserRules: number }>("/admin/waf/cloudflare/sync")).data,
  listBans: async () => (await api.get<WafBan[]>("/admin/waf/bans")).data,
  createBan: async (ip: string, durationMinutes: number) =>
    (await api.post<WafBan>("/admin/waf/bans", { ip, durationMinutes })).data,
  deleteBan: async (ip: string) => {
    await api.delete(`/admin/waf/bans/${encodeURIComponent(ip)}`);
  },
  listEvents: async () => (await api.get<WafEvent[]>("/admin/waf/events")).data,
  /** Đổi mã Turnstile lấy cookie clearance khi WAF yêu cầu xác minh */
  requestClearance: async (token: string) => {
    await api.post("/waf/clearance", { token });
  },
};

/** Lấy thông báo lỗi tiếng Việt từ response backend ({ message }) */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof data?.message === "string" && data.message ? data.message : fallback;
}

