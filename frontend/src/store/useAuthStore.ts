import { create } from "zustand";
import api, { setAuthTokenGetter, setAuthTokenSetter } from "../services/api";
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
  accessToken: string | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoggingIn: boolean;
  isGoogleLoading: boolean;
  isFacebookLoading: boolean;
  setAuth: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
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

function clearLegacyAuthCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("has_session");
    localStorage.removeItem("cached_user");
  } catch {
    // localStorage may be unavailable in privacy mode.
  }
}

let checkAuthPromise: Promise<unknown> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,
  isGoogleLoading: false,
  isFacebookLoading: false,

  setAuth: (user) => {
    clearLegacyAuthCache();
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setAccessToken: (token) => {
    set({ accessToken: token });
  },

  checkAuth: async () => {
    if (checkAuthPromise) {
      return checkAuthPromise;
    }

    clearLegacyAuthCache();

    set({ isCheckingAuth: true });

    checkAuthPromise = (async () => {
      try {
        const resUser = await api.get("/auth/profile");
        const profile = resUser.data?.profile || resUser.data;
        set({
          user: profile,
          isAuthenticated: true,
        });
        return resUser.data;
      } catch (error) {
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
      const accessToken = (res.data?.accessToken as string) || null;

      set({
        user: profile,
        accessToken,
        isAuthenticated: true,
      });

      return res.data;
    } catch (error) {
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
      const accessToken = (res.data?.accessToken as string) || null;

      set({
        user: profile,
        accessToken,
        isAuthenticated: true,
      });

      return res.data;
    } catch (error) {
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
      const accessToken = (res.data?.accessToken as string) || null;

      set({
        user: profile,
        accessToken,
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
      clearLegacyAuthCache();
      try {
        await signOut(auth);
      } catch (firebaseError) {
        console.warn("Lỗi khi đăng xuất firebase:", firebaseError);
      }
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });
    }
  },
}));

setAuthTokenGetter(() => useAuthStore.getState().accessToken);
setAuthTokenSetter((token) => useAuthStore.getState().setAccessToken(token));
