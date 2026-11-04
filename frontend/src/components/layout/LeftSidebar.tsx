"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Typography,
} from "@mui/material";
import {
  Users,
  Flag,
  MessageSquare,
  Clock,
  Bookmark,
  Video,
  Sparkles,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Layers,
  Store,
  Calendar,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { AURA_BOT_USER } from "@/constants/auraBot";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";
import { pagesApi, PageItem } from "@/services/pagesApi";
import { v } from "@/theme/tokens";

export interface NavShortcutItem {
  id: string;
  name: string;
  avatar?: string;
  href: string;
  type: "group" | "page";
  badge?: React.ReactNode;
}

interface SidebarNavItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  customIcon: React.ReactNode;
}

export default function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tr, t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [shortcuts, setShortcuts] = useState<NavShortcutItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      communityGroupsApi.getMyGroups().catch(() => [] as CommunityGroupItem[]),
      pagesApi.getMyPages().catch(() => [] as PageItem[]),
    ]).then(([myGroups, myPages]) => {
      if (!isMounted) return;
      const list: NavShortcutItem[] = [];
      const seenSlugs = new Set<string>();

      // 1. Nhóm người dùng tham gia hoặc làm quản trị viên
      for (const g of myGroups) {
        if (!seenSlugs.has(g.slug)) {
          seenSlugs.add(g.slug);
          list.push({
            id: `group-${g._id}`,
            name: g.name,
            avatar: g.avatar,
            href: `/groups/${g.slug}`,
            type: "group",
          });
        }
      }

      // 2. Trang Fanpage do người dùng quản lý
      for (const p of myPages) {
        if (!seenSlugs.has(p.slug)) {
          seenSlugs.add(p.slug);
          list.push({
            id: `page-${p._id}`,
            name: p.name,
            avatar: p.avatar,
            href: `/pages/${p.slug}`,
            type: "page",
          });
        }
      }

      setShortcuts(list);
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleOpenAura = () => {
    if (pathname === "/chat" || (typeof window !== "undefined" && window.innerWidth < 600)) {
      void useChatStore.getState().startConversationWithUser(AURA_BOT_USER).then((conv) => {
        if (conv) useChatStore.getState().selectConversation(conv);
      });
      if (pathname !== "/chat") router.push("/chat");
    } else {
      useChatBoxStore.getState().openChat(AURA_BOT_USER);
    }
  };

  // 8 mục chính Facebook (chuẩn theo Image 1)
  const navItems: SidebarNavItem[] = [
    {
      id: "profile",
      label: user?.name || t("sidebar.profile"),
      href: "/profile",
      customIcon: (
        <Avatar
          src={user?.avatar || ""}
          alt={user?.name || "User"}
          sx={{ width: 36, height: 36, fontSize: "0.95rem", fontWeight: 700 }}
        >
          {(user?.name || "U")[0].toUpperCase()}
        </Avatar>
      ),
    },
    {
      id: "aura",
      label: "Aura AI",
      onClick: handleOpenAura,
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${v.tone("a855f7")} 0%, ${v.tone("ec4899")} 50%, var(--mui-palette-primary-main) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
            boxShadow: "0 2px 8px rgba(168, 85, 247, 0.35)",
          }}
        >
          <Sparkles size={18} />
        </Box>
      ),
    },
    {
      id: "friends",
      label: t("sidebar.friends"),
      href: "/explore",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Users size={18} />
        </Box>
      ),
    },
    {
      id: "groups",
      label: t("sidebar.groups"),
      href: "/groups",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("0284c7"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Users size={18} />
        </Box>
      ),
    },
    {
      id: "memories",
      label: t("sidebar.memories"),
      href: "/profile",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("06b6d4"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Clock size={18} />
        </Box>
      ),
    },
    {
      id: "saved",
      label: t("sidebar.saved"),
      href: "/profile",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("c026d3"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Bookmark size={18} />
        </Box>
      ),
    },
    {
      id: "reels",
      label: t("sidebar.reels"),
      href: "/explore",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("e11d48"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Video size={18} />
        </Box>
      ),
    },
    {
      id: "marketplace",
      label: "Marketplace",
      href: "/explore",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("0284c7"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Store size={18} />
        </Box>
      ),
    },
  ];

  // Các mục mở rộng khi bấm "Xem thêm"
  const extendedItems: SidebarNavItem[] = [
    {
      id: "pages",
      label: t("sidebar.pages"),
      href: "/pages",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("ea580c"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Flag size={18} />
        </Box>
      ),
    },
    {
      id: "chat",
      label: t("sidebar.chats"),
      href: "/chat",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("8b5cf6"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <MessageSquare size={18} />
        </Box>
      ),
    },
    {
      id: "feeds",
      label: t("sidebar.feeds"),
      href: "/",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("d97706"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Layers size={18} />
        </Box>
      ),
    },
    {
      id: "events",
      label: t("sidebar.events"),
      href: "/groups",
      customIcon: (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: v.tone("059669"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: v.white,
          }}
        >
          <Calendar size={18} />
        </Box>
      ),
    },
  ];

  const visibleNav = showMore ? [...navItems, ...extendedItems] : navItems;

  return (
    <Box
      component="aside"
      aria-label={t("sidebar.navAria")}
      sx={{
        width: { md: 280, lg: 320, xl: 350 },
        position: "fixed",
        top: "64px",
        bottom: 0,
        left: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        overflowY: "auto",
        px: 1.5,
        py: 2,
        zIndex: 10,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        "&::-webkit-scrollbar": {
          width: 6,
        },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 3,
          bgcolor: "transparent",
        },
        "&:hover::-webkit-scrollbar-thumb": {
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Mục điều hướng chính */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {visibleNav.map((item) => {
          const isActive = item.href ? (item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)) : false;
          return (
            <ButtonBase
              key={item.id}
              component={item.href ? NextLink : "button"}
              href={item.href || undefined}
              onClick={item.onClick}
              aria-label={item.label}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                px: 1.5,
                py: 1,
                borderRadius: "10px",
                textAlign: "left",
                bgcolor: isActive ? "action.selected" : "transparent",
                color: isActive ? "primary.main" : "text.primary",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              {item.customIcon}
              <Typography
                variant="body2"
                noWrap
                sx={{
                  fontWeight: isActive ? 700 : 600,
                  fontSize: "0.93rem",
                  flex: 1,
                }}
              >
                {item.label}
              </Typography>
            </ButtonBase>
          );
        })}

        {/* Nút Xem thêm / Thu gọn */}
        <ButtonBase
          onClick={() => setShowMore((prev) => !prev)}
          aria-label={showMore ? t("sidebar.seeLess") : t("sidebar.seeMore")}
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 1.75,
            px: 1.5,
            py: 1,
            borderRadius: "10px",
            textAlign: "left",
            color: "text.primary",
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.primary",
            }}
          >
            {showMore ? <ChevronUpIcon size={20} /> : <ChevronDownIcon size={20} />}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: "0.93rem",
            }}
          >
            {showMore ? t("sidebar.seeLess") : t("sidebar.seeMore")}
          </Typography>
        </ButtonBase>
      </Box>

      {/* Mục Lối tắt của bạn (chỉ hiển thị khi có nhóm/trang thực tế) */}
      {shortcuts.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                px: 1.5,
                py: 0.75,
                fontSize: "0.85rem",
                letterSpacing: "0.01em",
              }}
            >
              {t("sidebar.yourShortcuts")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {shortcuts.map((sc) => {
                const isActive = pathname === sc.href;
                return (
                  <ButtonBase
                    key={sc.id}
                    component={NextLink}
                    href={sc.href}
                    aria-label={sc.name}
                    sx={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 1.5,
                      py: 0.85,
                      borderRadius: "10px",
                      textAlign: "left",
                      bgcolor: isActive ? "action.selected" : "transparent",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    {sc.avatar ? (
                      <Avatar
                        src={sc.avatar}
                        variant="rounded"
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          flexShrink: 0,
                        }}
                      />
                    ) : sc.badge ? (
                      <Box sx={{ flexShrink: 0 }}>{sc.badge}</Box>
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "8px",
                          bgcolor: sc.type === "group" ? "primary.main" : v.tone("ea580c"),
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {sc.name[0]?.toUpperCase() || "S"}
                      </Avatar>
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isActive ? 700 : 600,
                        fontSize: "0.88rem",
                        lineHeight: 1.3,
                        color: isActive ? "primary.main" : "text.primary",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flex: 1,
                      }}
                    >
                      {sc.name}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
        </>
      )}

      {/* Footer bản quyền */}
      <Box sx={{ pt: 2, px: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.75rem", lineHeight: 1.5 }}>
          {tr("Quyền riêng tư · Điều khoản · ChatApp © 2026", "Privacy · Terms · ChatApp © 2026")}
        </Typography>
      </Box>
    </Box>
  );
}
