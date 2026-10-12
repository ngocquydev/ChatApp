import { create } from "zustand";
import api from "../services/api";
import { auth } from "../config/firebase-config";
import { signOut } from "firebase/auth";

// Biến lưu giữ Promise đang chạy của checkAuth để chống gọi trùng lặp (Deduplication)
let checkAuthPromise = null;

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,

  // Kiểm tra phiên đăng nhập hiện tại khi khởi động app hoặc F5 trang
  checkAuth: async () => {
    // Nếu đã có tiến trình checkAuth đang chạy, tái sử dụng Promise đó
    if (checkAuthPromise) {
      return checkAuthPromise;
    }

    checkAuthPromise = (async () => {
      set({ isCheckingAuth: true });
      try {
        // api.js đã có Interceptor tự động xử lý refresh token khi gặp 401
        const res = await api.get("/auth/profile");
        set({
          user: res.data.profile,
          isAuthenticated: true,
          isCheckingAuth: false,
        });
        return res.data.profile;
      } catch (error) {
        set({
          user: null,
          isAuthenticated: false,
          isCheckingAuth: false,
        });
        return null;
      } finally {
        checkAuthPromise = null;
      }
    })();

    return checkAuthPromise;
  },

  // Đăng nhập truyền thống bằng email & password
  loginMe: async (credentials) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/login", {
        email: credentials.email,
        password: credentials.password,
        turnstileToken: credentials.turnstileToken,
      });

      // Lấy trực tiếp profile từ response đăng nhập (tránh gọi thêm request /auth/profile)
      let profile = res.data?.profile;
      if (!profile) {
        const resUser = await api.get("/auth/profile");
        profile = resUser.data.profile;
      }

      set({
        user: profile,
        isAuthenticated: true,
        isLoggingIn: false,
      });

      return res.data;
    } catch (error) {
      set({ isLoggingIn: false });
      throw error;
    }
  },

  // Đăng nhập bằng Firebase (Google / Facebook)
  loginfirebase: async (idToken) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post(
        "/auth/firebase-login",
        {},
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      // Lấy trực tiếp profile từ response
      let profile = res.data?.profile;
      if (!profile) {
        const resUser = await api.get("/auth/profile");
        profile = resUser.data.profile;
      }

      set({
        user: profile,
        isAuthenticated: true,
        isLoggingIn: false,
      });

      return res.data;
    } catch (error) {
      console.error("Lỗi đăng nhập Firebase:", error);
      set({
        user: null,
        isAuthenticated: false,
        isLoggingIn: false,
      });
      throw error;
    }
  },

  // Đăng xuất
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Lỗi khi gọi API logout backend:", error);
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi khi signOut firebase:", error);
    }

    set({
      user: null,
      isAuthenticated: false,
    });
  },
}));
