import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import Cookies from "js-cookie";

// 1. Tạo adapter kết nối interface Storage của Zustand với js-cookie
const cookieStorage = {
  getItem: (name) => {
    return Cookies.get(name) ?? null;
  },
  setItem: (name, value) => {
    // expires: số ngày cookie tồn tại (ví dụ: 7 ngày)
    // sameSite: "strict" để tăng cường bảo mật chống CSRF
    Cookies.set(name, value, { expires: 7, sameSite: "strict" });
  },
  removeItem: (name) => {
    Cookies.remove(name);
  },
};

// 2. Cấu hình store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (userData, token) =>
        set({
          user: userData,
          token: token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage", // Tên cookie được tạo ra
      storage: createJSONStorage(() => cookieStorage), // Chỉ định dùng Cookie thay vì localStorage
    },
  ),
);
