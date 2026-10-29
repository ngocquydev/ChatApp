"use client";

import { ReactNode, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import ResponsiveAppBar from "@/components/layout/AppBar";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useTranslation } from "@/i18n/useTranslation";

const FloatingChatDock = dynamic(() => import("@/components/chat/FloatingChatDock"), {
  ssr: false,
});

const FriendNoticeToast = dynamic(() => import("@/components/common/FriendNoticeToast"), {
  ssr: false,
});

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const { connectSocket } = useChatStore();
  const { fetchFriends, fetchRequests } = useFriendStore();
  const { fetchUnreadCount } = useNotificationStore();
  const { t } = useTranslation();

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
        {t("nav.skipToContent")}
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
