"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Breadcrumbs,
  Chip,
} from "@mui/material";
import { Menu, ShieldCheck, ChevronRight } from "lucide-react";
import AdminGuard from "@/components/common/AdminGuard";
import ColorModeToggle from "@/components/common/ColorModeToggle";
import LanguageToggle from "@/components/common/LanguageToggle";
import AdminSidebar from "./AdminSidebar";
import { useTranslation } from "@/i18n/useTranslation";

interface AdminLayoutProps {
  children: ReactNode;
}

const SIDEBAR_WIDTH = 260;

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { isEnglish: isEn } = useTranslation();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const getSectionTitle = () => {
    if (pathname === "/admin") return isEn ? "System Overview" : "Tổng quan hệ thống";
    if (pathname?.startsWith("/admin/users")) return isEn ? "User Management" : "Quản lý người dùng";
    if (pathname?.startsWith("/admin/posts")) return isEn ? "Post Moderation" : "Kiểm duyệt bài viết";
    if (pathname?.startsWith("/admin/moderation")) return isEn ? "AI Moderation" : "Kiểm duyệt AI & Bot";
    if (pathname?.startsWith("/admin/security")) return isEn ? "Security & WAF" : "Trung tâm bảo mật & WAF";
    if (pathname?.startsWith("/admin/system")) return isEn ? "System Health" : "Sức khỏe hệ thống";
    return isEn ? "Administration" : "Khu vực quản trị";
  };

  return (
    <AdminGuard>
      <Box
        sx={{
          display: "flex",
          height: { xs: "calc(100dvh - 56px)", md: "calc(100dvh - 64px)" },
          width: "100%",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        {/* Desktop Sidebar: Cột cố định bên trái (260px) */}
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            display: { xs: "none", md: "block" },
            borderRight: "1px solid",
            borderColor: "divider",
            height: "100%",
          }}
        >
          <AdminSidebar />
        </Box>

        {/* Mobile Drawer Sidebar */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: SIDEBAR_WIDTH,
            },
          }}
        >
          <AdminSidebar onItemClick={() => setMobileOpen(false)} />
        </Drawer>

        {/* Cột bên phải: Header & Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Top Admin Sub-Header */}
          <Box
            component="header"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: { xs: 2, sm: 3 },
              py: 1.2,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              minHeight: 48,
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              <IconButton
                color="inherit"
                aria-label={isEn ? "Open navigation menu" : "Mở menu quản trị"}
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ display: { md: "none" } }}
              >
                <Menu size={20} />
              </IconButton>

              <Breadcrumbs
                separator={<ChevronRight size={14} aria-hidden />}
                aria-label="Breadcrumb"
                sx={{
                  "& .MuiBreadcrumbs-li": { fontSize: "0.85rem" },
                  display: { xs: "none", sm: "flex" },
                }}
              >
                <Typography color="text.secondary" sx={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  Admin
                </Typography>
                <Typography color="text.primary" sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {getSectionTitle()}
                </Typography>
              </Breadcrumbs>

              <Typography
                variant="subtitle2"
                noWrap
                sx={{
                  display: { xs: "block", sm: "none" },
                  fontWeight: 700,
                }}
              >
                {getSectionTitle()}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<ShieldCheck size={14} aria-hidden />}
                label={isEn ? "Protected" : "Bảo vệ đa tầng"}
                size="small"
                color="success"
                variant="outlined"
                sx={{
                  height: 24,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  display: { xs: "none", sm: "inline-flex" },
                }}
              />
              <LanguageToggle />
              <ColorModeToggle />
            </Box>
          </Box>

          {/* Vùng nội dung chính (Scrollable) */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              p: { xs: 2, sm: 3, md: 3.5 },
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </AdminGuard>
  );
}
