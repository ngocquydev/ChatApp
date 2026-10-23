"use client";

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  MouseEvent,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  Badge,
  CircularProgress,
  Popover,
  Grid,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Minus,
  X,
  Maximize2,
  Send,
  Smile,
  ThumbsUp,
  Circle,
  Check,
  CheckCheck,
  ChevronUp,
} from "lucide-react";
import api from "@/services/api";
import { mqttChatClient } from "@/services/mqttClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, ChatMessage, ChatUser } from "@/store/useChatStore";
import { useChatBoxStore, ChatBoxSession } from "@/store/useChatBoxStore";
import { soundNotification } from "@/utils/soundNotification";

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪"
];

// Styled online badge with pulsing ripple effect
const OnlineBadge = styled(Badge)<{ isonline?: string }>(({ theme, isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "#22c55e" : "#94a3b8",
    color: isonline === "true" ? "#22c55e" : "#94a3b8",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    width: 10,
    height: 10,
    borderRadius: "50%",
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation:
        isonline === "true" ? "chatPulse 1.5s infinite ease-in-out" : "none",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes chatPulse": {
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.2)", opacity: 0 },
  },
}));

interface FloatingChatBoxProps {
  session: ChatBoxSession;
  onClose: () => void;
  onToggleMinimize: () => void;
}

