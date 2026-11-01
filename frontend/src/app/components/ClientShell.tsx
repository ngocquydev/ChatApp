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

const CallModal = dynamic(() => import("@/components/chat/call/CallModal"), {
  ssr: false,
});

// Hộp thoại xác minh khi WAF yêu cầu (Under Attack Mode) — tải khi cần
const WafChallengeDialog = dynamic(() => import("@/components/common/WafChallengeDialog"), {
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

  const isAdmin = user?.role === "admin";
  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));

  const hideAppBarRoutes = ["/login", "/register", "/forgot-password", "/admin"];
  const shouldHideAppBar =
    isAdmin ||
    isAdminRoute ||
    hideAppBarRoutes.some(
      (route) => pathname === route || pathname?.startsWith(`${route}/`)
    );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    // Chỉ kết nối socket và nạp thông tin mạng xã hội cho người dùng thông thường, không áp dụng cho admin
    if (isAuthenticated && user && user.role !== "admin") {
      connectSocket();
      fetchFriends();
      fetchRequests();
      fetchUnreadCount();
    }
  }, [isAuthenticated, user, connectSocket, fetchFriends, fetchRequests, fetchUnreadCount]);

  const showSocialWidgets = isAuthenticated && !isAdmin && !isAdminRoute;

  return (
    <>
      <a href="#main-content" className="skip-link" suppressHydrationWarning>
        {t("nav.skipToContent")}
      </a>
      {!shouldHideAppBar && <ResponsiveAppBar />}
      <main id="main-content" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </main>
      {showSocialWidgets && <FloatingChatDock />}
      {showSocialWidgets && <FriendNoticeToast />}
      {showSocialWidgets && <CallModal />}
      <WafChallengeDialog />
    </>
  );
}
