import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";

// Badge trạng thái Online/Offline tùy biến
const StyledBadge = styled(Badge)(({ theme, isonline }) => ({
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

// Dữ liệu mẫu danh sách cuộc hội thoại
const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    name: "Nguyễn Mai Anh",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    lastMessage: "File thiết kế giao diện UI em gửi qua mail rồi anh nhé!",
    time: "14:32",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Trần Hoàng Long",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100",
    lastMessage: "OK anh, chiều nay 3h họp sprint review nhé.",
    time: "11:15",
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: "Phạm Hồng Nhung",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    lastMessage: "Dự án chat realtime này chạy mượt quá!",
    time: "Hôm qua",
    unread: 0,
    online: false,
  },
  {
    id: 4,
    name: "Team Frontend Dev",
    avatar:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100",
    lastMessage: "Đã merge pull request tính năng đăng nhập.",
    time: "24/09",
    unread: 0,
    online: false,
  },
];

// Dữ liệu tin nhắn mẫu
const INITIAL_MESSAGES = [
  {
    id: 1,
    senderId: "other",
    text: "Chào bạn! Bản thiết kế trang đăng nhập và dashboard đã hoàn thành chưa nhỉ?",
    time: "14:20",
  },
  {
    id: 2,
    senderId: "me",
    text: "Mình vừa hoàn thành xong cả 2 trang, giao diện phối màu Clean SaaS rất đẹp mắt.",
    time: "14:25",
  },
  {
    id: 3,
    senderId: "other",
    text: "Tuyệt vời, bạn gửi demo qua đây cho mình xem qua trước nhé!",
    time: "14:28",
  },
  {
    id: 4,
    senderId: "me",
    text: "Đã gửi qua email của bạn rồi đó, bạn check thử xem có cần chỉnh sửa gì không.",
    time: "14:30",
  },
  {
    id: 5,
    senderId: "other",
    text: "File thiết kế giao diện UI em gửi qua mail rồi anh nhé!",
    time: "14:32",
  },
];

export default function ChatApp() {
  const [conversations] = useState(INITIAL_CONVERSATIONS);
  const [activeChat, setActiveChat] = useState(INITIAL_CONVERSATIONS[0]);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      senderId: "me",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        bgcolor: "#f1f5f9",
        overflow: "hidden",
      }}
    >
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
              fontWeight={800}
              sx={{ color: "#0f172a", display: { xs: "none", sm: "block" } }}
            >
              Hội thoại
            </Typography>
            <Chip
              label="Trực tuyến"
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

          {/* Ô Tìm kiếm */}
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm kiếm người liên hệ..."
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="#94a3b8" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        {/* Danh sách hội thoại cuộn dọc */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
          {filteredConversations.map((item) => {
            const isActive = activeChat.id === item.id;
            return (
              <Box
                key={item.id}
                onClick={() => setActiveChat(item)}
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
                  isonline={item.online ? "true" : "false"}
                >
                  <Avatar
                    src={item.avatar}
                    alt={item.name}
                    sx={{ width: 48, height: 48 }}
                  />
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
                      fontWeight={isActive ? 700 : 600}
                      sx={{ color: isActive ? "#1e40af" : "#0f172a" }}
                      noWrap
                    >
                      {item.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "#94a3b8", fontSize: "0.75rem" }}
                    >
                      {item.time}
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
                        color: item.unread > 0 ? "#1e293b" : "#64748b",
                        fontWeight: item.unread > 0 ? 600 : 400,
                        fontSize: "0.85rem",
                      }}
                      noWrap
                    >
                      {item.lastMessage}
                    </Typography>

                    {item.unread > 0 && (
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
                        {item.unread}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ==================== CỘT PHẢI: KHUNG CHAT CHÍNH ==================== */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
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
              isonline={activeChat.online ? "true" : "false"}
            >
              <Avatar
                src={activeChat.avatar}
                alt={activeChat.name}
                sx={{ width: 44, height: 44 }}
              />
            </StyledBadge>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{ color: "#0f172a", lineHeight: 1.2 }}
              >
                {activeChat.name}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: activeChat.online ? "#16a34a" : "#94a3b8",
                  fontWeight: 500,
                }}
              >
                {activeChat.online ? "Đang hoạt động" : "Ngoại tuyến"}
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
              <IconButton
                sx={{ color: "#64748b", "&:hover": { color: "#0f172a" } }}
              >
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
          <Box sx={{ textAlign: "center", my: 1 }}>
            <Chip
              label="Hôm nay"
              size="small"
              sx={{ bgcolor: "#e2e8f0", color: "#64748b", fontSize: "0.75rem" }}
            />
          </Box>

          {messages.map((msg) => {
            const isMe = msg.senderId === "me";
            return (
              <Box
                key={msg.id}
                sx={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 1.2,
                }}
              >
                {!isMe && (
                  <Avatar
                    src={activeChat.avatar}
                    sx={{ width: 32, height: 32, mb: 0.5 }}
                  />
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

                  {/* Thời gian & Trạng thái đã gửi */}
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
                      {msg.time}
                    </Typography>
                    {isMe && <CheckCheck size={14} color="#3b82f6" />}
                  </Box>
                </Box>
              </Box>
            );
          })}
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
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: { px: 1.5, py: 0.5, fontSize: "0.95rem" },
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
      </Box>
    </Box>
  );
}
