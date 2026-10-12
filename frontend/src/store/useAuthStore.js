import { create } from "zustand";
import api from "../services/api";
import { auth, googleProvider, facebookProvider } from "../config/firebase-config";
import { signOut, signInWithPopup } from "firebase/auth";

let checkAuthPromise = null;

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoggingIn: false,
  isGoogleLoading: false,
  isFacebookLoading: false,

  setAuth: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  checkAuth: async () => {
    // Tránh gọi API trùng lặp nếu đang có 1 request checkAuth đang chạy
    if (checkAuthPromise) {
      return checkAuthPromise;
    }

    set({ isCheckingAuth: true });

    checkAuthPromise = (async () => {
      try {
        const resUser = await api.get("/auth/profile");
        set({
          user: resUser.data.profile,
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
        },
      );

      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data.profile;

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

  loginMe: async (body) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/login", body);
      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data.profile;

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

  registerMe: async (body) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/register", body);
      const profile =
        res.data?.profile || (await api.get("/auth/profile")).data.profile;

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

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Lỗi khi đăng xuất backend:", error);
    } finally {
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
