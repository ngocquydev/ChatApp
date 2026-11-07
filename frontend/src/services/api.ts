import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useWafChallengeStore } from "@/store/useWafChallengeStore";

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
  /** Đã gửi lại sau khi vượt qua xác minh WAF (tránh lặp vô hạn) */
  _wafRetry?: boolean;
}

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

let authTokenGetter: (() => string | null) | null = null;
export const setAuthTokenGetter = (fn: () => string | null) => {
  authTokenGetter = fn;
};

// Request Interceptor:
// 1. Tự động xóa Content-Type khi gửi FormData để Axios/Browser tự chèn multipart boundary chuẩn (tránh lỗi Multer không nhận tệp)
// 2. Tự động đính kèm header Authorization: Bearer <token> nếu có token trong auth store
api.interceptors.request.use((config) => {
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  const token = authTokenGetter ? authTokenGetter() : null;
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Bắt lỗi 401: Tự động làm mới accessToken qua /auth/refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // 403 WAF_CHALLENGE_REQUIRED: tường lửa yêu cầu xác minh Turnstile → mở hộp thoại, xác minh xong gửi lại request
    const errorCode = (error.response?.data as { error?: unknown } | undefined)?.error;
    if (
      error.response?.status === 403 &&
      errorCode === "WAF_CHALLENGE_REQUIRED" &&
      originalRequest &&
      !originalRequest._wafRetry &&
      !originalRequest.url?.includes("/waf/clearance") &&
      typeof window !== "undefined"
    ) {
      originalRequest._wafRetry = true;
      await useWafChallengeStore.getState().requestChallenge();
      return api(originalRequest);
    }

    // Không can thiệp nếu là các request xác thực cơ bản, đã retry, hoặc có cờ bỏ qua refresh
    const isAuthRoute =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/register") ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout");

    const shouldSkipRefresh =
      originalRequest?.skipAuthRefresh ||
      originalRequest?.headers?.["X-Skip-Refresh"] === "true";

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthRoute &&
      !shouldSkipRefresh &&
      originalRequest
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("has_session");
        }
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
