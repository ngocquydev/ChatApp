import api from "./api";

export const wafApi = {
  requestClearance: async (token: string) => {
    await api.post("/waf/clearance", { token });
  },
};

export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })
    ?.response?.data;
  return typeof data?.message === "string" && data.message
    ? data.message
    : fallback;
}
