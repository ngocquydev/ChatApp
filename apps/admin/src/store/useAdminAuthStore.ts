import { create } from "zustand";
import api from "../services/api";
import type { AdminUser } from "../services/adminApi";

export interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  checkAuth: () => Promise<unknown>;
  login: (data: { email: string; password: string; turnstileToken?: string }) => Promise<unknown>;
  logout: () => Promise<void>;
}

function clearLegacyAdminStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("has_admin_session");
    localStorage.removeItem("cached_admin_user");
  } catch {
    // Browser storage can be unavailable; authentication still uses the cookie.
  }
}

let checkPromise: Promise<unknown> | null = null;

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,

  checkAuth: async () => {
    if (checkPromise) return checkPromise;
    clearLegacyAdminStorage();
    set({ isCheckingAuth: true });
    checkPromise = (async () => {
      try {
        const res = await api.get("/auth/profile");
        const profile = res.data?.profile || res.data;
        if (profile?.role !== "admin") {
          throw new Error("Không có quyền truy cập quản trị viên");
        }
        set({ user: profile, isAuthenticated: true });
        return profile;
      } catch {
        set({ user: null, isAuthenticated: false });
        return null;
      } finally {
        set({ isCheckingAuth: false });
        checkPromise = null;
      }
    })();

    return checkPromise;
  },

  login: async (body) => {
    clearLegacyAdminStorage();
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/admin/login", body);
      const profile = res.data?.profile;
      if (profile?.role !== "admin") {
        throw new Error("Tài khoản này không có quyền quản trị viên!");
      }
      set({ user: profile, isAuthenticated: true });
      return res.data;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      clearLegacyAdminStorage();
      set({ user: null, isAuthenticated: false });
    }
  },
}));

