"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import {
  LayoutDashboard,
  Users,
  FileText,
  Bot,
  ShieldAlert,
  Cpu,
  LogOut,
} from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useTranslation } from "@/i18n/useTranslation";

interface NavItem {
  href: string;
  labelVi: string;
  labelEn: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    labelVi: "Tổng quan",
    labelEn: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/users",
    labelVi: "Người dùng",
    labelEn: "Users",
    icon: Users,
  },
  {
    href: "/posts",
    labelVi: "Bài viết",
    labelEn: "Posts",
    icon: FileText,
  },
  {
    href: "/moderation",
    labelVi: "Kiểm duyệt AI",
    labelEn: "AI Moderation",
    icon: Bot,
  },
  {
    href: "/security",
    labelVi: "Bảo mật & WAF",
    labelEn: "Security & WAF",
    icon: ShieldAlert,
  },
  {
    href: "/system",
    labelVi: "Hệ thống & Dịch vụ",
    labelEn: "System Health",
    icon: Cpu,
  },
];

interface AdminSidebarProps {
  onItemClick?: () => void;
}

export default function AdminSidebar({ onItemClick }: AdminSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout } = useAdminAuthStore();
  const { isEnglish: isEn } = useTranslation();

  const handleLogout = async () => {
    if (onItemClick) onItemClick();
    await logout();
    navigate("/login");
  };

  const isItemActive = (item: NavItem) => {
    if (item.exact) { return pathname === item.href || (item.href === "/" && pathname === "/admin"); }
    return pathname.startsWith(item.href);
  };

  return (
    <Box
      component="aside"
      aria-label={isEn ? "Admin navigation" : "Danh mục quản trị"}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* Header khu vực quản trị */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <BrandLogo href="/admin" size={36} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{ fontWeight: 700, lineHeight: 1.2 }}
          >
            {isEn ? "Administration" : "Trang Quản trị"}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.3 }}>
            <Chip
              label="Admin"
              size="small"
              color="primary"
              sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.72rem" }}
            >
              Control Panel
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Danh sách mục điều hướng */}
      <Box sx={{ flexGrow: 1, py: 1.5, px: 1, overflowY: "auto" }}>
        <List component="nav" disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const IconComponent = item.icon;
            const label = isEn ? item.labelEn : item.labelVi;

            return (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.href}
                  selected={active}
                  onClick={onItemClick}
                  sx={{
                    borderRadius: "10px",
                    px: 1.5,
                    py: 1.1,
                    transition: "all 0.15s ease",
                    "&.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontWeight: 600,
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                      "& .MuiListItemIcon-root": {
                        color: "inherit",
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: active ? "inherit" : "text.secondary",
                    }}
                  >
                    <IconComponent size={20} aria-hidden />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: "0.9rem", fontWeight: active ? 700 : 500 }}>
                        {label}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider />

      {/* Footer quản trị: Thông tin Admin & Đăng xuất */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: "8px",
            px: 1.5,
            py: 0.8,
            color: "error.main",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "error.main" }}>
            <LogOut size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {isEn ? "Sign out" : "Đăng xuất"}
              </Typography>
            }
          />
        </ListItemButton>

        {user && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              p: 1,
              borderRadius: "10px",
              bgcolor: "action.hover",
            }}
          >
            <PresenceAvatar
              src={user.avatar}
              name={user.name}
              online
              size={36}
            />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                <Chip
                  label="ADMIN"
                  size="small"
                  color="error"
                  sx={{ height: 16, fontSize: "0.6rem", fontWeight: 800 }}
                />
              </Box>
              <Typography variant="caption" noWrap color="text.secondary" sx={{ display: "block" }}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
