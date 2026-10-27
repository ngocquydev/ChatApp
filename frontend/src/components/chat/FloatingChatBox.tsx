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
  Button,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  Badge,
  CircularProgress,
  Popover,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
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
  MoreVertical,
  Palette,
  ShieldAlert,
  Ban,
  Trash2,
} from "lucide-react";
import api from "@/services/api";
import { mqttChatClient } from "@/services/mqttClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, ChatMessage, ChatUser } from "@/store/useChatStore";
import { useChatBoxStore, ChatBoxSession } from "@/store/useChatBoxStore";
import { soundNotification } from "@/utils/soundNotification";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ThemeSelectDialog from "@/components/chat/app/ThemeSelectDialog";
import RestrictInfoDialog from "@/components/chat/app/RestrictInfoDialog";
import { getChatTheme } from "@/components/chat/app/chatThemes";

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪"
];

// Styled online badge with pulsing ripple effect
const OnlineBadge = styled(Badge)<{ isonline?: string }>(({ isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "var(--mui-palette-tone-22c55e)" : "var(--mui-palette-neutral-400)",
    color: isonline === "true" ? "var(--mui-palette-tone-22c55e)" : "var(--mui-palette-neutral-400)",
    boxShadow: `0 0 0 2px var(--mui-palette-background-paper)`,
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

  // Theme, Block, Restrict, Delete states
  const [convTheme, setConvTheme] = useState<string>("default");
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [restrictedBy, setRestrictedBy] = useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false);
  const [openBlockConfirm, setOpenBlockConfirm] = useState(false);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetUser = session.user;
  const targetUserId = String(targetUser._id || targetUser.id);
  const currentUserId = String(currentUser?._id || currentUser?.id);

  const isBlocked = Boolean(blockedBy);
  const isBlockedByMe = Boolean(blockedBy && currentUserId && blockedBy === currentUserId);
  const isBlockedByPartner = Boolean(blockedBy && currentUserId && blockedBy !== currentUserId);
  const isRestricted = Boolean(currentUserId && restrictedBy.includes(currentUserId));
  const isOnline = !isRestricted && onlineUserIds.includes(targetUserId);

  const chatTheme = getChatTheme(convTheme);

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
              if (conversation.theme) setConvTheme(conversation.theme);
              if (conversation.blockedBy) setBlockedBy(conversation.blockedBy);
              if (conversation.restrictedBy) setRestrictedBy(conversation.restrictedBy);
            }
          }
        } else {
          try {
            const convListRes = await api.get("/chat/conversations");
            const found = convListRes.data?.conversations?.find((c: { _id: string }) => c._id === currentConvId);
            if (found && isMounted) {
              if (found.theme) setConvTheme(found.theme);
              if (found.blockedBy) setBlockedBy(found.blockedBy);
              if (found.restrictedBy) setRestrictedBy(found.restrictedBy);
            }
          } catch {}
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

          // Báo qua socket (chỉ khi không hạn chế)
          if (!isRestricted && socket && socket.connected) {
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
            (m) => m._id === newMsg._id || m.id === newMsg.id
          );
          if (exists) return prev;
          return [...prev, newMsg as unknown as ChatMessage];
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
            : String(newMsg.senderId?._id || newMsg.senderId?.id || "");
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

    const handleThemeUpdated = (data: { conversationId: string; theme: string }) => {
      if (data.conversationId === convId) {
        setConvTheme(data.theme);
      }
    };

    const handleBlocked = (data: { conversationId: string; blockedBy: string }) => {
      if (data.conversationId === convId) {
        setBlockedBy(data.blockedBy);
      }
    };

    const handleUnblocked = (data: { conversationId: string }) => {
      if (data.conversationId === convId) {
        setBlockedBy(null);
      }
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === convId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === data.messageId || m.id === data.messageId ? { ...m, isDeleted: true } : m
          )
        );
      }
    };

    if (socket) {
      socket.on("message:new", handleNewMessage);
      socket.on("typing:start", handleTypingStart);
      socket.on("typing:stop", handleTypingStop);
      socket.on("message:seen", handleMessageSeen);
      socket.on("conversation:theme_updated", handleThemeUpdated);
      socket.on("conversation:blocked", handleBlocked);
      socket.on("conversation:unblocked", handleUnblocked);
      socket.on("message:deleted", handleMessageDeleted);
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
        socket.off("conversation:theme_updated", handleThemeUpdated);
        socket.off("conversation:blocked", handleBlocked);
        socket.off("conversation:unblocked", handleUnblocked);
        socket.off("message:deleted", handleMessageDeleted);
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
    if (isBlocked || !textToSend || !convId) return;

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
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectTheme = async (newTheme: string) => {
    if (!convId) return;
    try {
      await api.patch(`/chat/conversations/${convId}/theme`, { theme: newTheme });
      if (socket && socket.connected) {
        socket.emit("conversation:theme", {
          conversationId: convId,
          theme: newTheme,
          partnerId: targetUserId,
        });
      }
      setConvTheme(newTheme);
    } catch (err) {
      console.error("Lỗi đổi chủ đề:", err);
    }
  };

  const handleToggleBlock = async () => {
    if (!convId) return;
    try {
      if (isBlockedByMe) {
        await api.patch(`/chat/conversations/${convId}/unblock`);
        if (socket && socket.connected) {
          socket.emit("conversation:unblock", {
            conversationId: convId,
            partnerId: targetUserId,
          });
        }
        setBlockedBy(null);
      } else {
        await api.patch(`/chat/conversations/${convId}/block`);
        if (socket && socket.connected) {
          socket.emit("conversation:block", {
            conversationId: convId,
            partnerId: targetUserId,
          });
        }
        setBlockedBy(currentUserId);
      }
    } catch (err) {
      console.error("Lỗi chặn/bỏ chặn:", err);
    }
  };

  const handleToggleRestrict = async () => {
    if (!convId) return;
    try {
      const nextRestricted = !isRestricted;
      await api.patch(`/chat/conversations/${convId}/restrict`, { restrict: nextRestricted });
      setRestrictedBy((prev) =>
        nextRestricted ? [...prev, currentUserId] : prev.filter((id) => id !== currentUserId)
      );
    } catch (err) {
      console.error("Lỗi hạn chế:", err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!convId) return;
    try {
      await api.delete(`/chat/messages/${msgId}`);
      if (socket && socket.connected) {
        socket.emit("message:delete", {
          messageId: msgId,
          conversationId: convId,
          partnerId: targetUserId,
        });
      }
      setMessages((prev) =>
        prev.map((m) => (m._id === msgId || m.id === msgId ? { ...m, isDeleted: true } : m))
      );
    } catch (err) {
      console.error("Lỗi xóa tin nhắn:", err);
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
        : msg.senderId?._id || msg.senderId?.id;
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
        border: "1px solid var(--mui-palette-neutral-300)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
        transition: "height 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        bgcolor: "var(--mui-palette-background-paper)",
        pointerEvents: "auto",
      }}
    >
      {/* HEADER: Kiểu Facebook Messenger */}
      <Box
        onClick={session.isMinimized ? onToggleMinimize : undefined}
        sx={{
          height: 46,
          px: 1.5,
          bgcolor: "var(--mui-palette-background-paper)",
          borderBottom: session.isMinimized ? "none" : "1px solid var(--mui-palette-neutral-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: session.isMinimized ? "pointer" : "default",
          userSelect: "none",
          transition: "background-color 0.15s",
          "&:hover": session.isMinimized ? { bgcolor: "var(--mui-palette-neutral-100)" } : {},
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
                bgcolor: "var(--mui-palette-brand-600)",
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
                  color: "var(--mui-palette-neutral-900)",
                  lineHeight: 1.2,
                }}
              >
                {targetUser.name}
              </Typography>

              {session.isMinimized && session.unreadCount > 0 && (
                <Box
                  sx={{
                    bgcolor: "var(--mui-palette-tone-ef4444)",
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
                  color: isOnline ? "var(--mui-palette-tone-16a34a)" : "var(--mui-palette-neutral-500)",
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
          {!session.isMinimized && (
            <Tooltip title="Tùy chọn đoạn chat">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchorEl(e.currentTarget);
                }}
                sx={{
                  color: "var(--mui-palette-neutral-500)",
                  p: 0.6,
                  "&:hover": { bgcolor: "var(--mui-palette-neutral-100)", color: "var(--mui-palette-neutral-900)" },
                }}
                aria-label="Tùy chọn cuộc trò chuyện"
              >
                <MoreVertical size={16} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={session.isMinimized ? "Mở rộng" : "Thu nhỏ"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMinimize();
              }}
              sx={{
                color: "var(--mui-palette-neutral-500)",
                p: 0.6,
                "&:hover": { bgcolor: "var(--mui-palette-neutral-100)", color: "var(--mui-palette-neutral-900)" },
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
                color: "var(--mui-palette-neutral-500)",
                p: 0.6,
                "&:hover": { bgcolor: "var(--mui-palette-neutral-100)", color: "var(--mui-palette-brand-600)" },
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
                color: "var(--mui-palette-neutral-500)",
                p: 0.6,
                "&:hover": { bgcolor: "var(--mui-palette-tone-fee2e2)", color: "var(--mui-palette-tone-ef4444)" },
              }}
            >
              <X size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Menu tùy chọn: Đổi nền, Hạn chế, Chặn */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "12px",
              minWidth: 195,
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              p: 0.5,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            setOpenThemeDialog(true);
          }}
          sx={{ py: 1, borderRadius: "8px" }}
        >
          <ListItemIcon>
            <Palette size={16} color="var(--mui-palette-primary-main)" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
              Đổi chủ đề / hình nền
            </Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            setOpenRestrictDialog(true);
          }}
          sx={{ py: 1, borderRadius: "8px" }}
        >
          <ListItemIcon>
            <ShieldAlert size={16} color="var(--mui-palette-warning-main)" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem" }}>
              {isRestricted ? "Bỏ hạn chế" : "Hạn chế người dùng"}
            </Typography>
          </ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setMenuAnchorEl(null);
            setOpenBlockConfirm(true);
          }}
          sx={{ py: 1, borderRadius: "8px", color: "error.main" }}
        >
          <ListItemIcon>
            <Ban size={16} color="var(--mui-palette-error-main)" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.82rem", color: "error.main" }}>
              {isBlockedByMe ? "Bỏ chặn người dùng" : "Chặn người dùng"}
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* BODY KHI MỞ RỘNG */}
      {!session.isMinimized && (
        <>
          {/* VÙNG DANH SÁCH TIN NHẮN */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 1.5,
              background: chatTheme.background,
              backgroundAttachment: "fixed",
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
                  color: "var(--mui-palette-neutral-400)",
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
                    bgcolor: "var(--mui-palette-brand-600)",
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  {(targetUser.name || "U")[0].toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                  {targetUser.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "var(--mui-palette-neutral-500)", mb: 2, display: "block", maxWidth: 200 }}
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
                    bgcolor: "var(--mui-palette-brand-50)",
                    color: "var(--mui-palette-brand-600)",
                    border: "1px solid var(--mui-palette-brand-200)",
                    borderRadius: "20px",
                    px: 2,
                    py: 0.7,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: "var(--mui-palette-brand-100)",
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
                      "&:hover .msg-delete-btn": { opacity: 1 },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
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
                            bgcolor: "var(--mui-palette-brand-500)",
                            alignSelf: "flex-end",
                          }}
                        >
                          {(targetUser.name || "U")[0].toUpperCase()}
                        </Avatar>
                      )}

                      {msg.isDeleted ? (
                        <Box
                          sx={{
                            p: 1.1,
                            px: 1.5,
                            borderRadius: isMe
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            bgcolor: "var(--mui-palette-neutral-100)",
                            color: "var(--mui-palette-neutral-500)",
                            fontSize: "0.82rem",
                            fontStyle: "italic",
                            border: "1px dashed var(--mui-palette-neutral-300)",
                            lineHeight: 1.38,
                          }}
                        >
                          Tin nhắn đã bị thu hồi
                        </Box>
                      ) : (
                        <>
                          <Box
                            sx={{
                              p: 1.1,
                              px: 1.5,
                              borderRadius: isMe
                                ? "18px 18px 4px 18px"
                                : "18px 18px 18px 4px",
                              background: isMe ? chatTheme.bubbleMe : undefined,
                              bgcolor: isMe ? undefined : "var(--mui-palette-neutral-100)",
                              color: isMe ? chatTheme.bubbleMeColor : "var(--mui-palette-neutral-900)",
                              fontSize: "0.86rem",
                              lineHeight: 1.38,
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.text}
                          </Box>

                          {isMe && (
                            <Tooltip title="Thu hồi tin nhắn">
                              <IconButton
                                className="msg-delete-btn"
                                size="small"
                                onClick={() => setDeleteMsgId(msg._id || msg.id || null)}
                                sx={{
                                  opacity: 0,
                                  transition: "opacity 0.15s ease",
                                  p: 0.4,
                                  color: "var(--mui-palette-neutral-400)",
                                  "&:hover": {
                                    color: "var(--mui-palette-tone-ef4444)",
                                    bgcolor: "var(--mui-palette-tone-fee2e2)",
                                  },
                                }}
                                aria-label="Thu hồi tin nhắn"
                              >
                                <Trash2 size={13} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </>
                      )}
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
                        color: "var(--mui-palette-neutral-400)",
                      }}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMe && isLastMsg && isSeen && !isRestricted && (
                        <Tooltip title="Đã xem">
                          <CheckCheck size={12} color="var(--mui-palette-brand-600)" style={{ marginLeft: 2 }} />
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
                  sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "var(--mui-palette-brand-500)" }}
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
                    bgcolor: "var(--mui-palette-neutral-100)",
                    color: "var(--mui-palette-neutral-500)",
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "var(--mui-palette-neutral-400)",
                      animation: "typingBounce 1.2s infinite ease-in-out",
                      animationDelay: "0ms",
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "var(--mui-palette-neutral-400)",
                      animation: "typingBounce 1.2s infinite ease-in-out",
                      animationDelay: "200ms",
                    }}
                  />
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      bgcolor: "var(--mui-palette-neutral-400)",
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
          {isBlocked ? (
            <Box
              sx={{
                p: 1.5,
                textAlign: "center",
                borderTop: "1px solid var(--mui-palette-neutral-200)",
                bgcolor: "var(--mui-palette-background-paper)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.8,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.78rem" }}>
                {isBlockedByMe
                  ? "Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục trò chuyện."
                  : "Người dùng này hiện không thể nhận tin nhắn vào lúc này."}
              </Typography>
              {isBlockedByMe && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleToggleBlock}
                  sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.3, px: 1.5, borderRadius: "6px" }}
                >
                  Bỏ chặn
                </Button>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                p: 1,
                px: 1.2,
                borderTop: "1px solid var(--mui-palette-neutral-200)",
                bgcolor: "var(--mui-palette-background-paper)",
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
                    color: "var(--mui-palette-neutral-500)",
                    p: 0.6,
                    "&:hover": { color: "var(--mui-palette-brand-600)", bgcolor: "var(--mui-palette-brand-50)" },
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
                    bgcolor: "var(--mui-palette-neutral-100)",
                    fontSize: "0.85rem",
                    py: 0.2,
                    px: 1.2,
                    "& fieldset": { borderColor: "transparent" },
                    "&:hover fieldset": { borderColor: "var(--mui-palette-neutral-300)" },
                    "&.Mui-focused fieldset": { borderColor: "transparent" },
                    "&.Mui-focused": { boxShadow: "none" },
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
                      bgcolor: "var(--mui-palette-brand-600)",
                      color: "white",
                      p: 0.7,
                      "&:hover": { bgcolor: "var(--mui-palette-brand-700)" },
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
                      color: "var(--mui-palette-brand-600)",
                      p: 0.7,
                      "&:hover": { bgcolor: "var(--mui-palette-brand-50)", transform: "scale(1.1)" },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ThumbsUp size={19} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

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
            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 700, mb: 1, display: "block" }}>
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
                      bgcolor: "var(--mui-palette-neutral-100)",
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

      {/* Dialog Chọn Hình Nền / Chủ Đề */}
      <ThemeSelectDialog
        open={openThemeDialog}
        currentTheme={convTheme}
        onClose={() => setOpenThemeDialog(false)}
        onSelectTheme={handleSelectTheme}
      />

      {/* Dialog Thông Tin Hạn Chế */}
      <RestrictInfoDialog
        open={openRestrictDialog}
        partner={targetUser as unknown as ChatUser}
        isRestricted={isRestricted}
        onClose={() => setOpenRestrictDialog(false)}
        onConfirm={handleToggleRestrict}
      />

      {/* Dialog Xác Nhận Chặn / Bỏ Chặn */}
      <ConfirmDialog
        open={openBlockConfirm}
        title={isBlockedByMe ? "Bỏ chặn người dùng?" : `Chặn ${targetUser.name}?`}
        description={
          isBlockedByMe
            ? "Sau khi bỏ chặn, hai bạn sẽ có thể gửi và nhận tin nhắn bình thường."
            : "Người này sẽ không thể gửi tin nhắn cho bạn và bạn cũng không thể gửi tin nhắn cho họ cho đến khi bỏ chặn."
        }
        confirmLabel={isBlockedByMe ? "Bỏ chặn" : "Chặn người dùng"}
        cancelLabel="Hủy"
        onClose={() => setOpenBlockConfirm(false)}
        onConfirm={handleToggleBlock}
      />

      {/* Dialog Xác Nhận Thu Hồi Tin Nhắn */}
      <ConfirmDialog
        open={Boolean(deleteMsgId)}
        title="Thu hồi tin nhắn?"
        description="Tin nhắn này sẽ bị thu hồi với tất cả mọi người trong cuộc trò chuyện."
        confirmLabel="Thu hồi"
        cancelLabel="Hủy"
        onClose={() => setDeleteMsgId(null)}
        onConfirm={() => {
          if (deleteMsgId) {
            void handleDeleteMessage(deleteMsgId);
            setDeleteMsgId(null);
          }
        }}
      />

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
