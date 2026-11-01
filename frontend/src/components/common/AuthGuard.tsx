"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: ReactNode;
  allowAdmin?: boolean;
}

export default function AuthGuard({ children, allowAdmin = false }: AuthGuardProps) {
  const { isAuthenticated, isCheckingAuth, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isCheckingAuth) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!allowAdmin && user?.role === "admin") {
        router.replace("/admin");
      }
    }
  }, [isCheckingAuth, isAuthenticated, user, allowAdmin, router]);

  // Khi chưa đăng nhập hoặc tài khoản quản trị truy cập trang của người dùng thường -> chặn render
  if (!isCheckingAuth) {
    if (!isAuthenticated) {
      return null;
    }
    if (!allowAdmin && user?.role === "admin") {
      return null;
    }
  }

  // Nếu ở client và rõ ràng không có phiên làm việc cũ (chưa từng đăng nhập)
  if (typeof window !== "undefined") {
    const hasSession = localStorage.getItem("has_session") === "true";
    if (!hasSession && !isAuthenticated) {
      return null;
    }

    // Nếu thông tin lưu trong bộ nhớ đệm xác định là admin nhưng trang không cho phép admin
    try {
      const rawUser = localStorage.getItem("chatapp_user_cache");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (!allowAdmin && parsed?.role === "admin") {
          return null;
        }
      }
    } catch {
      // Bỏ qua lỗi phân tích cache
    }
  }

  // Cho phép render nội dung (layout + skeleton) để tránh chặn LCP và cho phép API con tải song song
  return <>{children}</>;
}
