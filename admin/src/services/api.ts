import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

export interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Xử lý tự động làm mới token hoặc điều hướng về đăng nhập khi hết phiên
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (
        originalRequest.url?.includes("/auth/admin/login") ||
        originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/logout")
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch (refreshErr) {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

