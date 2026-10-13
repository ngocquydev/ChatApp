import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
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
