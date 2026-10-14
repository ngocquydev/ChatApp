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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import {
  useChatStore,
  ConversationItem,
  ChatUser,
} from "../../store/useChatStore";
import api from "../../services/api";

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

  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = (user?._id || user?.id)?.toString();

  // Khởi tạo WebSocket và tải danh sách cuộc trò chuyện
  useEffect(() => {
    connectSocket();
    fetchConversations();

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, fetchConversations]);

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đối phương đang gõ
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversation, typingMap]);

  // Tìm kiếm người dùng khi nhập vào ô tìm kiếm
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayTimer = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
        const users: ChatUser[] = Array.isArray(res.data)
          ? res.data
          : res.data?.users || [];
        // Lọc bỏ chính mình
        setSearchResults(users.filter((u) => u._id !== currentUserId));
      } catch (err) {
        console.error("Lỗi tìm kiếm người dùng:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayTimer);
  }, [searchQuery, currentUserId]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText("");
    sendTyping(false);
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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
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

  // Lọc danh sách hội thoại theo searchQuery (khi không xem kết quả tìm kiếm user mới)
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    return conversations.filter((c) => {
      const p = c.participants.find((u) => u._id !== currentUserId);
      return p?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, currentUserId]);

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
      {/* ==================== CỘT TRÁI: DANH SÁCH HỘI THOẠI & TÌM KIẾM ==================== */}
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
        {/* Header Sidebar */}
        <Box sx={{ p: 2.5, pb: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: "#0f172a", display: { xs: "none", sm: "block" } }}
            >
              Hội thoại
            </Typography>
            <Chip
              label={`${onlineUserIds.length} trực tuyến`}
              size="small"
              icon={<Circle size={10} color="#22c55e" fill="#22c55e" />}
              sx={{
                bgcolor: "#f0fdf4",
                color: "#166534",
                fontWeight: 600,
                display: { xs: "none", sm: "flex" },
              }}
            />
          </Box>

          {/* Ô Tìm kiếm bạn bè / hội thoại */}
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm bạn bè hoặc tin nhắn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              display: { xs: "none", sm: "block" },
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
                    <Search size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <X size={14} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Box>

        <Divider />

        {/* Danh sách người dùng tìm kiếm (nếu có searchQuery) */}
        {searchQuery.trim() && (
          <Box sx={{ p: 1.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, px: 1 }}>
              KẾT QUẢ TÌM KIẾM NGƯỜI DÙNG:
            </Typography>
            {isSearching ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                <CircularProgress size={20} />
              </Box>
            ) : searchResults.length === 0 ? (
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", p: 1 }}>
                Không tìm thấy người dùng phù hợp
              </Typography>
            ) : (
              <List dense sx={{ p: 0, mt: 0.5 }}>
                {searchResults.map((searchUser) => (
                  <ListItem
                    key={searchUser._id}
                    onClick={async () => {
                      await startConversationWithUser(searchUser);
                      setSearchQuery("");
                    }}
                    sx={{
                      borderRadius: "10px",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#eff6ff" },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={searchUser.avatar} sx={{ width: 36, height: 36 }}>
                        {searchUser.name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>
                          {searchUser.name}
                        </Typography>
                      }
                      secondary={
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }} noWrap>
                          {searchUser.email}
                        </Typography>
                      }
                    />
                    <UserPlus size={16} color="#3b82f6" />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

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
                Tìm kiếm bạn bè ở trên để bắt đầu nhắn tin!
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

                  {/* Thông tin tin nhắn (ẩn trên màn cực nhỏ) */}
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
              Chọn một cuộc hội thoại từ danh sách bên trái hoặc sử dụng thanh tìm kiếm để kết nối
              trực tiếp cùng bạn bè qua giao thức WebSocket thời gian thực.
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
    </Box>
  );
}
