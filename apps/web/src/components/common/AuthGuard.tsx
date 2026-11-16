"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import SessionLoadingScreen from "@/components/common/SessionLoadingScreen";

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
  if (!isAuthenticated) {
    return <SessionLoadingScreen redirecting={!isCheckingAuth} />;
  }
  return <>{children}</>;
}
