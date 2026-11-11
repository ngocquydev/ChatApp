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
    ? typeof window !== "undefined" &&
      localStorage.getItem("has_session") === "true"
    : true;

  useEffect(() => {
    if (mounted) {
      if (!isAuthenticated && (!hasSession || !isCheckingAuth)) {
        router.replace("/login");
      }
    }
  }, [mounted, isAuthenticated, hasSession, isCheckingAuth, router]);
  if (!mounted) {
    return <>{children}</>;
  }
  if (!isAuthenticated && (!hasSession || !isCheckingAuth)) {
    return null;
  }
  return <>{children}</>;
}