export default function FloatingChatBox({
  session,
  onClose,
  onToggleMinimize,
}: FloatingChatBoxProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { socket, onlineUserIds, startConversationWithUser } = useChatStore();
  const { setConversationId, incrementUnread, clearUnread } = useChatBoxStore();

  const [convId, setConvId] = useState<string | null>(session.conversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerSeenAt, setPartnerSeenAt] = useState<string | null>(null);

  // Emoji popover state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetUser = session.user;
  const targetUserId = String(targetUser._id || targetUser.id);
  const currentUserId = String(currentUser?._id || currentUser?.id);
  const isOnline = onlineUserIds.includes(targetUserId);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Hàm bắn typing chung (MQTT + Socket.IO)
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!convId) return;

      mqttChatClient.sendTyping(convId, targetUserId, isTyping);

      if (socket && socket.connected) {
        socket.emit(isTyping ? "typing:start" : "typing:stop", {
          conversationId: convId,
          receiverId: targetUserId,
        });
      }
    },
    [convId, targetUserId, socket]
  );

  // Đồng bộ convId nếu prop session.conversationId thay đổi từ bên ngoài
  useEffect(() => {
    if (session.conversationId && session.conversationId !== convId) {
      setConvId(session.conversationId);
    }
  }, [session.conversationId, convId]);

  // 1. Khởi tạo cuộc trò chuyện nếu chưa có convId
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      if (!targetUserId || targetUserId === "undefined") {
        setIsLoading(false);
        return;
      }

      // Tránh tự tạo cuộc trò chuyện với chính mình
      if (currentUserId && targetUserId === currentUserId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let currentConvId = convId || session.conversationId || null;
        if (!currentConvId) {
          const res = await api.post("/chat/conversations", {
            participantId: targetUserId,
          });
          const conversation = res.data?.conversation;
          if (conversation?._id) {
            currentConvId = conversation._id;
            if (isMounted) {
              setConvId(currentConvId);
              setConversationId(targetUserId, currentConvId!);
            }
          }
        }

        if (currentConvId && isMounted) {
          // Lấy lịch sử tin nhắn
          const msgRes = await api.get(`/chat/conversations/${currentConvId}/messages`);
          if (isMounted && msgRes.data?.messages) {
            setMessages(msgRes.data.messages);
          }

          // Đánh dấu đã đọc
          api.patch(`/chat/conversations/${currentConvId}/read`).catch(() => {});
          if (isMounted) {
            clearUnread(targetUserId);
          }

          // Báo qua socket
          if (socket && socket.connected) {
            socket.emit("message:read", {
              conversationId: currentConvId,
              receiverId: targetUserId,
            });
          }
        }
      } catch (error) {
        console.error("Lỗi khi tải hộp tin nhắn:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initConversation();

    return () => {
      isMounted = false;
    };
  }, [targetUserId, session.conversationId]);

  // Cuộn xuống đáy khi tin nhắn thay đổi hoặc khi un-minimize
  useEffect(() => {
    if (!session.isMinimized && !isLoading) {
      scrollToBottom("auto");
    }
  }, [messages, session.isMinimized, isLoading, scrollToBottom]);

  // 2. Lắng nghe qua MQTT Protocol Buffers nhị phân (Chuẩn Facebook Messenger) & Socket.IO
  useEffect(() => {
    const setPartnerTypingActive = () => {
      setIsPartnerTyping(true);
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      // Giữ trạng thái hiển thị trong 6.5s và tự tắt nếu người gửi không còn gửi heartbeat
      partnerTypingTimeoutRef.current = setTimeout(() => {
        setIsPartnerTyping(false);
      }, 6500);
    };

    const setPartnerTypingInactive = () => {
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
        partnerTypingTimeoutRef.current = null;
      }
      setIsPartnerTyping(false);
    };

    const unbindMqttMsg = mqttChatClient.onMessage((newMsg) => {
      if (newMsg.conversationId === convId) {
        setPartnerTypingInactive();
        const myId = String(currentUser?._id || currentUser?.id || "");
        if (newMsg.senderId && newMsg.senderId !== myId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, session.user.name);
        }
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m._id === newMsg._id || (m as any).id === newMsg.id
          );
          if (exists) return prev;
          return [...prev, newMsg as any];
        });

        if (!session.isMinimized) {
          mqttChatClient.sendRead(convId, targetUserId);
          api.patch(`/chat/conversations/${convId}/read`).catch(() => {});
          clearUnread(targetUserId);
        } else {
          incrementUnread(convId);
        }
      }
    });

    const unbindMqttTyping = mqttChatClient.onTyping((data) => {
      if (data.conversationId === convId && String(data.userId) === targetUserId) {
        if (data.isTyping) {
          setPartnerTypingActive();
        } else {
          setPartnerTypingInactive();
        }
      }
    });

    const unbindMqttSeen = mqttChatClient.onSeen((data) => {
      if (data.conversationId === convId && String(data.readerId) === targetUserId) {
        setPartnerSeenAt(data.readAt);
      }
    });

    // 2.2. Lắng nghe qua Socket.IO (Fallback)
    const handleNewMessage = (newMsg: ChatMessage) => {
      if (newMsg.conversationId === convId) {
        setPartnerTypingInactive();
        const myId = String(currentUser?._id || currentUser?.id || "");
        const senderId =
          typeof newMsg.senderId === "string"
            ? newMsg.senderId
            : String(newMsg.senderId?._id || (newMsg.senderId as any)?.id || "");
        if (senderId && senderId !== myId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, session.user.name);
        }
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === newMsg._id || m.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        if (!session.isMinimized) {
          if (socket && socket.connected) {
            socket.emit("message:read", {
              conversationId: convId,
              receiverId: targetUserId,
            });
          }
          api.patch(`/chat/conversations/${convId}/read`).catch(() => {});
          clearUnread(targetUserId);
        } else {
          incrementUnread(convId);
        }
      }
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === convId && String(data.userId) === targetUserId) {
        setPartnerTypingActive();
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === convId && String(data.userId) === targetUserId) {
        setPartnerTypingInactive();
      }
    };

    const handleMessageSeen = (data: {
      conversationId: string;
      readerId: string;
      readAt: string;
    }) => {
      if (data.conversationId === convId && String(data.readerId) === targetUserId) {
        setPartnerSeenAt(data.readAt);
      }
    };

    if (socket) {
      socket.on("message:new", handleNewMessage);
      socket.on("typing:start", handleTypingStart);
      socket.on("typing:stop", handleTypingStop);
      socket.on("message:seen", handleMessageSeen);
    }

    return () => {
      unbindMqttMsg();
      unbindMqttTyping();
      unbindMqttSeen();
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      if (socket) {
        socket.off("message:new", handleNewMessage);
        socket.off("typing:start", handleTypingStart);
        socket.off("typing:stop", handleTypingStop);
        socket.off("message:seen", handleMessageSeen);
      }
    };
  }, [socket, convId, targetUserId, session.isMinimized, clearUnread, incrementUnread]);

  // 3. Xử lý gõ chữ & bắn event typing nhị phân
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (!convId) return;

    // Nếu người dùng xóa sạch nội dung -> Dừng trạng thái typing ngay lập tức
    if (!text.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitTyping(false);
      lastTypingSentRef.current = 0;
      return;
    }

    // Khi người dùng đang soạn thảo: gửi tín hiệu typing:start định kỳ (mỗi 2.5s) để duy trì
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2500) {
      emitTyping(true);
      lastTypingSentRef.current = now;
    }

    // Xóa bộ đếm dừng cũ
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Chỉ khi dừng gõ quá 5 giây mới gửi tín hiệu dừng (tránh bị biến mất khi người dùng tạm dừng suy nghĩ)
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
      lastTypingSentRef.current = 0;
    }, 5000);
  };

  // 4. Gửi tin nhắn (ưu tiên Protocol Buffers nhị phân qua MQTT)
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? inputText).trim();
    if (!textToSend || !convId) return;

    // Ngừng typing ngay lập tức khi gửi tin
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    emitTyping(false);
    lastTypingSentRef.current = 0;

    if (!customText) {
      setInputText("");
    }

    // 1. Gửi qua MQTT Protocol Buffers nhị phân
    const sentViaMqtt = mqttChatClient.sendMessage(convId, targetUserId, textToSend);

    // 2. Fallback nếu MQTT chưa kết nối
    if (!sentViaMqtt) {
      const payload = {
        conversationId: convId,
        receiverId: targetUserId,
        text: textToSend,
      };

      if (socket && socket.connected) {
        socket.emit("message:send", payload);
      } else {
        try {
          const res = await api.post("/chat/messages", payload);
          if (res.data?.message) {
            setMessages((prev) => [...prev, res.data.message]);
          }
        } catch (err) {
          console.error("Lỗi gửi tin nhắn qua REST API:", err);
        }
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 5. Mở toàn màn hình trong trang /chat
  const handleOpenFullChat = async () => {
    try {
      await startConversationWithUser(targetUser);
      onClose();
      router.push("/chat");
    } catch (err) {
      console.error("Lỗi chuyển sang trang Chat:", err);
      router.push("/chat");
    }
  };

  // 6. Xử lý emoji
  const handleOpenEmoji = (event: MouseEvent<HTMLButtonElement>) => {
    setEmojiAnchorEl(event.currentTarget);
  };
  const handleCloseEmoji = () => {
    setEmojiAnchorEl(null);
  };
  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    handleCloseEmoji();
  };

  // Nhận diện người gửi là mình
  const isSenderMe = (msg: ChatMessage) => {
    const sId =
      typeof msg.senderId === "string"
        ? msg.senderId
        : (msg.senderId as any)?._id || (msg.senderId as any)?.id;
    return String(sId) === currentUserId;
  };

  // Định dạng thời gian
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Paper
      elevation={8}
      sx={{
        width: { xs: 290, sm: 330 },
        height: session.isMinimized ? 46 : 450,
        display: "flex",
        flexDirection: "column",
        borderRadius: "14px 14px 0 0",
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
        transition: "height 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        bgcolor: "#ffffff",
        pointerEvents: "auto",
      }}
    >
      {/* HEADER: Kiểu Facebook Messenger */}
      <Box
        onClick={session.isMinimized ? onToggleMinimize : undefined}
        sx={{
          height: 46,
          px: 1.5,
          bgcolor: "#ffffff",
          borderBottom: session.isMinimized ? "none" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: session.isMinimized ? "pointer" : "default",
          userSelect: "none",
          transition: "background-color 0.15s",
          "&:hover": session.isMinimized ? { bgcolor: "#f1f5f9" } : {},
        }}
      >
        {/* Avatar & Tên */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            minWidth: 0,
            flex: 1,
            cursor: "pointer",
          }}
          onClick={onToggleMinimize}
        >
          <OnlineBadge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            isonline={isOnline ? "true" : "false"}
          >
            <Avatar
              src={targetUser.avatar || ""}
              sx={{
                width: 32,
                height: 32,
                bgcolor: "#2563eb",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              {(targetUser.name || "U")[0].toUpperCase()}
            </Avatar>
          </OnlineBadge>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                {targetUser.name}
              </Typography>

              {session.isMinimized && session.unreadCount > 0 && (
                <Box
                  sx={{
                    bgcolor: "#ef4444",
                    color: "white",
                    borderRadius: "10px",
                    px: 0.7,
                    py: 0.1,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  +{session.unreadCount}
                </Box>
              )}
            </Box>

            {!session.isMinimized && (
              <Typography
                variant="caption"
                noWrap
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.72rem",
                  color: isOnline ? "#16a34a" : "#64748b",
                  fontWeight: isOnline ? 600 : 400,
                  lineHeight: 1,
                }}
              >
                {isOnline ? "Đang hoạt động" : "Offline"}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Nút hành động */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
          <Tooltip title={session.isMinimized ? "Mở rộng" : "Thu nhỏ"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMinimize();
              }}
              sx={{
                color: "#64748b",
                p: 0.6,
                "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" },
              }}
            >
              {session.isMinimized ? <ChevronUp size={16} /> : <Minus size={16} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Mở trong trang Chat">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFullChat();
              }}
              sx={{
                color: "#64748b",
                p: 0.6,
                "&:hover": { bgcolor: "#f1f5f9", color: "#2563eb" },
              }}
            >
              <Maximize2 size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Đóng">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              sx={{
                color: "#64748b",
                p: 0.6,
                "&:hover": { bgcolor: "#fee2e2", color: "#ef4444" },
              }}
            >
              <X size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* BODY KHI MỞ RỘNG */}
      {!session.isMinimized && (
        <>
          {/* VÙNG DANH SÁCH TIN NHẮN */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 1.5,
              bgcolor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              scrollbarWidth: "thin",
            }}
          >
            {isLoading ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  gap: 1.5,
                  color: "#94a3b8",
                }}
              >
                <CircularProgress size={24} />
                <Typography variant="caption">Đang tải tin nhắn...</Typography>
              </Box>
            ) : messages.length === 0 ? (
              // Trạng thái chưa có tin nhắn: Chào mừng kiểu Facebook
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  px: 2,
                  py: 3,
                }}
              >
                <Avatar
                  src={targetUser.avatar || ""}
                  sx={{
                    width: 58,
                    height: 58,
                    mb: 1.2,
                    bgcolor: "#2563eb",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  {(targetUser.name || "U")[0].toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
                  {targetUser.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "#64748b", mb: 2, display: "block", maxWidth: 200 }}
                >
                  Các bạn đã kết nối trên ChatApp. Hãy bắt đầu cuộc trò chuyện!
                </Typography>
                <Box
                  component="button"
                  onClick={() => handleSendMessage("👋 Chào bạn!")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    bgcolor: "#eff6ff",
                    color: "#2563eb",
                    border: "1px solid #bfdbfe",
                    borderRadius: "20px",
                    px: 2,
                    py: 0.7,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: "#dbeafe",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  👋 Nói xin chào!
                </Box>
              </Box>
            ) : (
              // Danh sách bong bóng tin nhắn
              messages.map((msg, index) => {
                const isMe = isSenderMe(msg);
                const isLastMsg = index === messages.length - 1;
                const isSeen = Boolean(msg.readAt || partnerSeenAt);

                return (
                  <Box
                    key={msg._id || index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 0.8,
                        maxWidth: "85%",
                        flexDirection: isMe ? "row-reverse" : "row",
                      }}
                    >
                      {!isMe && (
                        <Avatar
                          src={targetUser.avatar || ""}
                          sx={{
                            width: 24,
                            height: 24,
                            fontSize: "0.65rem",
                            bgcolor: "#3b82f6",
                          }}
                        >
                          {(targetUser.name || "U")[0].toUpperCase()}
                        </Avatar>
                      )}

                      <Box
                        sx={{
                          p: 1.1,
                          px: 1.5,
                          borderRadius: isMe
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          bgcolor: isMe ? "#2563eb" : "#f1f5f9",
                          color: isMe ? "#ffffff" : "#0f172a",
                          fontSize: "0.86rem",
                          lineHeight: 1.38,
                          wordBreak: "break-word",
                          boxShadow: isMe
                            ? "0 1px 3px rgba(37, 99, 235, 0.25)"
                            : "none",
                        }}
                      >
                        {msg.text}
                      </Box>
                    </Box>

                    {/* Timestamp & Trạng thái đã xem */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.4,
                        mt: 0.2,
                        px: 0.5,
                        fontSize: "0.66rem",
                        color: "#94a3b8",
                      }}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMe && isLastMsg && isSeen && (
                        <Tooltip title="Đã xem">
                          <CheckCheck size={12} color="#2563eb" style={{ marginLeft: 2 }} />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}

            {/* Bouncing Dots khi bạn bè đang soạn tin nhắn */}
            {isPartnerTyping && (
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.8 }}>
                <Avatar
                  src={targetUser.avatar || ""}
                  sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "#3b82f6" }}
                >
                  {(targetUser.name || "U")[0].toUpperCase()}
                </Avatar>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 1.4,
                    py: 0.9,
                    borderRadius: "16px",
                    bgcolor: "#f1f5f9",
                    color: "#64748b",
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#94a3b8",
                      animation: "typingBounce 1.2s infinite ease-in-out",
                      animationDelay: "0ms",
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#94a3b8",
                      animation: "typingBounce 1.2s infinite ease-in-out",
                      animationDelay: "200ms",
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "#94a3b8",
                      animation: "typingBounce 1.2s infinite ease-in-out",
                      animationDelay: "400ms",
                    }}
                  />
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* FOOTER: Thanh nhập tin nhắn chuẩn Facebook Messenger */}
          <Box
            sx={{
              p: 1,
              px: 1.2,
              borderTop: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: 0.8,
            }}
          >
            {/* Nút chọn emoji */}
            <Tooltip title="Chọn biểu tượng cảm xúc">
              <IconButton
                size="small"
                onClick={handleOpenEmoji}
                sx={{
                  color: "#64748b",
                  p: 0.6,
                  "&:hover": { color: "#2563eb", bgcolor: "#eff6ff" },
                }}
              >
                <Smile size={19} />
              </IconButton>
            </Tooltip>

            {/* Ô nhập tin nhắn */}
            <TextField
              fullWidth
              size="small"
              placeholder="Aa"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "20px",
                  bgcolor: "#f1f5f9",
                  fontSize: "0.85rem",
                  py: 0.2,
                  px: 1.2,
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: "#cbd5e1" },
                  "&.Mui-focused fieldset": { borderColor: "#2563eb" },
                },
                "& .MuiInputBase-input": {
                  py: 0.6,
                },
              }}
            />

            {/* Nút Like 👍 nếu rỗng, hoặc nút Send nếu có chữ */}
            {inputText.trim() ? (
              <Tooltip title="Gửi (Enter)">
                <IconButton
                  size="small"
                  onClick={() => handleSendMessage()}
                  sx={{
                    bgcolor: "#2563eb",
                    color: "white",
                    p: 0.7,
                    "&:hover": { bgcolor: "#1d4ed8" },
                  }}
                >
                  <Send size={15} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Gửi Like">
                <IconButton
                  size="small"
                  onClick={() => handleSendMessage("👍")}
                  sx={{
                    color: "#2563eb",
                    p: 0.7,
                    "&:hover": { bgcolor: "#eff6ff", transform: "scale(1.1)" },
                    transition: "all 0.15s ease",
                  }}
                >
                  <ThumbsUp size={19} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* POPOVER EMOJI */}
          <Popover
            open={Boolean(emojiAnchorEl)}
            anchorEl={emojiAnchorEl}
            onClose={handleCloseEmoji}
            disableScrollLock
            anchorOrigin={{ vertical: "top", horizontal: "left" }}
            transformOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{
              paper: {
                sx: {
                  p: 1.2,
                  borderRadius: 2,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  maxWidth: 240,
                },
              },
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, mb: 1, display: "block" }}>
              Biểu tượng cảm xúc
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 0.8,
              }}
            >
              {POPULAR_EMOJIS.map((emoji) => (
                <Box
                  component="button"
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  sx={{
                    fontSize: "1.25rem",
                    p: 0.5,
                    border: "none",
                    bgcolor: "transparent",
                    cursor: "pointer",
                    borderRadius: "6px",
                    transition: "transform 0.1s, background-color 0.1s",
                    "&:hover": {
                      bgcolor: "#f1f5f9",
                      transform: "scale(1.2)",
                    },
                  }}
                >
                  {emoji}
                </Box>
              ))}
            </Box>
          </Popover>
        </>
      )}

      {/* Global CSS animation for typing */}
      <style jsx global>{`
        @keyframes typingBounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </Paper>
  );
}
