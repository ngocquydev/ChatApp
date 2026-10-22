"use client";

import { usePathname } from "next/navigation";
import { Box } from "@mui/material";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import FloatingChatBox from "./FloatingChatBox";

export default function FloatingChatDock() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { openBoxes, closeChat, toggleMinimize } = useChatBoxStore();

  // Không hiển thị khi chưa đăng nhập hoặc trên trang chat toàn màn hình / auth
  if (!isAuthenticated || !user) return null;
  if (pathname === "/chat") return null;

  const authRoutes = ["/login", "/register", "/forgot-password"];
  if (authRoutes.some((route) => pathname === route || pathname?.startsWith(`${route}/`))) {
    return null;
  }

  if (openBoxes.length === 0) return null;

  const isHomePage = pathname === "/";

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        // Khi ở trang chủ có thanh PersonCall bên phải (25% trên md, 20% trên lg)
        // Dock sẽ nằm ngay sát bên trái của PersonCall trên Desktop y hệt Facebook
        right: isHomePage
          ? {
              xs: 8,
              sm: 16,
              md: "calc(25% + 16px)",
              lg: "calc(20% + 20px)",
            }
          : {
              xs: 8,
              sm: 16,
              md: 24,
            },
        display: "flex",
        flexDirection: "row-reverse", // Hộp mới mở nằm sát phải nhất
        alignItems: "flex-end",
        gap: 1.5,
        zIndex: 1250,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {openBoxes.map((session) => (
        <FloatingChatBox
          key={session.user._id || session.user.id}
          session={session}
          onClose={() => closeChat(String(session.user._id || session.user.id))}
          onToggleMinimize={() =>
            toggleMinimize(String(session.user._id || session.user.id))
          }
        />
      ))}
    </Box>
  );
}
