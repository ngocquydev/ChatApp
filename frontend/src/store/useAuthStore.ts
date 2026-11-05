import { create } from "zustand";
import api from "../services/api";
import {
  auth,
  googleProvider,
  facebookProvider,
} from "../config/firebase-config";
import { signOut, signInWithPopup } from "firebase/auth";

export interface UserProfile {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  cover?: string;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  school?: string;
  relationshipStatus?: string;
  role?: string;
  firebaseUid?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  isGoogleLoading: boolean;
  isFacebookLoading: boolean;
  setAuth: (user: UserProfile | null) => void;
  checkAuth: () => Promise<unknown>;
  loginfirebase: (idToken: string) => Promise<unknown>;
  loginWithGoogle: () => Promise<unknown>;
  loginWithFacebook: () => Promise<unknown>;
  loginMe: (body: Record<string, unknown>) => Promise<unknown>;
  registerMe: (body: Record<string, unknown>) => Promise<unknown>;
  updateProfile: (data: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    school?: string;
    relationshipStatus?: string;
  }) => Promise<UserProfile>;
  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (
    email: string,
  ) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (
    email: string,
    otp: string,
  ) => Promise<{ success: boolean; message: string; resetToken: string }>;
  resetPassword: (
    resetToken: string,
    newPassword: string,
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const CACHED_USER_KEY = "cached_user";

function getStoredUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistStoredUser(user: UserProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem("has_session", "true");
      const safe: UserProfile = {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        cover: user.cover,
        bio: user.bio,
        role: user.role,
      };
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(safe));
    } else {
      localStorage.removeItem("has_session");
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {
    // QuotaExceeded or privacy mode
  }
}

let checkAuthPromise: Promise<unknown> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,
  isGoogleLoading: false,
  isFacebookLoading: false,

  setAuth: (user) => {
    persistStoredUser(user);
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  checkAuth: async () => {
    if (checkAuthPromise) {
      return checkAuthPromise;
    }

    if (typeof window !== "undefined") {
      const hasSession = localStorage.getItem("has_session") === "true";
      if (!hasSession) {
        persistStoredUser(null);
        set({
          user: null,
          isAuthenticated: false,
          isCheckingAuth: false,
        });
        return null;
      }
      // Nạp ngay thông tin người dùng từ bộ nhớ đệm để hiển thị tức thì, tránh chặn LCP
      const cached = getStoredUser();
      if (cached && !get().user) {
        set({ user: cached, isAuthenticated: true });
      }
    }

    set({ isCheckingAuth: true });

    checkAuthPromise = (async () => {
      try {
        const resUser = await api.get("/auth/profile");
        const profile = resUser.data?.profile || resUser.data;
        persistStoredUser(profile);
        set({
          user: profile,
          isAuthenticated: true,
        });
        return resUser.data;
      } catch (error) {
        persistStoredUser(null);
        set({
          user: null,
          isAuthenticated: false,
        });
        throw error;
      } finally {
        set({ isCheckingAuth: false });
        checkAuthPromise = null;
      }
    })();

    return checkAuthPromise;
  },

  loginfirebase: async (idToken: string) => {
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

      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data?.profile;

      persistStoredUser(profile);
      set({
        user: profile,
        isAuthenticated: true,
      });

      return res.data;
    } catch (error) {
      console.error("Lỗi login firebase:", error);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  loginWithGoogle: async () => {
    set({ isGoogleLoading: true });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      return await get().loginfirebase(idToken);
    } catch (error) {
      console.error("Lỗi đăng nhập Google:", error);
      throw error;
    } finally {
      set({ isGoogleLoading: false });
    }
  },

  loginWithFacebook: async () => {
    set({ isFacebookLoading: true });
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const idToken = await result.user.getIdToken();
      return await get().loginfirebase(idToken);
    } catch (error) {
      console.error("Lỗi đăng nhập Facebook:", error);
      throw error;
    } finally {
      set({ isFacebookLoading: false });
    }
  },

  loginMe: async (body: Record<string, unknown>) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/login", body);
      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data?.profile;

      persistStoredUser(profile);
      set({
        user: profile,
        isAuthenticated: true,
      });

      return res.data;
    } catch (error) {
      console.error("Lỗi login truyền thống:", error);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  registerMe: async (body: Record<string, unknown>) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/register", body);
      console.log(res);
      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data?.profile;

      persistStoredUser(profile);
      set({
        user: profile,
        isAuthenticated: true,
      });

      return res.data;
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  updateProfile: async (data) => {
    const res = await api.patch("/auth/profile", data);
    const updatedProfile = res.data?.profile || res.data;
    const nextUser = get().user ? { ...get().user, ...updatedProfile } : updatedProfile;
    persistStoredUser(nextUser);
    set({ user: nextUser });
    return updatedProfile;
  },

  changePassword: async (data) => {
    const res = await api.post("/auth/change-password", data);
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const res = await api.post("/auth/verify-otp", { email, otp });
    return res.data;
  },

  resetPassword: async (resetToken: string, newPassword: string) => {
    const res = await api.post("/auth/reset-password", {
      resetToken,
      newPassword,
    });
    return res.data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Lỗi khi đăng xuất backend:", error);
    } finally {
      persistStoredUser(null);
      try {
        await signOut(auth);
      } catch (firebaseError) {
        console.warn("Lỗi khi đăng xuất firebase:", firebaseError);
      }
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },
}));
