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
    if (!isAuthenticated && !isCheckingAuth) {
      router.replace("/login");
    }
  }, [isAuthenticated, isCheckingAuth, router]);
  if (!isAuthenticated && isCheckingAuth) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }
  return <>{children}</>;
}
