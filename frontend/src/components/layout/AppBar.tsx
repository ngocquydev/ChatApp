"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { useRouter } from "next/navigation";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AdbIcon from "@mui/icons-material/Adb";
import SearchIcon from "@mui/icons-material/Search";
import FeedIcon from "@mui/icons-material/Feed";
import ExploreIcon from "@mui/icons-material/Explore";
import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import { X, UserPlus, Clock, Check } from "lucide-react";
import Message, { ChatFriend } from "../section/Message";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "../../store/useFriendStore";
import { useChatStore } from "../../store/useChatStore";

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
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [openChatBoxes, setOpenChatBoxes] = useState<ChatFriend[]>([]);

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
    }
  }, [user, connectSocket, fetchConversations]);

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

  const handleCloseChatBox = (userId: number | string) => {
    setOpenChatBoxes((prev) =>
      prev.filter((item) => String(item.id) !== String(userId))
    );
  };

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
                    ) : (
                      page.icon
                    )}
                  </Button>

                  {page.id === "chat" && (
                    <Popover
                      open={isChatOpen}
                      anchorEl={chatAnchorEl}
                      onClose={handleCloseChat}
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
                                  await selectConversation(conv);
                                  router.push("/chat");
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
                  } else if (page.href) {
                    router.push(page.href);
                  }
                }}
              >
                <ListItemIcon>{page.icon}</ListItemIcon>
                <ListItemText primary={page.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          right: { xs: 16, sm: "10%" },
          display: "flex",
          flexDirection: "row-reverse",
          alignItems: "flex-end",
          gap: 2,
          zIndex: 1300,
        }}
      >
        {openChatBoxes.map((chatUser) => (
          <Message
            key={chatUser.id}
            friend={chatUser}
            onClose={() => handleCloseChatBox(chatUser.id)}
          />
        ))}
      </Box>
    </>
  );
}

export default ResponsiveAppBar;
