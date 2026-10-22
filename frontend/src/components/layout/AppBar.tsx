"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AdbIcon from "@mui/icons-material/Adb";
import SearchIcon from "@mui/icons-material/Search";
import FeedIcon from "@mui/icons-material/Feed";
import ExploreIcon from "@mui/icons-material/Explore";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import { X, UserPlus, Clock, Check, UserCheck, Users } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";
import { useChatBoxStore } from "../../store/useChatBoxStore";

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

  // State tìm kiếm người dùng toàn hệ thống
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);

  const {
    searchResults,
    isSearching,
    searchUsers,
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
      searchUsers(searchQuery);
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
    { id: "feed", label: "Bảng tin", icon: <FeedIcon />, href: "/" },
    {
      id: "explore",
      label: "Khám phá",
      icon: <ExploreIcon />,
      href: "/explore",
    },
    {
      id: "friends",
      label: "Bạn bè",
      icon: <UserPlus size={20} />,
    },
    { id: "chat", label: "Tin nhắn", icon: <ChatIcon />, href: "/chat" },
    { id: "profile", label: "Cá nhân", icon: <PersonIcon />, href: "/profile" },
  ];

  return (
    <>
      <AppBar position="fixed">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: 2 }}>
            {/* Logo Desktop */}
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
              }}
            >
              <AdbIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1 }} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  mr: 2,
                  display: { xs: "none", md: "flex" },
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: ".3rem",
                  color: "inherit",
                }}
              >
                CHATAPP
              </Typography>
            </Link>

            {/* Nút Hamburger bật Drawer trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" } }}>
              <IconButton
                size="large"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* Logo Mobile */}
            <Link
              href="/"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
              }}
            >
              <AdbIcon sx={{ display: { xs: "flex", md: "none" }, mr: 1 }} />
              <Typography
                variant="h6"
                noWrap
                sx={{
                  mr: 1,
                  display: { xs: "flex", md: "none" },
                  fontFamily: "monospace",
                  fontWeight: 700,
                  letterSpacing: ".1rem",
                  color: "inherit",
                }}
              >
                CHATAPP
              </Typography>
            </Link>

            {/* Thanh Search Real-Time Toàn Hệ Thống */}
            <Box
              ref={searchAnchorRef}
              sx={{ flexGrow: 1, maxWidth: { xs: "100%", md: 450 }, position: "relative" }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm bạn bè, đồng nghiệp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                variant="outlined"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSearchQuery("");
                            setIsSearchOpen(false);
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

              {/* Popper Dropdown Hiển Thị Kết Quả Tìm Kiếm Thật */}
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
                      p: 1.5,
                      maxHeight: 400,
                      overflowY: "auto",
                      borderRadius: 2,
                      bgcolor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      position: "relative",
                    }}
                  >
                    {isSearching && (
                      <LinearProgress
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          borderTopLeftRadius: 8,
                          borderTopRightRadius: 8,
                        }}
                      />
                    )}

                    {searchResults.length === 0 ? (
                      isSearching ? (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3, gap: 1.5 }}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Đang tìm kiếm người dùng...
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ textAlign: "center", py: 3 }}>
                          <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Không tìm thấy người dùng nào khớp với &quot;{searchQuery}&quot;
                          </Typography>
                        </Box>
                      )
                    ) : (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, mb: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: "#64748b", display: "block" }}
                          >
                            KẾT QUẢ TÌM KIẾM ({searchResults.length})
                          </Typography>
                          {isSearching && (
                            <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                              Đang cập nhật...
                            </Typography>
                          )}
                        </Box>
                        <List disablePadding>
                          {searchResults.map((userItem) => (
                            <ListItem
                              key={userItem._id}
                              sx={{
                                px: 1,
                                py: 1,
                                borderRadius: 1.5,
                                "&:hover": { bgcolor: "#f8fafc" },
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                mb: 0.5,
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                                <Avatar
                                  src={userItem.avatar || ""}
                                  sx={{ width: 38, height: 38, bgcolor: "#3b82f6", fontWeight: 700 }}
                                >
                                  {(userItem.name || "U")[0].toUpperCase()}
                                </Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography
                                    variant="subtitle2"
                                    noWrap
                                    sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}
                                  >
                                    {userItem.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{ color: "#64748b", display: "block", fontSize: "0.75rem" }}
                                  >
                                    {userItem.email}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{ ml: 1, flexShrink: 0 }}>
                                {userItem.relationStatus === "none" && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<UserPlus size={14} />}
                                    onClick={async () => {
                                      await sendFriendRequest(userItem._id);
                                    }}
                                    sx={{
                                      textTransform: "none",
                                      fontSize: "0.75rem",
                                      borderRadius: 1.5,
                                      py: 0.4,
                                    }}
                                  >
                                    Kết bạn
                                  </Button>
                                )}

                                {userItem.relationStatus === "pending_sent" && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<Clock size={13} />}
                                    onClick={async () => {
                                      if (userItem.requestId) await cancelRequest(userItem.requestId);
                                    }}
                                    sx={{
                                      textTransform: "none",
                                      fontSize: "0.72rem",
                                      borderRadius: 1.5,
                                      py: 0.4,
                                      color: "#64748b",
                                    }}
                                  >
                                    Đã gửi (Hủy)
                                  </Button>
                                )}

                                {userItem.relationStatus === "pending_received" && (
                                  <Box sx={{ display: "flex", gap: 0.5 }}>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color="primary"
                                      startIcon={<Check size={13} />}
                                      onClick={async () => {
                                        if (userItem.requestId)
                                          await respondToRequest(userItem.requestId, "accept");
                                      }}
                                      sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.3, px: 1 }}
                                    >
                                      Chấp nhận
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="error"
                                      onClick={async () => {
                                        if (userItem.requestId)
                                          await respondToRequest(userItem.requestId, "reject");
                                      }}
                                      sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.3, px: 0.8 }}
                                    >
                                      Từ chối
                                    </Button>
                                  </Box>
                                )}

                                {userItem.relationStatus === "friends" && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={async () => {
                                      setIsSearchOpen(false);
                                      await startConversationWithUser(userItem);
                                      router.push("/chat");
                                    }}
                                    sx={{
                                      textTransform: "none",
                                      fontSize: "0.75rem",
                                      borderRadius: 1.5,
                                      py: 0.4,
                                    }}
                                  >
                                    Nhắn tin
                                  </Button>
                                )}
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </Paper>
                </ClickAwayListener>
              </Popper>
            </Box>

            {/* Menu điều hướng trên Desktop */}
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "none", md: "flex" },
                justifyContent: "flex-end",
              }}
            >
              {pages.map((page) => (
                <Box key={page.id} sx={{ position: "relative" }}>
                  <Button
                    onClick={(e) => {
                      if (page.id === "chat") {
                        handleOpenChat(e);
                      } else if (page.id === "friends") {
                        handleOpenFriend(e);
                      } else if (page.href) {
                        router.push(page.href);
                      }
                    }}
                    sx={{ my: 2, color: "white", display: "flex", gap: 1 }}
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
                  </Button>

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
                          borderBottom: "1px solid #e2e8f0",
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.92rem" }}>
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
                        <Typography
                          variant="caption"
                          color="primary"
                          onClick={() => {
                            handleCloseFriend();
                            router.push("/explore");
                          }}
                          sx={{
                            cursor: "pointer",
                            fontWeight: 600,
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          Xem tất cả
                        </Typography>
                      </Box>

                      <Box sx={{ overflowY: "auto", maxHeight: 390, p: 0.5 }}>
                        {isLoadingRequests && receivedRequests.length === 0 ? (
                          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : receivedRequests.length === 0 ? (
                          <Box sx={{ textAlign: "center", py: 5, px: 3 }}>
                            <UserCheck size={40} color="#94a3b8" style={{ marginBottom: 10 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.5 }}>
                              Không có lời mời kết bạn mới
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
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
                                  "&:hover": { bgcolor: "#f1f5f9" },
                                }}
                              >
                                <Avatar
                                  src={requester?.avatar || ""}
                                  sx={{ width: 44, height: 44, bgcolor: "#3b82f6", fontWeight: 700, mt: 0.2 }}
                                >
                                  {(requester?.name || "U")[0].toUpperCase()}
                                </Avatar>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.3 }}>
                                    <Typography
                                      variant="subtitle2"
                                      noWrap
                                      sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}
                                    >
                                      {requester?.name || "Người dùng"}
                                    </Typography>
                                    {timeAgo && (
                                      <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem", ml: 1 }}>
                                        {timeAgo}
                                      </Typography>
                                    )}
                                  </Box>

                                  <Typography
                                    variant="caption"
                                    noWrap
                                    sx={{ color: "#64748b", display: "block", fontSize: "0.74rem", mb: 1 }}
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
                                        color: "#64748b",
                                        borderColor: "#cbd5e1",
                                        "&:hover": {
                                          bgcolor: "#fef2f2",
                                          color: "#ef4444",
                                          borderColor: "#fca5a5",
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
                          bgcolor: "#f8fafc",
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Tin nhắn gần đây
                        </Typography>
                        <Typography
                          variant="caption"
                          color="primary"
                          onClick={() => {
                            handleCloseChat();
                            router.push("/chat");
                          }}
                          sx={{
                            cursor: "pointer",
                            fontWeight: 600,
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          Xem tất cả
                        </Typography>
                      </Box>

                      <Box sx={{ overflowY: "auto", maxHeight: 320 }}>
                        {conversations.length === 0 ? (
                          <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                            <Typography variant="body2" sx={{ color: "#64748b", mb: 1 }}>
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
                              <Box
                                key={conv._id}
                                onClick={async () => {
                                  handleCloseChat();
                                  if (pathname === "/chat") {
                                    await selectConversation(conv);
                                  } else {
                                    if (other) {
                                      openChat(other as any, conv._id);
                                    } else {
                                      await selectConversation(conv);
                                      router.push("/chat");
                                    }
                                  }
                                }}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  p: 1.5,
                                  px: 2,
                                  cursor: "pointer",
                                  bgcolor: unread ? "rgba(59, 130, 246, 0.05)" : "transparent",
                                  transition: "background-color 0.2s",
                                  "&:hover": { bgcolor: "#f1f5f9" },
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                              >
                                <Avatar
                                  src={other?.avatar || ""}
                                  sx={{ width: 40, height: 40, bgcolor: "#3b82f6", fontWeight: 700 }}
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
                                      sx={{ fontWeight: unread ? 700 : 600, color: "#1e293b", fontSize: "0.85rem" }}
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
                              </Box>
                            );
                          })
                        )}
                      </Box>
                    </Popover>
                  )}
                </Box>
              ))}
            </Box>

            {/* Nút Lời mời kết bạn & Tin nhắn nhanh trên Mobile */}
            <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5, mr: 1 }}>
              <IconButton
                color="inherit"
                size="small"
                onClick={handleOpenFriend}
                aria-label="friend requests"
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
                aria-label="chat messages"
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
                  <ChatIcon />
                </Badge>
              </IconButton>
            </Box>

            {/* Avatar User */}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Mở cài đặt">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
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
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2,
            bgcolor: "primary.main",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AdbIcon />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              MENU
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerToggle} sx={{ color: "white" }}>
            <X size={20} />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {pages.map((page) => (
            <ListItem key={page.id} disablePadding>
              <ListItemButton
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
          ))}
        </List>
      </Drawer>
    </>
  );
}

export default ResponsiveAppBar;
