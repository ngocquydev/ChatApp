"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isCheckingAuth, isAuthenticated, router]);

  // Khi đã xác nhận không có quyền truy cập, ẩn nội dung để chuyển hướng về /login
  if (!isCheckingAuth && !isAuthenticated) {
    return null;
  }

  // Nếu ở client và rõ ràng không có phiên làm việc cũ (chưa từng đăng nhập)
  if (typeof window !== "undefined") {
    const hasSession = localStorage.getItem("has_session") === "true";
    if (!hasSession && !isAuthenticated) {
      return null;
    }
  }

  // Cho phép render nội dung (layout + skeleton) để tránh chặn LCP và cho phép API con tải song song
  return <>{children}</>;
}
