"use client";

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
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";
import { useChatBoxStore } from "../../store/useChatBoxStore";
import { useSoundStore } from "../../store/useSoundStore";
import BrandLogo from "../common/BrandLogo";
import ColorModeToggle from "../common/ColorModeToggle";
import NotificationBell from "../notifications/NotificationBell";
import UserSearchResults, { SEARCH_PREVIEW_COUNT } from "./UserSearchResults";

/** Số kết quả mỗi trang khi "Xem tất cả" / cuộn vô hạn */
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
  const [friendAnchorEl, setFriendAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { openChat } = useChatBoxStore();
  const { isMuted, toggleMute } = useSoundStore();

  // State tìm kiếm người dùng toàn hệ thống
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // false = chỉ xem trước vài kết quả; true = đã bấm "Xem tất cả" (cuộn vô hạn)
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
  } = useFriendStore();

  const {
    conversations,
    fetchConversations,
    selectConversation,
    startConversationWithUser,
    connectSocket,
  } = useChatStore();

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
    { label: user?.name ? `Tên: ${user.name}` : "Tài khoản", disabled: true },
    {
      label: "Hồ sơ cá nhân",
      action: () => {
        router.push("/profile");
      },
    },
    {
      label: "Cài đặt",
      action: () => {
        router.push("/profile");
      },
    },
    {
      label: "Đăng xuất",
      action: () => {
        handleLogout();
      },
    },
  ];

  const pages: NavPage[] = [
    { id: "home", label: "Trang chủ", icon: <Home size={20} />, href: "/" },
    {
      id: "explore",
      label: "Khám phá",
      icon: <Compass size={20} />,
      href: "/explore",
    },
    {
      id: "friends",
      label: "Bạn bè",
      icon: <UserPlus size={20} />,
    },
    { id: "chat", label: "Tin nhắn", icon: <MessageSquare size={20} />, href: "/chat" },
  ];

  return (
    <>
      {/* AppBar luôn tối ở cả hai scheme → ghim biến màu về scheme sáng (data-light) */}
      <AppBar position="fixed" data-light="">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 1.5, md: 2 } }}>
            {/* Logo Desktop */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 1, flexShrink: 0 }}>
              <BrandLogo />
            </Box>

            {/* Nút Hamburger bật Drawer trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label="Mở menu điều hướng"
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
                placeholder="Tìm bạn bè, đồng nghiệp…"
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
                  htmlInput: { "aria-label": "Tìm kiếm người dùng" },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          size={18}
                          color="rgba(255, 255, 255, 0.7)"
                        />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Xóa nội dung tìm kiếm"
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
                style={{ zIndex: 1400, width: searchAnchorRef.current?.clientWidth || 380 }}
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
                          : searchUsers(searchQuery, { limit: SEARCH_PREVIEW_COUNT })
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

            {/* Menu điều hướng trên Desktop */}
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                justifyContent: "center",
                gap: { md: 0.5, lg: 1 },
                mx: { md: 1, lg: 2 },
              }}
            >
              {pages.map((page) => {
                const isActive = Boolean(
                  (page.href &&
                    (page.href === "/" ? pathname === "/" : pathname?.startsWith(page.href))) ||
                    (page.id === "friends" && isFriendOpen) ||
                    (page.id === "chat" && isChatOpen)
                );
                return (
                  <Box key={page.id} sx={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Tooltip title={page.label} enterDelay={500}>
                      <Button
                        aria-label={page.label}
                        aria-current={isActive ? "page" : undefined}
                        onClick={(e) => {
                          if (page.id === "chat") {
                            handleOpenChat(e);
                          } else if (page.id === "friends") {
                            handleOpenFriend(e);
                          } else if (page.href) {
                            router.push(page.href);
                          }
                        }}
                        sx={{
                          color: "white",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          px: { md: 1.5, lg: 2 },
                          py: 0.85,
                          minHeight: 40,
                          minWidth: "auto",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          borderRadius: "12px",
                          fontWeight: isActive ? 700 : 500,
                          bgcolor: isActive ? "rgba(255, 255, 255, 0.16)" : "transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            bgcolor: isActive
                              ? "rgba(255, 255, 255, 0.22)"
                              : "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                      >
                        {page.id === "chat" ? (
                          <Badge
                            color="error"
                            variant="dot"
                            invisible={
                              !conversations.some(
                                (c) =>
                                  c.unreadCounts &&
                                  Number(c.unreadCounts[String(user?.id || user?._id)] || 0) > 0
                              )
                            }
                          >
                            {page.icon}
                          </Badge>
                        ) : page.id === "friends" ? (
                          <Badge
                            color="error"
                            badgeContent={receivedRequests.length}
                            max={99}
                            invisible={receivedRequests.length === 0}
                          >
                            {page.icon}
                          </Badge>
                        ) : (
                          page.icon
                        )}
                        <Box
                          component="span"
                          sx={{
                            display: { md: "none", lg: "inline" },
                            fontSize: "0.875rem",
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                          }}
                        >
                          {page.label}
                        </Box>
                      </Button>
                    </Tooltip>

                  {/* Popover Lời mời kết bạn */}
                  {page.id === "friends" && (
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
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)", fontSize: "0.92rem" }}>
                            Lời mời kết bạn
                          </Typography>
                          {receivedRequests.length > 0 && (
                            <Chip
                              label={receivedRequests.length}
                              size="small"
                              color="error"
                              sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
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
                          Xem tất cả
                        </ButtonBase>
                      </Box>

                      <Box sx={{ overflowY: "auto", maxHeight: 390, p: 0.5 }}>
                        {isLoadingRequests && receivedRequests.length === 0 ? (
                          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : receivedRequests.length === 0 ? (
                          <Box sx={{ textAlign: "center", py: 5, px: 3 }}>
                            <UserCheck size={40} color="var(--mui-palette-neutral-400)" style={{ marginBottom: 10 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-600)", mb: 0.5 }}>
                              Không có lời mời kết bạn mới
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)", display: "block" }}>
                              Khi có người gửi lời mời kết bạn, thông báo sẽ hiển thị tại đây.
                            </Typography>
                          </Box>
                        ) : (
                          receivedRequests.map((req) => {
                            const requester = req.requesterId;
                            const timeAgo = req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString([], {
                                  month: "numeric",
                                  day: "numeric",
                                })
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
                                  "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                                }}
                              >
                                <Avatar
                                  src={requester?.avatar || ""}
                                  sx={{ width: 44, height: 44, bgcolor: "var(--mui-palette-brand-500)", fontWeight: 700, mt: 0.2 }}
                                >
                                  {(requester?.name || "U")[0].toUpperCase()}
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.3 }}>
                                    <Typography
                                      variant="subtitle2"
                                      noWrap
                                      sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)", fontSize: "0.88rem" }}
                                    >
                                      {requester?.name || "Người dùng"}
                                    </Typography>
                                    {timeAgo && (
                                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)", fontSize: "0.7rem", ml: 1 }}>
                                        {timeAgo}
                                      </Typography>
                                    )}
                                  </Box>

                                  <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{ color: "var(--mui-palette-neutral-500)", display: "block", fontSize: "0.74rem", mb: 1 }}
                                  >
                                    {requester?.email || "Đã gửi lời mời kết bạn"}
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
                                      Xác nhận
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
                                          borderColor: "var(--mui-palette-tone-fca5a5)",
                                        },
                                      }}
                                    >
                                      Xóa
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })
                        )}
                      </Box>
                    </Popover>
                  )}

                  {page.id === "chat" && (
                    <Popover
                      open={isChatOpen}
                      anchorEl={chatAnchorEl}
                      onClose={handleCloseChat}
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
                            width: 320,
                            maxHeight: 400,
                            borderRadius: 2,
                            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
                            mt: 1,
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
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          bgcolor: "var(--mui-palette-neutral-50)",
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Tin nhắn gần đây
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Tooltip
                            title={
                              isMuted
                                ? "Bật âm thanh tin nhắn"
                                : "Tắt âm thanh tin nhắn"
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={toggleMute}
                              aria-label={isMuted ? "Bật âm thanh tin nhắn" : "Tắt âm thanh tin nhắn"}
                              aria-pressed={!isMuted}
                              sx={{
                                color: isMuted ? "text.secondary" : "primary.main",
                                p: 0.5,
                              }}
                            >
                              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </IconButton>
                          </Tooltip>
                          <ButtonBase
                            onClick={() => {
                              handleCloseChat();
                              router.push("/chat");
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
                            Xem tất cả
                          </ButtonBase>
                        </Box>
                      </Box>

                      <Box sx={{ overflowY: "auto", maxHeight: 320 }}>
                        {conversations.length === 0 ? (
                          <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                            <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", mb: 1 }}>
                              Chưa có cuộc trò chuyện nào
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                handleCloseChat();
                                router.push("/chat");
                              }}
                              sx={{ textTransform: "none", borderRadius: 1.5 }}
                            >
                              Đến phòng chat
                            </Button>
                          </Box>
                        ) : (
                          conversations.map((conv) => {
                            const other =
                              conv.participants.find(
                                (p) =>
                                  String(p._id || p.id) !== String(user?.id || user?._id)
                              ) || conv.participants[0];
                            const unread = conv.unreadCounts
                              ? Number(conv.unreadCounts[String(user?.id || user?._id)] || 0) > 0
                              : false;

                            return (
                              <ButtonBase
                                component="div"
                                key={conv._id}
                                aria-label={`Mở hội thoại với ${other?.name || "người dùng"}${unread ? " (có tin chưa đọc)" : ""}`}
                                onClick={async () => {
                                  handleCloseChat();
                                  if (pathname === "/chat") {
                                    await selectConversation(conv);
                                  } else {
                                    if (other) {
                                      openChat(other as unknown as Parameters<typeof openChat>[0], conv._id);
                                    } else {
                                      await selectConversation(conv);
                                      router.push("/chat");
                                    }
                                  }
                                }}
                                sx={{
                                  display: "flex",
                                  width: "100%",
                                  textAlign: "left",
                                  justifyContent: "flex-start",
                                  alignItems: "center",
                                  gap: 1.5,
                                  p: 1.5,
                                  px: 2,
                                  cursor: "pointer",
                                  bgcolor: unread ? "rgba(59, 130, 246, 0.05)" : "transparent",
                                  transition: "background-color 0.2s",
                                  "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                                  borderBottom: "1px solid var(--mui-palette-neutral-100)",
                                }}
                              >
                                <Avatar
                                  src={other?.avatar || ""}
                                  sx={{ width: 40, height: 40, bgcolor: "var(--mui-palette-brand-500)", fontWeight: 700 }}
                                >
                                  {(other?.name || "U")[0].toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle2"
                                      noWrap
                                      sx={{ fontWeight: unread ? 700 : 600, color: "var(--mui-palette-neutral-800)", fontSize: "0.85rem" }}
                                    >
                                      {other?.name || "Người dùng"}
                                    </Typography>
                                    {conv.lastMessage && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ fontSize: "0.7rem" }}
                                      >
                                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    color={unread ? "text.primary" : "text.secondary"}
                                    noWrap
                                    sx={{
                                      fontSize: "0.78rem",
                                      fontWeight: unread ? 600 : 400,
                                    }}
                                  >
                                    {conv.lastMessage?.text || "Chưa có tin nhắn"}
                                  </Typography>
                                </Box>
                              </ButtonBase>
                            );
                          })
                        )}
                      </Box>
                    </Popover>
                  )}
                </Box>
                );
              })}
            </Box>

            {/* Nút Lời mời kết bạn, Tin nhắn & Thông báo nhanh trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5, mr: 1 }}>
              <NotificationBell />

              <IconButton
                color="inherit"
                size="small"
                onClick={handleOpenFriend}
                aria-label="Lời mời kết bạn"
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
                aria-label="Tin nhắn"
              >
                <Badge
                  color="error"
                  variant="dot"
                  invisible={
                    !conversations.some(
                      (c) =>
                        c.unreadCounts &&
                        Number(c.unreadCounts[String(user?.id || user?._id)] || 0) > 0
                    )
                  }
                >
                  <MessageSquare size={20} />
                </Badge>
              </IconButton>
            </Box>

            {/* Chuông thông báo trên Desktop */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <NotificationBell />
            </Box>

            {/* Đổi giao diện sáng/tối (mobile: nằm trong Drawer) */}
            <Box sx={{ display: { xs: "none", md: "flex" }, mr: 0.5 }}>
              <ColorModeToggle />
            </Box>

            {/* Avatar User */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Mở cài đặt">
                <IconButton
                  onClick={handleOpenUserMenu}
                  aria-label="Mở menu tài khoản"
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
            <ColorModeToggle />
            <IconButton onClick={handleDrawerToggle} aria-label="Đóng menu" sx={{ color: "inherit" }}>
              <X size={20} />
            </IconButton>
          </Box>
        </Box>
        <Divider />
        <List>
          {pages.map((page) => {
            const isActive = Boolean(
              page.href &&
                (page.href === "/" ? pathname === "/" : pathname?.startsWith(page.href))
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
                              Number(c.unreadCounts[String(user?.id || user?._id)] || 0) > 0
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
                        ? `${receivedRequests.length} lời mời mới`
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
                primary={user?.name || "Hồ sơ cá nhân"}
                secondary="Xem và chỉnh sửa hồ sơ"
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}

export default ResponsiveAppBar;
