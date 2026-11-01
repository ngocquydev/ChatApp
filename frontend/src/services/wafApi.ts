import api from "./api";

/** API tương tác với WAF ở phía người dùng */
export const wafApi = {
  /** Đổi mã Turnstile lấy cookie clearance khi WAF yêu cầu xác minh */
  requestClearance: async (token: string) => {
    await api.post("/waf/clearance", { token });
  },
};

/** Lấy thông báo lỗi từ response backend ({ message }) */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof data?.message === "string" && data.message ? data.message : fallback;
}
