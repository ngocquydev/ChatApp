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

const CACHED_ADMIN_KEY = "cached_admin_user";

function getStoredAdmin(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_ADMIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStoredAdmin(user: AdminUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem("has_admin_session", "true");
      localStorage.setItem(CACHED_ADMIN_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem("has_admin_session");
      localStorage.removeItem(CACHED_ADMIN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

let checkPromise: Promise<unknown> | null = null;

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  user: getStoredAdmin(),
  isAuthenticated: !!getStoredAdmin(),
  isCheckingAuth: true,
  isLoggingIn: false,

  checkAuth: async () => {
    if (checkPromise) return checkPromise;

    if (typeof window !== "undefined") {
      const hasSession = localStorage.getItem("has_admin_session") === "true";
      if (!hasSession) {
        persistStoredAdmin(null);
        set({ user: null, isAuthenticated: false, isCheckingAuth: false });
        return null;
      }
      const cached = getStoredAdmin();
      if (cached && !get().user) {
        set({ user: cached, isAuthenticated: true });
      }
    }

    set({ isCheckingAuth: true });
    checkPromise = (async () => {
      try {
        const res = await api.get("/auth/profile");
        const profile = res.data?.profile || res.data;
        if (profile?.role !== "admin") {
          throw new Error("Không có quyền truy cập quản trị viên");
        }
        persistStoredAdmin(profile);
        set({ user: profile, isAuthenticated: true });
        return profile;
      } catch (err) {
        persistStoredAdmin(null);
        set({ user: null, isAuthenticated: false });
        throw err;
      } finally {
        set({ isCheckingAuth: false });
        checkPromise = null;
      }
    })();

    return checkPromise;
  },

  login: async (body) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/admin/login", body);
      const profile = res.data?.profile;
      if (profile?.role !== "admin") {
        throw new Error("Tài khoản này không có quyền quản trị viên!");
      }
      persistStoredAdmin(profile);
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
      persistStoredAdmin(null);
      set({ user: null, isAuthenticated: false });
    }
  },
}));

