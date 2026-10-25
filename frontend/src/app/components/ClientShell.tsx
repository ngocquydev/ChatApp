"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/layout/AppBar";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import FloatingChatDock from "@/components/chat/FloatingChatDock";
import FriendNoticeToast from "@/components/common/FriendNoticeToast";

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const { connectSocket } = useChatStore();
  const { fetchFriends, fetchRequests } = useFriendStore();
  const { fetchUnreadCount } = useNotificationStore();

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
      fetchUnreadCount();
    }
  }, [isAuthenticated, user, connectSocket, fetchFriends, fetchRequests, fetchUnreadCount]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Bỏ qua điều hướng, tới nội dung chính
      </a>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      <main id="main-content" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </main>
      <FloatingChatDock />
      {isAuthenticated && <FriendNoticeToast />}
    </>
  );
}
