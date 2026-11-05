"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasSession = mounted
    ? (typeof window !== "undefined" && localStorage.getItem("has_session") === "true")
    : true;

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated && (!hasSession || !isCheckingAuth)) {
        router.replace("/login");
      }
    }
  }, [mounted, isAuthenticated, hasSession, isCheckingAuth, router]);

  // Khi chưa mount (SSR và lượt hydrate đầu tiên ở client),
  // luôn đồng bộ render children để tránh Hydration Mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  // Khi đã mount ở client, nếu xác định không có session hoặc đã check xong mà chưa auth -> chặn render
  if (!isAuthenticated && (!hasSession || !isCheckingAuth)) {
    return null;
  }

  // Cho phép render nội dung (layout + skeleton) để tránh chặn LCP và cho phép API con tải song song
  return <>{children}</>;
}
