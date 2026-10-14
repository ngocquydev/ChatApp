"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/layout/AppBar";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const { connectSocket } = useChatStore();
  const { fetchFriends, fetchRequests } = useFriendStore();

  const hideAppBarRoutes = ["/login", "/register", "/forgot-password"];
  const shouldHideAppBar = hideAppBarRoutes.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
      fetchFriends();
      fetchRequests();
    }
  }, [isAuthenticated, user, connectSocket, fetchFriends, fetchRequests]);

  return (
    <>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      {children}
    </>
  );
}
