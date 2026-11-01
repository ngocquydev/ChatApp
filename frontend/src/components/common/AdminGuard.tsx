"use client";

import { ReactNode } from "react";
import { Box, Button } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import AuthGuard from "./AuthGuard";
import EmptyState from "./EmptyState";
import { useAuthStore } from "@/store/useAuthStore";
import { APP_BAR_HEIGHT } from "@/theme/tokens";
import { useTranslation } from "@/i18n/useTranslation";

/**
 * Chỉ hiển thị nội dung cho admin. Đây chỉ là lớp hiển thị — backend vẫn kiểm tra quyền
 * (JwtAuthGuard + RolesGuard) ở mọi API quản trị.
 */
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { tr } = useTranslation();
  const { user, isCheckingAuth } = useAuthStore();

  return (
    <AuthGuard>
      {isCheckingAuth || !user ? null : user.role === "admin" ? (
        children
      ) : (
        <Box sx={{ pt: `${APP_BAR_HEIGHT + 24}px` }}>
          {/* Mỗi trang đúng một <h1> — ẩn khỏi mắt, vẫn đọc được bằng trình đọc màn hình */}
          <Box component="h1" sx={visuallyHidden}>
            {tr("Trung tâm bảo mật", "Security center")}
          </Box>
          <EmptyState
            icon={<ShieldOff size={32} />}
            title={tr("Bạn không có quyền truy cập", "You don't have access")}
            description={tr("Trang này chỉ dành cho quản trị viên.", "This page is for administrators only.")}
            action={
              <Button component={Link} href="/" variant="contained">
                {tr("Về trang chủ", "Go home")}
              </Button>
            }
          />
        </Box>
      )}
    </AuthGuard>
  );
}

