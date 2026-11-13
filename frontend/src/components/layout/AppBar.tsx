"use client";

import { useShallow } from "zustand/react/shallow";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  TextField,
  InputAdornment,
  Popover,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Popper,
  Paper,
  ClickAwayListener,
  CircularProgress,
  LinearProgress,
  Badge,
  Chip,
  ButtonBase,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search,
  Home,
  Compass,
  MessageSquare,
  UserPlus,
  X,
  Clock,
  Check,
  UserCheck,
  ShieldCheck,
  Flag,
  Users,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";
import BrandLogo from "../common/BrandLogo";
import ColorModeToggle from "../common/ColorModeToggle";
import LanguageToggle from "../common/LanguageToggle";
import { useTranslation } from "@/i18n/useTranslation";
import NotificationBell from "../notifications/NotificationBell";
import RecentChatsPopover from "./RecentChatsPopover";
import UserSearchResults, { SEARCH_PREVIEW_COUNT } from "./UserSearchResults";
import type { NavShortcutItem } from "./LeftSidebar";
import {
  communityGroupsApi,
  CommunityGroupItem,
} from "@/services/communityGroupsApi";
import { pagesApi, PageItem } from "@/services/pagesApi";

const SEARCH_PAGE_SIZE = 20;

interface NavPage {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
}

function ResponsiveAppBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [chatAnchorEl, setChatAnchorEl] = useState<null | HTMLElement>(null);
  const [friendAnchorEl, setFriendAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore(useShallow((state) => ({
    user: state.user,
    logout: state.logout,
  })));
  const { t, tr, language } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);

  const {
    searchResults,
    isSearching,
    isSearchingMore,
    searchHasMore,
    searchError,
    searchUsers,
    loadMoreSearchResults,
    clearSearchResults,
    sendFriendRequest,
    cancelRequest,
    respondToRequest,
    receivedRequests,
    isLoadingRequests,
    fetchRequests,
  } = useFriendStore(useShallow((state) => ({
    searchResults: state.searchResults,
    isSearching: state.isSearching,
    isSearchingMore: state.isSearchingMore,
    searchHasMore: state.searchHasMore,
    searchError: state.searchError,
    searchUsers: state.searchUsers,
    loadMoreSearchResults: state.loadMoreSearchResults,
    clearSearchResults: state.clearSearchResults,
    sendFriendRequest: state.sendFriendRequest,
    cancelRequest: state.cancelRequest,
    respondToRequest: state.respondToRequest,
    receivedRequests: state.receivedRequests,
    isLoadingRequests: state.isLoadingRequests,
    fetchRequests: state.fetchRequests,
  })));

  const {
    conversations,
    fetchConversations,
    startConversationWithUser,
    connectSocket,
  } = useChatStore(useShallow((state) => ({
    conversations: state.conversations,
    fetchConversations: state.fetchConversations,
    startConversationWithUser: state.startConversationWithUser,
    connectSocket: state.connectSocket,
  })));

  const [drawerShortcuts, setDrawerShortcuts] = useState<NavShortcutItem[]>([]);

  useEffect(() => {
    if (!user) {
      setDrawerShortcuts([]);
      return;
    }
    let isMounted = true;
    Promise.all([
      communityGroupsApi.getMyGroups().catch(() => [] as CommunityGroupItem[]),
      pagesApi.getMyPages().catch(() => [] as PageItem[]),
    ]).then(([myGroups, myPages]) => {
      if (!isMounted) return;
      const list: NavShortcutItem[] = [];
      const seenSlugs = new Set<string>();
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
      setDrawerShortcuts(list);
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      connectSocket();
      fetchConversations();
      fetchRequests();
    }
  }, [user, connectSocket, fetchConversations, fetchRequests]);

  // Debounced search khi gõ trên thanh tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearchOpen(false);
      return;
    }
    setIsSearchOpen(true);
    const timer = setTimeout(() => {
      // Trang đầu chỉ lấy vài kết quả cho nhanh; phần còn lại tải khi người dùng bấm "Xem tất cả"
      searchUsers(searchQuery, { limit: SEARCH_PREVIEW_COUNT });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) =>
    setAnchorElUser(event.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const isChatOpen = Boolean(chatAnchorEl);

  const handleOpenChat = (event: MouseEvent<HTMLElement>) => {
    fetchConversations();
    setChatAnchorEl(event.currentTarget);
  };
  const handleCloseChat = () => setChatAnchorEl(null);

  const isFriendOpen = Boolean(friendAnchorEl);

  const handleOpenFriend = (event: MouseEvent<HTMLElement>) => {
    fetchRequests();
    setFriendAnchorEl(event.currentTarget);
  };
  const handleCloseFriend = () => setFriendAnchorEl(null);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  const settings = [
    { label: user?.name ? `${user.name}` : t("nav.profile"), disabled: true },
    {
      label: t("nav.profile"),
      action: () => {
        router.push("/profile");
      },
    },
    {
      label: t("nav.settings"),
      action: () => {
        router.push("/profile");
      },
    },
    {
      label: t("nav.logout"),
      action: () => {
        handleLogout();
      },
    },
  ];

  const desktopTabs: NavPage[] = [
    { id: "home", label: t("nav.home"), icon: <Home size={22} />, href: "/" },
    {
      id: "explore",
      label: t("nav.explore"),
      icon: <Compass size={22} />,
      href: "/explore",
    },
    {
      id: "groups",
      label: t("nav.groups"),
      icon: <Users size={22} />,
      href: "/groups",
    },
    {
      id: "pages",
      label: t("nav.pages"),
      icon: <Flag size={22} />,
      href: "/pages",
    },
  ];

  const drawerPages: NavPage[] = [
    { id: "home", label: t("nav.home"), icon: <Home size={20} />, href: "/" },
    {
      id: "explore",
      label: t("nav.explore"),
      icon: <Compass size={20} />,
      href: "/explore",
    },
    {
      id: "groups",
      label: t("nav.groups"),
      icon: <Users size={20} />,
      href: "/groups",
    },
    {
      id: "pages",
      label: t("nav.pages"),
      icon: <Flag size={20} />,
      href: "/pages",
    },
    {
      id: "friends",
      label: t("nav.friends"),
      icon: <UserPlus size={20} />,
    },
    {
      id: "chat",
      label: t("nav.messages"),
      icon: <MessageSquare size={20} />,
      href: "/chat",
    },
  ];

  return (
    <>
      {/* AppBar luôn tối ở cả hai scheme → ghim biến màu về scheme sáng (data-light) */}
      <AppBar position="fixed" data-light="">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 1.5, md: 2 } }}>
            {/* Logo Desktop */}
            <Box
              sx={{ display: { xs: "none", md: "flex" }, mr: 1, flexShrink: 0 }}
            >
              <BrandLogo />
            </Box>

            {/* Nút Hamburger bật Drawer trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label={tr("Mở menu điều hướng", "Open navigation menu")}
                aria-expanded={mobileOpen}
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon size={22} />
              </IconButton>
            </Box>

            {/* Logo Mobile (chỉ biểu tượng để nhường chỗ cho ô tìm kiếm) */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <BrandLogo iconOnly size={34} />
            </Box>

            {/* Thanh Search Real-Time Toàn Hệ Thống */}
            <Box
              ref={searchAnchorRef}
              sx={{
                flexGrow: 1,
                maxWidth: { xs: "100%", md: 280, lg: 340, xl: 400 },
                position: "relative",
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={t("nav.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchExpanded(false);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                variant="outlined"
                slotProps={{
                  htmlInput: {
                    "aria-label": tr("Tìm kiếm người dùng", "Search users"),
                  },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label={tr(
                            "Xóa nội dung tìm kiếm",
                            "Clear search",
                          )}
                          onClick={() => {
                            setSearchQuery("");
                            setSearchExpanded(false);
                            setIsSearchOpen(false);
                            clearSearchResults();
                          }}
                          sx={{ color: "rgba(255, 255, 255, 0.8)", p: 0.5 }}
                        >
                          <X size={16} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: {
                      color: "white",
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: 2,
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.25)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        border: "none",
                      },
                    },
                  },
                }}
              />

              {/* Dropdown kết quả: xem trước vài kết quả; "Xem tất cả" → hiện hết + cuộn vô hạn */}
              <Popper
                open={isSearchOpen}
                anchorEl={searchAnchorRef.current}
                placement="bottom-start"
                style={{
                  zIndex: 1400,
                  width: searchAnchorRef.current?.clientWidth || 380,
                }}
              >
                <ClickAwayListener onClickAway={() => setIsSearchOpen(false)}>
                  <Paper
                    elevation={8}
                    sx={{
                      mt: 1,
                      borderRadius: 2,
                      overflow: "hidden",
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <UserSearchResults
                      query={searchQuery}
                      results={searchResults}
                      isSearching={isSearching}
                      isSearchingMore={isSearchingMore}
                      hasMore={searchHasMore}
                      error={searchError}
                      expanded={searchExpanded}
                      onExpand={() => {
                        setSearchExpanded(true);
                        loadMoreSearchResults(SEARCH_PAGE_SIZE);
                      }}
                      onLoadMore={() => loadMoreSearchResults(SEARCH_PAGE_SIZE)}
                      onRetry={() =>
                        searchResults.length > 0
                          ? loadMoreSearchResults(SEARCH_PAGE_SIZE)
                          : searchUsers(searchQuery, {
                              limit: SEARCH_PREVIEW_COUNT,
                            })
                      }
                      onSendRequest={(id) => {
                        void sendFriendRequest(id);
                      }}
                      onCancelRequest={(requestId) => {
                        void cancelRequest(requestId);
                      }}
                      onRespond={(requestId, action) => {
                        void respondToRequest(requestId, action);
                      }}
                      onMessage={async (target) => {
                        setIsSearchOpen(false);
                        await startConversationWithUser(target);
                        router.push("/chat");
                      }}
                    />
                  </Paper>
                </ClickAwayListener>
              </Popper>
            </Box>

            {/* Menu điều hướng icon tabs Facebook ở giữa */}
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                justifyContent: "center",
                gap: { md: 0.5, lg: 1.5 },
                mx: { md: 1, lg: 2 },
                height: "100%",
              }}
            >
              {desktopTabs.map((tab) => {
                const isActive = Boolean(
                  tab.href &&
                  (tab.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(tab.href)),
                );
                return (
                  <Tooltip key={tab.id} title={tab.label} enterDelay={300}>
                    <ButtonBase
                      aria-label={tab.label}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => {
                        if (tab.href) router.push(tab.href);
                      }}
                      sx={{
                        width: { md: 72, lg: 96, xl: 112 },
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "10px",
                        position: "relative",
                        color: isActive
                          ? "var(--mui-palette-brand-400)"
                          : "rgba(255, 255, 255, 0.75)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.12)",
                          color: "white",
                        },
                        "&::after": isActive
                          ? {
                              content: '""',
                              position: "absolute",
                              bottom: 0,
                              left: "8%",
                              right: "8%",
                              height: "3px",
                              bgcolor: "var(--mui-palette-brand-400)",
                              borderRadius: "3px 3px 0 0",
                            }
                          : undefined,
                      }}
                    >
                      {tab.icon}
                    </ButtonBase>
                  </Tooltip>
                );
              })}
            </Box>

            {/* Nút Lời mời kết bạn, Tin nhắn & Thông báo nhanh trên Mobile */}
            <Box
              sx={{
                display: { xs: "flex", md: "none" },
                alignItems: "center",
                gap: 0.5,
                mr: 1,
              }}
            >
              <NotificationBell />

              <IconButton
                color="inherit"
                size="small"
                onClick={handleOpenFriend}
                aria-label={t("nav.friendRequests")}
              >
                <Badge
                  color="error"
                  badgeContent={receivedRequests.length}
                  max={99}
                  invisible={receivedRequests.length === 0}
                >
                  <UserPlus size={20} />
                </Badge>
              </IconButton>

              <IconButton
                color="inherit"
                size="small"
                onClick={handleOpenChat}
                aria-label={t("nav.chats")}
              >
                <Badge
                  color="error"
                  variant="dot"
                  invisible={
                    !conversations.some(
                      (c) =>
                        c.unreadCounts &&
                        Number(
                          c.unreadCounts[String(user?.id || user?._id)] || 0,
                        ) > 0,
                    )
                  }
                >
                  <MessageSquare size={20} />
                </Badge>
              </IconButton>
            </Box>

            {/* Nút Lời mời kết bạn trên Desktop */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <Tooltip title={t("nav.friendRequests")}>
                <IconButton
                  color="inherit"
                  onClick={handleOpenFriend}
                  aria-label={t("nav.friendRequests")}
                  sx={{
                    bgcolor: isFriendOpen
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(255, 255, 255, 0.1)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.22)" },
                  }}
                >
                  <Badge
                    color="error"
                    badgeContent={receivedRequests.length}
                    max={99}
                    invisible={receivedRequests.length === 0}
                  >
                    <UserPlus size={20} />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Box>

            {/* Nút Messenger / Đoạn chat trên Desktop */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <Tooltip title={t("nav.chats")}>
                <IconButton
                  color="inherit"
                  onClick={handleOpenChat}
                  aria-label={t("nav.chats")}
                  sx={{
                    bgcolor: isChatOpen
                      ? "rgba(255, 255, 255, 0.2)"
                      : "rgba(255, 255, 255, 0.1)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.22)" },
                  }}
                >
                  <Badge
                    color="error"
                    variant="dot"
                    invisible={
                      !conversations.some(
                        (c) =>
                          c.unreadCounts &&
                          Number(
                            c.unreadCounts[String(user?.id || user?._id)] || 0,
                          ) > 0,
                      )
                    }
                  >
                    <MessageSquare size={20} />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Box>

            {/* Chuông thông báo trên Desktop */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <NotificationBell />
            </Box>

            {/* Đổi ngôn ngữ VI / EN */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <LanguageToggle />
            </Box>

            {/* Đổi giao diện sáng/tối (mobile: nằm trong Drawer) */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <ColorModeToggle />
            </Box>

            {/* Avatar User */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title={tr("Mở cài đặt", "Open settings")}>
                <IconButton
                  onClick={handleOpenUserMenu}
                  aria-label={tr("Mở menu tài khoản", "Open account menu")}
                  aria-haspopup="menu"
                  aria-controls="menu-appbar-user"
                  sx={{
                    p: 0.25,
                    border: pathname?.startsWith("/profile")
                      ? "2px solid rgba(255, 255, 255, 0.9)"
                      : "2px solid transparent",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <Avatar
                    alt={user?.name || "User Avatar"}
                    src={user?.avatar || ""}
                  >
                    {(user?.name || "U")[0].toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar-user"
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                keepMounted
                disableScrollLock
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                {settings.map((setting, index) => (
                  <MenuItem
                    key={index}
                    disabled={setting.disabled}
                    onClick={() => {
                      if (setting.action) setting.action();
                      else handleCloseUserMenu();
                    }}
                  >
                    <Typography sx={{ textAlign: "center" }}>
                      {setting.label}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>

              {/* Popover Lời mời kết bạn */}
              <Popover
                open={isFriendOpen}
                anchorEl={friendAnchorEl}
                onClose={handleCloseFriend}
                disableScrollLock
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                slotProps={{
                  paper: {
                    sx: {
                      width: { xs: 320, sm: 380 },
                      maxHeight: 480,
                      borderRadius: 2.5,
                      boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.18)",
                      mt: 1,
                      overflow: "hidden",
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    px: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--mui-palette-neutral-200)",
                    bgcolor: "var(--mui-palette-neutral-50)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        color: "var(--mui-palette-neutral-800)",
                        fontSize: "0.92rem",
                      }}
                    >
                      {t("nav.friendRequests")}
                    </Typography>
                    {receivedRequests.length > 0 && (
                      <Chip
                        label={receivedRequests.length}
                        size="small"
                        color="error"
                        sx={{
                          height: 20,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>
                  <ButtonBase
                    onClick={() => {
                      handleCloseFriend();
                      router.push("/explore");
                    }}
                    sx={{
                      color: "primary.main",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: 1,
                      px: 0.5,
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {tr("Xem tất cả", "See all")}
                  </ButtonBase>
                </Box>

                <Box sx={{ overflowY: "auto", maxHeight: 390, p: 0.5 }}>
                  {isLoadingRequests && receivedRequests.length === 0 ? (
                    <Box
                      sx={{ display: "flex", justifyContent: "center", py: 5 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : receivedRequests.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 5, px: 3 }}>
                      <UserCheck
                        size={40}
                        color="var(--mui-palette-neutral-400)"
                        style={{ marginBottom: 10 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "var(--mui-palette-neutral-600)",
                          mb: 0.5,
                        }}
                      >
                        {t("nav.noFriendRequests")}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "var(--mui-palette-neutral-400)",
                          display: "block",
                        }}
                      >
                        {t("nav.noFriendRequestsDesc")}
                      </Typography>
                    </Box>
                  ) : (
                    receivedRequests.map((req) => {
                      const requester = req.requesterId;
                      const timeAgo = req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString(
                            language === "en" ? "en-US" : "vi-VN",
                            {
                              month: "numeric",
                              day: "numeric",
                            },
                          )
                        : "";

                      return (
                        <Box
                          key={req._id}
                          sx={{
                            p: 1.5,
                            borderRadius: "10px",
                            mb: 0.5,
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                            transition: "all 0.15s ease",
                            "&:hover": {
                              bgcolor: "var(--mui-palette-neutral-100)",
                            },
                          }}
                        >
                          <Avatar
                            src={requester?.avatar || ""}
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: "var(--mui-palette-brand-500)",
                              fontWeight: 700,
                              mt: 0.2,
                            }}
                          >
                            {(requester?.name || "U")[0].toUpperCase()}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                                mb: 0.3,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                noWrap
                                sx={{
                                  fontWeight: 700,
                                  color: "var(--mui-palette-neutral-800)",
                                  fontSize: "0.88rem",
                                }}
                              >
                                {requester?.name || tr("Người dùng", "User")}
                              </Typography>
                              {timeAgo && (
                                <Typography
                                  variant="caption"
                                  suppressHydrationWarning
                                  sx={{
                                    color: "var(--mui-palette-neutral-400)",
                                    fontSize: "0.7rem",
                                    ml: 1,
                                  }}
                                >
                                  {timeAgo}
                                </Typography>
                              )}
                            </Box>

                            <Typography
                              variant="caption"
                              noWrap
                              sx={{
                                color: "var(--mui-palette-neutral-500)",
                                display: "block",
                                fontSize: "0.74rem",
                                mb: 1,
                              }}
                            >
                              {requester?.bio ||
                                tr(
                                  "Đã gửi lời mời kết bạn",
                                  "Sent you a friend request",
                                )}
                            </Typography>

                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={async () => {
                                  await respondToRequest(req._id, "accept");
                                }}
                                startIcon={<Check size={13} />}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  py: 0.4,
                                  px: 1.2,
                                  borderRadius: "8px",
                                  boxShadow: "none",
                                }}
                              >
                                {tr("Xác nhận", "Confirm")}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                onClick={async () => {
                                  await respondToRequest(req._id, "reject");
                                }}
                                startIcon={<X size={13} />}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.75rem",
                                  py: 0.4,
                                  px: 1,
                                  borderRadius: "8px",
                                  color: "var(--mui-palette-neutral-500)",
                                  borderColor: "var(--mui-palette-neutral-300)",
                                  "&:hover": {
                                    bgcolor: "var(--mui-palette-tone-fef2f2)",
                                    color: "var(--mui-palette-tone-ef4444)",
                                    borderColor:
                                      "var(--mui-palette-tone-fca5a5)",
                                  },
                                }}
                              >
                                {tr("Xóa", "Delete")}
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Popover>

              {/* Popover Đoạn chat Messenger */}
              <RecentChatsPopover
                anchorEl={chatAnchorEl}
                currentUserId={String(user?.id || user?._id || "")}
                onClose={handleCloseChat}
              />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 260,
            zIndex: 999,
          },
        }}
      >
        <Box
          data-light=""
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            bgcolor: "var(--mui-palette-tone-0f172a)",
            color: "var(--mui-palette-common-white)",
          }}
        >
          <BrandLogo href="" size={32} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LanguageToggle size="small" />
            <ColorModeToggle />
            <IconButton
              onClick={handleDrawerToggle}
              aria-label={tr("Đóng menu", "Close menu")}
              sx={{ color: "inherit" }}
            >
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
        <Divider />
        <List>
          {drawerPages.map((page) => {
            const isActive = Boolean(
              page.href &&
              (page.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(page.href)),
            );
            return (
              <ListItem key={page.id} disablePadding>
                <ListItemButton
                  selected={isActive}
                  onClick={(e) => {
                    handleDrawerToggle();

                    if (page.id === "chat") {
                      handleOpenChat(e);
                    } else if (page.id === "friends") {
                      handleOpenFriend(e);
                    } else if (page.href) {
                      router.push(page.href);
                    }
                  }}
                >
                  <ListItemIcon>
                    {page.id === "friends" ? (
                      <Badge
                        color="error"
                        badgeContent={receivedRequests.length}
                        max={99}
                        invisible={receivedRequests.length === 0}
                      >
                        {page.icon}
                      </Badge>
                    ) : page.id === "chat" ? (
                      <Badge
                        color="error"
                        variant="dot"
                        invisible={
                          !conversations.some(
                            (c) =>
                              c.unreadCounts &&
                              Number(
                                c.unreadCounts[String(user?.id || user?._id)] ||
                                  0,
                              ) > 0,
                          )
                        }
                      >
                        {page.icon}
                      </Badge>
                    ) : (
                      page.icon
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={page.label}
                    secondary={
                      page.id === "friends" && receivedRequests.length > 0
                        ? tr(
                            `${receivedRequests.length} lời mời mới`,
                            `${receivedRequests.length} new requests`,
                          )
                        : undefined
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton
              selected={Boolean(pathname?.startsWith("/profile"))}
              onClick={() => {
                handleDrawerToggle();
                router.push("/profile");
              }}
            >
              <ListItemIcon>
                <Avatar
                  src={user?.avatar || ""}
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "var(--mui-palette-brand-500)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  {(user?.name || "U")[0].toUpperCase()}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={user?.name || tr("Hồ sơ cá nhân", "Personal Profile")}
                secondary={t("nav.viewEditProfile")}
              />
            </ListItemButton>
          </ListItem>
        </List>
        {drawerShortcuts.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {t("sidebar.yourShortcuts")}
              </Typography>
            </Box>
            <List dense>
              {drawerShortcuts.map((sc) => (
                <ListItem key={sc.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleDrawerToggle();
                      router.push(sc.href);
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      {sc.avatar ? (
                        <Avatar
                          src={sc.avatar}
                          variant="rounded"
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "6px",
                          }}
                        />
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "6px",
                            bgcolor:
                              sc.type === "group"
                                ? "primary.main"
                                : "warning.main",
                            fontSize: "0.75rem",
                            color: "common.white",
                            fontWeight: 700,
                          }}
                        >
                          {sc.name[0]?.toUpperCase() || "?"}
                        </Avatar>
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={sc.name}
                      slotProps={{
                        primary: {
                          noWrap: true,
                          sx: { fontSize: "0.85rem", fontWeight: 600 },
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Drawer>
    </>
  );
}

export default ResponsiveAppBar;
