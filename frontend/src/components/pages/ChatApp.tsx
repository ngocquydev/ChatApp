"use client";

import { useState, useRef, useEffect, KeyboardEvent, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Badge,
  InputAdornment,
  Divider,
  Chip,
  Tooltip,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tabs,
  Tab,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Circle,
  Image as ImageIcon,
  MessageSquare,
  UserPlus,
  Users,
  X,
  Check,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useSoundStore } from "../../store/useSoundStore";
import {
  useChatStore,
  ConversationItem,
  ChatUser,
} from "../../store/useChatStore";
import {
  useFriendStore,
  FriendItem,
  FriendRequestItem,
  UserRelationResult,
} from "../../store/useFriendStore";

// Badge trạng thái Online/Offline tùy biến
const StyledBadge = styled(Badge)<{ isonline?: string }>(({ theme, isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "#22c55e" : "#94a3b8",
    color: isonline === "true" ? "#22c55e" : "#94a3b8",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation:
        isonline === "true" ? "ripple 1.2s infinite ease-in-out" : "none",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.4)", opacity: 0 },
  },
}));

export default function ChatApp() {
  const { user } = useAuthStore();
  const { isMuted, toggleMute } = useSoundStore();
  const {
    connectSocket,
    disconnectSocket,
    fetchConversations,
    conversations,
    activeConversation,
    selectConversation,
    startConversationWithUser,
    messages,
    sendMessage,
    sendTyping,
    onlineUserIds,
    typingMap,
    isLoadingConversations,
    isLoadingMessages,
  } = useChatStore();

  const {
    friends,
    receivedRequests,
    sentRequests,
    searchResults,
    isLoadingFriends,
    isLoadingRequests,
    isSearching,
    fetchFriends,
    fetchRequests,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    cancelRequest,
    unfriend,
    clearSearchResults,
  } = useFriendStore();

  // Sidebar Tab: 0 = Hội thoại (Chats), 1 = Danh bạ & Bạn bè (Friends)
  const [sidebarTab, setSidebarTab] = useState<0 | 1>(0);

  // Sub Tab trong mục Bạn bè: 0 = Danh sách bạn bè, 1 = Lời mời kết bạn
  const [friendsSubTab, setFriendsSubTab] = useState<0 | 1>(0);

  // Search bạn mới Dialog
  const [openAddFriendDialog, setOpenAddFriendDialog] = useState(false);
  const [searchFriendInput, setSearchFriendInput] = useState("");

  const handleOpenAddFriendDialog = () => {
    clearSearchResults();
    setSearchFriendInput("");
    setOpenAddFriendDialog(true);
  };

  const handleCloseAddFriendDialog = () => {
    setOpenAddFriendDialog(false);
    setSearchFriendInput("");
    clearSearchResults();
  };

  const [inputText, setInputText] = useState("");
  const [searchChatQuery, setSearchChatQuery] = useState("");

  // Toast thông báo
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    type: "info",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ open: true, message, type });
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const currentUserId = (user?._id || user?.id)?.toString();

  // Khởi tạo kết nối WebSocket và tải dữ liệu ban đầu
  useEffect(() => {
    connectSocket();
    fetchConversations();
    fetchFriends();
    fetchRequests();

    // Lắng nghe sự kiện socket refresh bạn bè
    const handleRefreshRequests = () => {
      fetchRequests();
      showToast("Bạn có lời mời kết bạn mới!", "info");
    };
    const handleRefreshFriends = () => {
      fetchFriends();
      showToast("Lời mời kết bạn đã được chấp nhận!", "success");
    };

    window.addEventListener("refresh_friend_requests", handleRefreshRequests);
    window.addEventListener("refresh_friends_list", handleRefreshFriends);

    return () => {
      window.removeEventListener("refresh_friend_requests", handleRefreshRequests);
      window.removeEventListener("refresh_friends_list", handleRefreshFriends);
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, fetchConversations, fetchFriends, fetchRequests]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đối phương đang gõ
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversation, typingMap]);

  // Tìm kiếm bạn bè khi gõ trong modal Add Friend
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchFriendInput.trim()) {
        searchUsers(searchFriendInput.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFriendInput, searchUsers]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(false);
    lastTypingSentRef.current = 0;
    await sendMessage(textToSend);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Xử lý sự kiện gõ tin nhắn (typing indicator)
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!text.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTyping(false);
      lastTypingSentRef.current = 0;
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      sendTyping(true);
      lastTypingSentRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
      lastTypingSentRef.current = 0;
    }, 5000);
  };

  // Tìm đối phương trong cuộc hội thoại hiện tại
  const partner = useMemo(() => {
    if (!activeConversation) return null;
    return (
      activeConversation.participants.find((p) => p._id !== currentUserId) ||
      activeConversation.participants[0] ||
      null
    );
  }, [activeConversation, currentUserId]);

  const isPartnerOnline = partner?._id
    ? onlineUserIds.includes(partner._id)
    : false;

  const isPartnerTyping = activeConversation
    ? Boolean(typingMap[activeConversation._id])
    : false;

  // Lọc danh sách hội thoại theo searchChatQuery
  const filteredConversations = useMemo(() => {
    if (!searchChatQuery.trim()) return conversations;
    return conversations.filter((c) => {
      const p = c.participants.find((u) => u._id !== currentUserId);
      return p?.name.toLowerCase().includes(searchChatQuery.toLowerCase());
    });
  }, [conversations, searchChatQuery, currentUserId]);

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        bgcolor: "#f1f5f9",
        overflow: "hidden",
        pt: "64px",
      }}
    >
      {/* ==================== CỘT TRÁI: SIDEBAR ==================== */}
      <Paper
        elevation={0}
        sx={{
          width: { xs: "80px", sm: "320px", md: "380px" },
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          bgcolor: "#ffffff",
          zIndex: 2,
        }}
      >
        {/* Header Sidebar & Nút Thêm Bạn */}
        <Box sx={{ p: 2, pb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, color: "#0f172a", display: { xs: "none", sm: "block" } }}
            >
              ChatApp
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Thêm bạn mới">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenAddFriendDialog}
                  startIcon={<UserPlus size={16} />}
                  sx={{
                    borderRadius: "10px",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    borderColor: "#3b82f6",
                    color: "#2563eb",
                    display: { xs: "none", sm: "flex" },
                    "&:hover": { bgcolor: "#eff6ff", borderColor: "#2563eb" },
                  }}
                >
                  Tìm bạn
                </Button>
              </Tooltip>

              <Chip
                label={`${onlineUserIds.length} online`}
                size="small"
                icon={<Circle size={8} color="#22c55e" fill="#22c55e" />}
                sx={{
                  bgcolor: "#f0fdf4",
                  color: "#166534",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  display: { xs: "none", sm: "flex" },
                }}
              />
            </Box>
          </Box>

          {/* Tab Chuyển Đổi: Tin nhắn / Danh bạ */}
          <Tabs
            value={sidebarTab}
            onChange={(_, val) => setSidebarTab(val)}
            variant="fullWidth"
            sx={{
              minHeight: 40,
              display: { xs: "none", sm: "flex" },
              "& .MuiTab-root": {
                minHeight: 40,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "#64748b",
                "&.Mui-selected": { color: "#2563eb" },
              },
              "& .MuiTabs-indicator": {
                bgcolor: "#2563eb",
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
            }}
          >
            <Tab
              icon={<MessageSquare size={16} style={{ marginBottom: 0 }} />}
              iconPosition="start"
              label="Hội thoại"
            />
            <Tab
              icon={
                <Badge
                  badgeContent={receivedRequests.length}
                  color="error"
                  sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}
                >
                  <Users size={16} style={{ marginBottom: 0 }} />
                </Badge>
              }
              iconPosition="start"
              label="Bạn bè"
            />
          </Tabs>
        </Box>

        <Divider />

        {/* ================= NỘI DUNG TAB 0: HỘI THOẠI ================= */}
        {sidebarTab === 0 && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Ô tìm kiếm cuộc trò chuyện */}
            <Box sx={{ p: 1.5, pb: 1, display: { xs: "none", sm: "block" } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm kiếm hội thoại..."
                value={searchChatQuery}
                onChange={(e) => setSearchChatQuery(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "12px",
                    bgcolor: "#f8fafc",
                    "&:hover fieldset": { borderColor: "#cbd5e1" },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={16} color="#94a3b8" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Danh sách hội thoại cuộn dọc */}
            <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
              {isLoadingConversations ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : filteredConversations.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
                  <MessageSquare size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                  <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                    Chưa có cuộc trò chuyện nào
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8", mt: 0.5, display: "block" }}>
                    Chuyển sang tab <strong>Bạn bè</strong> để bắt đầu trò chuyện!
                  </Typography>
                </Box>
              ) : (
                filteredConversations.map((item: ConversationItem) => {
                  const other =
                    item.participants.find((p) => p._id !== currentUserId) ||
                    item.participants[0];
                  const isActive = activeConversation?._id === item._id;
                  const isOnline = other?._id ? onlineUserIds.includes(other._id) : false;
                  const unreadCount = item.unreadCounts?.[currentUserId || ""] || 0;

                  return (
                    <Box
                      key={item._id}
                      onClick={() => selectConversation(item)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1.5,
                        mb: 0.5,
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        bgcolor: isActive ? "#eff6ff" : "transparent",
                        "&:hover": {
                          bgcolor: isActive ? "#eff6ff" : "#f8fafc",
                        },
                      }}
                    >
                      <StyledBadge
                        overlap="circular"
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        variant="dot"
                        isonline={isOnline ? "true" : "false"}
                      >
                        <Avatar
                          src={other?.avatar}
                          alt={other?.name}
                          sx={{ width: 48, height: 48 }}
                        >
                          {other?.name?.[0]}
                        </Avatar>
                      </StyledBadge>

                      <Box
                        sx={{
                          ml: 1.8,
                          flex: 1,
                          minWidth: 0,
                          display: { xs: "none", sm: "block" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{
                              fontWeight: isActive ? 700 : 600,
                              color: isActive ? "#1e40af" : "#0f172a",
                            }}
                          >
                            {other?.name || "Người dùng"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "#94a3b8", fontSize: "0.75rem" }}
                          >
                            {formatMessageTime(item.lastMessage?.createdAt || item.updatedAt)}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: 0.3,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: unreadCount > 0 ? "#1e293b" : "#64748b",
                              fontWeight: unreadCount > 0 ? 600 : 400,
                              fontSize: "0.85rem",
                            }}
                            noWrap
                          >
                            {item.lastMessage?.text || "Bắt đầu cuộc trò chuyện..."}
                          </Typography>

                          {unreadCount > 0 && (
                            <Box
                              sx={{
                                bgcolor: "#2563eb",
                                color: "#ffffff",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                borderRadius: "10px",
                                minWidth: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                px: 0.6,
                                ml: 1,
                              }}
                            >
                              {unreadCount}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        )}

        {/* ================= NỘI DUNG TAB 1: DANH BẠ BẠN BÈ ================= */}
        {sidebarTab === 1 && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Sub-Tabs: Bạn bè / Lời mời */}
            <Box sx={{ px: 2, pt: 1.5, pb: 1, display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant={friendsSubTab === 0 ? "contained" : "outlined"}
                onClick={() => setFriendsSubTab(0)}
                sx={{
                  flex: 1,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  py: 0.6,
                  bgcolor: friendsSubTab === 0 ? "#2563eb" : "transparent",
                }}
              >
                Bạn bè ({friends.length})
              </Button>
              <Button
                size="small"
                variant={friendsSubTab === 1 ? "contained" : "outlined"}
                onClick={() => setFriendsSubTab(1)}
                sx={{
                  flex: 1,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  py: 0.6,
                  bgcolor: friendsSubTab === 1 ? "#2563eb" : "transparent",
                }}
              >
                Lời mời ({receivedRequests.length})
              </Button>
            </Box>

            <Divider />

            {/* Danh sách bạn bè chính thức */}
            {friendsSubTab === 0 && (
              <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
                {isLoadingFriends ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : friends.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
                    <Users size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                    <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                      Bạn chưa có bạn bè nào
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8", mt: 0.5, display: "block" }}>
                      Bấm nút <strong>Tìm bạn</strong> phía trên để kết nối với mọi người!
                    </Typography>
                  </Box>
                ) : (
                  friends.map((item: FriendItem) => {
                    const f = item.friend;
                    const isOnline = onlineUserIds.includes(f._id);
                    return (
                      <Box
                        key={item.friendshipId}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 1.5,
                          mb: 0.5,
                          borderRadius: "12px",
                          bgcolor: "#f8fafc",
                          "&:hover": { bgcolor: "#f1f5f9" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                          <StyledBadge
                            overlap="circular"
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            variant="dot"
                            isonline={isOnline ? "true" : "false"}
                          >
                            <Avatar src={f.avatar} sx={{ width: 44, height: 44 }}>
                              {f.name?.[0]}
                            </Avatar>
                          </StyledBadge>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700, color: "#0f172a" }}
                              noWrap
                            >
                              {f.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap>
                              {isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={async () => {
                              await startConversationWithUser(f);
                              setSidebarTab(0);
                            }}
                            startIcon={<MessageSquare size={14} />}
                            sx={{
                              borderRadius: "8px",
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              py: 0.4,
                              px: 1.2,
                              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                            }}
                          >
                            Nhắn tin
                          </Button>
                          <Tooltip title="Hủy kết bạn">
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (confirm(`Bạn có chắc muốn hủy kết bạn với ${f.name}?`)) {
                                  const res = await unfriend(f._id);
                                  showToast(res.message, res.success ? "info" : "error");
                                }
                              }}
                              sx={{ color: "#94a3b8", "&:hover": { color: "#ef4444" } }}
                            >
                              <UserX size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            )}

            {/* Danh sách lời mời kết bạn (Nhận & Gửi) */}
            {friendsSubTab === 1 && (
              <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", px: 1, my: 1, display: "block" }}>
                  LỜI MỜI ĐÃ NHẬN ({receivedRequests.length})
                </Typography>

                {receivedRequests.length === 0 ? (
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", px: 1, mb: 2 }}>
                    Không có lời mời nào đang chờ duyệt
                  </Typography>
                ) : (
                  receivedRequests.map((req: FriendRequestItem) => {
                    const requester = req.requesterId;
                    if (!requester) return null;
                    return (
                      <Box
                        key={req._id}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          borderRadius: "12px",
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.2 }}>
                          <Avatar src={requester.avatar} sx={{ width: 40, height: 40 }}>
                            {requester.name?.[0]}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                              {requester.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#94a3b8" }} noWrap>
                              {requester.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="contained"
                            startIcon={<Check size={14} />}
                            onClick={async () => {
                              const res = await respondToRequest(req._id, "accept");
                              showToast(res.message, res.success ? "success" : "error");
                            }}
                            sx={{
                              bgcolor: "#10b981",
                              "&:hover": { bgcolor: "#059669" },
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              borderRadius: "8px",
                            }}
                          >
                            Chấp nhận
                          </Button>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            startIcon={<X size={14} />}
                            onClick={async () => {
                              const res = await respondToRequest(req._id, "reject");
                              showToast(res.message, "info");
                            }}
                            sx={{
                              color: "#64748b",
                              borderColor: "#cbd5e1",
                              "&:hover": { borderColor: "#ef4444", color: "#ef4444" },
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                              borderRadius: "8px",
                            }}
                          >
                            Từ chối
                          </Button>
                        </Box>
                      </Box>
                    );
                  })
                )}

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", px: 1, my: 1, display: "block" }}>
                  LỜI MỜI ĐÃ GỬI ({sentRequests.length})
                </Typography>

                {sentRequests.length === 0 ? (
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", px: 1 }}>
                    Bạn chưa gửi lời mời kết bạn nào
                  </Typography>
                ) : (
                  sentRequests.map((req: FriendRequestItem) => {
                    const recipient = req.recipientId;
                    if (!recipient) return null;
                    return (
                      <Box
                        key={req._id}
                        sx={{
                          p: 1.2,
                          mb: 0.8,
                          borderRadius: "10px",
                          bgcolor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                          <Avatar src={recipient.avatar} sx={{ width: 34, height: 34 }}>
                            {recipient.name?.[0]}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {recipient.name}
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          onClick={async () => {
                            const res = await cancelRequest(req._id);
                            showToast(res.message, "info");
                          }}
                          sx={{ textTransform: "none", fontSize: "0.75rem", color: "#ef4444" }}
                        >
                          Hủy lời mời
                        </Button>
                      </Box>
                    );
                  })
                )}
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* ==================== CỘT PHẢI: KHUNG CHAT CHÍNH ==================== */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          bgcolor: "#f8fafc",
        }}
      >
        {!activeConversation ? (
          /* Trạng thái chưa chọn cuộc trò chuyện */
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "24px",
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 12px 30px -5px rgba(37, 99, 235, 0.4)",
                mb: 3,
              }}
            >
              <MessageSquare size={40} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 1 }}>
              Chào mừng đến với ChatApp Realtime
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 440, lineHeight: 1.6 }}>
              Chọn một cuộc hội thoại hoặc chuyển sang tab <strong>Bạn bè</strong> để bắt đầu trò chuyện
              thời gian thực cùng người thân và đồng nghiệp.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Header Khung Chat */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                px: 3,
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                bgcolor: "#ffffff",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.8 }}>
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  variant="dot"
                  isonline={isPartnerOnline ? "true" : "false"}
                >
                  <Avatar
                    src={partner?.avatar}
                    alt={partner?.name}
                    sx={{ width: 44, height: 44 }}
                  >
                    {partner?.name?.[0]}
                  </Avatar>
                </StyledBadge>
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}
                  >
                    {partner?.name || "Người dùng"}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: isPartnerTyping
                        ? "#2563eb"
                        : isPartnerOnline
                        ? "#16a34a"
                        : "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {isPartnerTyping
                      ? "Đang soạn tin nhắn..."
                      : isPartnerOnline
                      ? "Đang hoạt động"
                      : "Ngoại tuyến"}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Tooltip
                  title={
                    isMuted
                      ? "Âm thanh thông báo: Đang tắt (Nhấp để bật)"
                      : "Âm thanh thông báo: Đang bật (Nhấp để tắt)"
                  }
                >
                  <IconButton
                    onClick={toggleMute}
                    sx={{
                      color: isMuted ? "#94a3b8" : "#2563eb",
                      bgcolor: isMuted ? "transparent" : "#eff6ff",
                      "&:hover": {
                        color: isMuted ? "#2563eb" : "#1d4ed8",
                        bgcolor: "#eff6ff",
                      },
                    }}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Gọi thoại">
                  <IconButton
                    sx={{
                      color: "#64748b",
                      "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                    }}
                  >
                    <Phone size={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Gọi video">
                  <IconButton
                    sx={{
                      color: "#64748b",
                      "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                    }}
                  >
                    <Video size={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Thêm tùy chọn">
                  <IconButton sx={{ color: "#64748b", "&:hover": { color: "#0f172a" } }}>
                    <MoreVertical size={20} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>

            {/* Nội dung danh sách tin nhắn */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              }}
            >
              {isLoadingMessages ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="body2" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                    Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên! 👋
                  </Typography>
                </Box>
              ) : (
                messages.map((msg) => {
                  const senderIdStr =
                    typeof msg.senderId === "string"
                      ? msg.senderId
                      : msg.senderId?._id;
                  const isMe = senderIdStr === currentUserId;

                  return (
                    <Box
                      key={msg._id}
                      sx={{
                        display: "flex",
                        justifyContent: isMe ? "flex-end" : "flex-start",
                        alignItems: "flex-end",
                        gap: 1.2,
                      }}
                    >
                      {!isMe && (
                        <Avatar
                          src={partner?.avatar}
                          sx={{ width: 32, height: 32, mb: 0.5 }}
                        >
                          {partner?.name?.[0]}
                        </Avatar>
                      )}

                      <Box
                        sx={{
                          maxWidth: { xs: "85%", sm: "65%", md: "55%" },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMe ? "flex-end" : "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            p: 1.6,
                            px: 2,
                            borderRadius: isMe
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            bgcolor: isMe ? "#2563eb" : "#ffffff",
                            color: isMe ? "#ffffff" : "#1e293b",
                            boxShadow: isMe
                              ? "0 4px 14px rgba(37, 99, 235, 0.2)"
                              : "0 2px 8px rgba(0, 0, 0, 0.04)",
                            border: isMe ? "none" : "1px solid #e2e8f0",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.95rem",
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.text}
                          </Typography>
                        </Box>

                        {/* Thời gian & Trạng thái đã gửi / đã xem */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.4,
                            px: 0.5,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: "#94a3b8", fontSize: "0.72rem" }}
                          >
                            {formatMessageTime(msg.createdAt)}
                          </Typography>
                          {isMe && (
                            <CheckCheck
                              size={14}
                              color={msg.readAt ? "#2563eb" : "#94a3b8"}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}

              {/* Typing indicator realtime */}
              {isPartnerTyping && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
                  <Avatar src={partner?.avatar} sx={{ width: 24, height: 24 }} />
                  <Box
                    sx={{
                      p: 1,
                      px: 2,
                      bgcolor: "#ffffff",
                      borderRadius: "14px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "#3b82f6",
                        animation: "bounce 1s infinite",
                        "@keyframes bounce": {
                          "0%, 100%": { transform: "translateY(0)" },
                          "50%": { transform: "translateY(-4px)" },
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "#3b82f6",
                        animation: "bounce 1s infinite 0.2s",
                      }}
                    />
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: "#3b82f6",
                        animation: "bounce 1s infinite 0.4s",
                      }}
                    />
                  </Box>
                </Box>
              )}

              <div ref={messagesEndRef} />
            </Box>

            {/* Thanh Nhập Tin Nhắn */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                px: 3,
                bgcolor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  p: "4px 8px",
                  "&:focus-within": {
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.12)",
                  },
                }}
              >
                <Tooltip title="Đính kèm file">
                  <IconButton size="small" sx={{ color: "#64748b" }}>
                    <Paperclip size={20} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Gửi hình ảnh">
                  <IconButton size="small" sx={{ color: "#64748b" }}>
                    <ImageIcon size={20} />
                  </IconButton>
                </Tooltip>

                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Nhập nội dung tin nhắn... (Nhấn Enter để gửi)"
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyPress}
                  variant="standard"
                  slotProps={{
                    input: {
                      disableUnderline: true,
                      sx: { px: 1.5, py: 0.5, fontSize: "0.95rem" },
                    },
                  }}
                />

                <Tooltip title="Chọn biểu tượng cảm xúc">
                  <IconButton size="small" sx={{ color: "#64748b" }}>
                    <Smile size={20} />
                  </IconButton>
                </Tooltip>

                <IconButton
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  sx={{
                    bgcolor: inputText.trim() ? "#2563eb" : "#e2e8f0",
                    color: "#ffffff",
                    p: 1.2,
                    ml: 0.5,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: inputText.trim() ? "#1d4ed8" : "#e2e8f0",
                      transform: inputText.trim() ? "scale(1.05)" : "none",
                    },
                    "&.Mui-disabled": {
                      color: "#94a3b8",
                    },
                  }}
                >
                  <Send size={18} />
                </IconButton>
              </Box>
            </Paper>
          </>
        )}
      </Box>

      {/* ==================== DIALOG TÌM BẠN & KẾT BẠN MỚI ==================== */}
      <Dialog
        open={openAddFriendDialog}
        onClose={handleCloseAddFriendDialog}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        keepMounted={false}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              p: 1,
              boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.15)",
            },
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography component="span" variant="h6" sx={{ fontWeight: 800 }}>
            Tìm kiếm & Kết bạn mới
          </Typography>
          <IconButton size="small" onClick={handleCloseAddFriendDialog}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            placeholder="Nhập tên, email hoặc số điện thoại..."
            value={searchFriendInput}
            onChange={(e) => setSearchFriendInput(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "14px",
                bgcolor: "#f8fafc",
              },
            }}
          />

          {!searchFriendInput.trim() ? (
            <Box sx={{ textAlign: "center", py: 5, px: 2 }}>
              <Search size={36} color="#94a3b8" style={{ marginBottom: 12, opacity: 0.6 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#475569", mb: 0.5 }}>
                Tìm kiếm người dùng trên ChatApp
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                Nhập tên, email hoặc số điện thoại để tìm và gửi lời mời kết bạn.
              </Typography>
            </Box>
          ) : searchResults.length === 0 ? (
            isSearching ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 5, gap: 1.5 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ color: "#64748b" }}>
                  Đang tìm kiếm người dùng...
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  Không tìm thấy người dùng nào phù hợp với từ khóa
                </Typography>
              </Box>
            )
          ) : (
            <Box sx={{ position: "relative" }}>
              {isSearching && (
                <LinearProgress sx={{ mb: 1.5, height: 2, borderRadius: 1 }} />
              )}
              <List sx={{ p: 0 }}>
                {searchResults.map((searchUser: UserRelationResult) => (
                  <ListItem
                    key={searchUser._id}
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "#f8fafc",
                      mb: 1,
                      p: 1.5,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={searchUser.avatar} sx={{ width: 42, height: 42 }}>
                        {searchUser.name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                          {searchUser.name}
                        </Typography>
                      }
                      secondary={
                        <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }} noWrap>
                          {searchUser.email}
                        </Typography>
                      }
                    />

                    {/* Nút theo trạng thái quan hệ */}
                    {searchUser.relationStatus === "friends" && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<MessageSquare size={14} />}
                        onClick={async () => {
                          await startConversationWithUser(searchUser);
                          setOpenAddFriendDialog(false);
                        }}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                      >
                        Nhắn tin
                      </Button>
                    )}

                    {searchUser.relationStatus === "pending_sent" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<Clock size={14} />}
                        onClick={async () => {
                          if (searchUser.requestId) {
                            const res = await cancelRequest(searchUser.requestId);
                            showToast(res.message, "info");
                          }
                        }}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                      >
                        Đã gửi (Hủy)
                      </Button>
                    )}

                    {searchUser.relationStatus === "pending_received" && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<Check size={14} />}
                        onClick={async () => {
                          if (searchUser.requestId) {
                            const res = await respondToRequest(searchUser.requestId, "accept");
                            showToast(res.message, "success");
                          }
                        }}
                        sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                      >
                        Chấp nhận
                      </Button>
                    )}

                    {searchUser.relationStatus === "none" && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<UserPlus size={14} />}
                        onClick={async () => {
                          const res = await sendFriendRequest(searchUser._id);
                          showToast(res.message, res.success ? "success" : "error");
                        }}
                        sx={{
                          textTransform: "none",
                          fontWeight: 700,
                          borderRadius: "8px",
                          bgcolor: "#2563eb",
                          "&:hover": { bgcolor: "#1d4ed8" },
                        }}
                      >
                        Kết bạn
                      </Button>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Global Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.type}
          variant="filled"
          sx={{ borderRadius: "12px", fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
