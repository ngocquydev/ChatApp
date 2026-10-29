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
  ButtonBase,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  CircularProgress,
  Popover,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Minus,
  X,
  Maximize2,
  Send,
  Smile,
  ThumbsUp,
  CheckCheck,
  ChevronUp,
  MoreVertical,
  Palette,
  ShieldAlert,
  Ban,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import api from "@/services/api";
import { isVideoUrl, uploadMedia } from "@/services/postsApi";
import { mqttChatClient } from "@/services/mqttClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, ChatMessage, ChatUser } from "@/store/useChatStore";
import { useChatBoxStore, ChatBoxSession } from "@/store/useChatBoxStore";
import { soundNotification } from "@/utils/soundNotification";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImageLightbox from "@/components/posts/ImageLightbox";
import ThemeSelectDialog from "@/components/chat/app/ThemeSelectDialog";
import RestrictInfoDialog from "@/components/chat/app/RestrictInfoDialog";
import { getChatTheme } from "@/components/chat/app/chatThemes";

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪",
];

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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetUser = session.user;
  const targetUserName = targetUser.name;
  const targetUserId = String(targetUser._id || targetUser.id);
  const currentUserId = String(currentUser?._id || currentUser?.id);

  const isBlocked = Boolean(blockedBy);
  const isBlockedByMe = Boolean(blockedBy && currentUserId && blockedBy === currentUserId);
  const isRestricted = Boolean(currentUserId && restrictedBy.includes(currentUserId));
  const isOnline = !isRestricted && onlineUserIds.includes(targetUserId);

  const chatTheme = getChatTheme(convTheme);

  const socketRef = useRef(socket);
  const isRestrictedRef = useRef(isRestricted);
  useEffect(() => {
    socketRef.current = socket;
    isRestrictedRef.current = isRestricted;
  }, [socket, isRestricted]);

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
        let currentConvId = session.conversationId || null;
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
          const sock = socketRef.current;
          if (!isRestrictedRef.current && sock && sock.connected) {
            sock.emit("message:read", {
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
  }, [targetUserId, currentUserId, session.conversationId, setConversationId, clearUnread]);

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
        if (newMsg.senderId && newMsg.senderId !== currentUserId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, targetUserName);
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
        const senderId =
          typeof newMsg.senderId === "string"
            ? newMsg.senderId
            : String(newMsg.senderId?._id || newMsg.senderId?.id || "");
        if (senderId && senderId !== currentUserId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, targetUserName);
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
  }, [socket, convId, targetUserId, currentUserId, targetUserName, session.isMinimized, clearUnread, incrementUnread]);

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

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !convId) return;
    e.target.value = "";
    setUploadingMedia(true);
    try {
      const res = await uploadMedia(file);
      if (res?.url) {
        await handleSendMessage(res.url);
      }
    } catch {
      // bỏ qua lỗi tải tệp
    } finally {
      setUploadingMedia(false);
    }
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
        height: session.isMinimized ? 48 : 450,
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px 16px 0 0",
        overflow: "hidden",
        border: "1px solid var(--mui-palette-divider)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.16)",
        transition: "height 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        bgcolor: "var(--mui-palette-background-paper)",
        pointerEvents: "auto",
      }}
    >
      {/* HEADER: Kiểu Facebook Messenger */}
      <Box
        sx={{
          height: 48,
          px: 1.25,
          bgcolor: "var(--mui-palette-background-paper)",
          borderBottom: session.isMinimized ? "none" : "1px solid var(--mui-palette-divider)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
        }}
      >
        {/* Avatar & Tên */}
        <ButtonBase
          component="div"
          aria-label={session.isMinimized ? `Mở rộng hộp chat với ${targetUser.name}` : `Thu nhỏ hộp chat với ${targetUser.name}`}
          onClick={onToggleMinimize}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "left",
            gap: 1.1,
            minWidth: 0,
            flex: 1,
            py: 0.5,
            px: 0.5,
            borderRadius: "10px",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <PresenceAvatar
            name={targetUser.name}
            src={targetUser.avatar}
            online={isOnline}
            size={32}
          />

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {targetUser.name}
              </Typography>

              {session.isMinimized && session.unreadCount > 0 && (
                <Box
                  sx={{
                    bgcolor: "error.main",
                    color: "common.white",
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
                  color: isOnline ? "success.main" : "text.secondary",
                  fontWeight: isOnline ? 600 : 400,
                  lineHeight: 1.1,
                }}
              >
                {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </Typography>
            )}
          </Box>
        </ButtonBase>

        {/* Nút hành động */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {!session.isMinimized && (
            <Tooltip title="Tùy chọn đoạn chat">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchorEl(e.currentTarget);
                }}
                sx={{
                  color: "text.secondary",
                  p: 0.6,
                  "&:hover": { bgcolor: "action.hover", color: "text.primary" },
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
              aria-label={session.isMinimized ? "Mở rộng hộp chat" : "Thu nhỏ hộp chat"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMinimize();
              }}
              sx={{
                color: "text.secondary",
                p: 0.6,
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
              }}
            >
              {session.isMinimized ? <ChevronUp size={16} /> : <Minus size={16} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Mở trong trang Chat">
            <IconButton
              size="small"
              aria-label="Mở trong trang Chat"
              onClick={(e) => {
                e.stopPropagation();
                void handleOpenFullChat();
              }}
              sx={{
                color: "text.secondary",
                p: 0.6,
                "&:hover": { bgcolor: "action.hover", color: "primary.main" },
              }}
            >
              <Maximize2 size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Đóng">
            <IconButton
              size="small"
              aria-label="Đóng hộp chat"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              sx={{
                color: "text.secondary",
                p: 0.6,
                "&:hover": { bgcolor: "var(--mui-palette-tone-fee2e2)", color: "error.main" },
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
            role="log"
            aria-live="polite"
            aria-label={`Tin nhắn với ${targetUser.name}`}
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 1.5,
              background: chatTheme.background,
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
                  color: chatTheme.metaTextColor,
                }}
              >
                <CircularProgress size={24} />
                <Typography variant="caption">Đang tải tin nhắn…</Typography>
              </Box>
            ) : messages.length === 0 ? (
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
                <PresenceAvatar name={targetUser.name} src={targetUser.avatar} online={isOnline} size={56} />
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: chatTheme.isDarkTheme ? "common.white" : "text.primary", mt: 1.25 }}
                >
                  {targetUser.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: chatTheme.metaTextColor, mb: 2, display: "block", maxWidth: 200 }}
                >
                  Các bạn đã kết nối trên ChatApp. Hãy bắt đầu cuộc trò chuyện!
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleSendMessage("👋 Chào bạn!")}
                  sx={{
                    borderRadius: "20px",
                    px: 2,
                    py: 0.6,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    bgcolor: "background.paper",
                  }}
                >
                  👋 Nói xin chào!
                </Button>
              </Box>
            ) : (
              messages.map((msg, index) => {
                const isMe = isSenderMe(msg);
                const isLastMsg = index === messages.length - 1;
                const isSeen = Boolean(msg.readAt || partnerSeenAt);
                const trimmed = msg.text?.trim() || "";
                const isMedia = !msg.isDeleted && /^https:\/\/res\.cloudinary\.com\//i.test(trimmed);
                const isVideo = isMedia && isVideoUrl(trimmed);

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
                          alt=""
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
                            bgcolor: chatTheme.isDarkTheme ? "rgba(30, 41, 59, 0.55)" : "action.hover",
                            color: chatTheme.metaTextColor,
                            fontSize: "0.82rem",
                            fontStyle: "italic",
                            border: "1px dashed",
                            borderColor: chatTheme.partnerBorder,
                            lineHeight: 1.38,
                          }}
                        >
                          Tin nhắn đã bị thu hồi
                        </Box>
                      ) : isMedia ? (
                        <Box
                          sx={{
                            overflow: "hidden",
                            borderRadius: isMe
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            maxWidth: 210,
                            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          }}
                        >
                          {isVideo ? (
                            <Box
                              component="video"
                              controls
                              preload="metadata"
                              src={trimmed}
                              sx={{ maxWidth: "100%", maxHeight: 200, display: "block", bgcolor: "common.black" }}
                            />
                          ) : (
                            <ButtonBase
                              onClick={() => setLightboxUrl(trimmed)}
                              aria-label="Phóng to ảnh trong tin nhắn"
                              sx={{ display: "block", width: "100%" }}
                            >
                              <Box
                                component="img"
                                src={trimmed}
                                alt="Ảnh trong tin nhắn"
                                loading="lazy"
                                sx={{ maxWidth: "100%", maxHeight: 200, display: "block" }}
                              />
                            </ButtonBase>
                          )}
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            p: 1.1,
                            px: 1.5,
                            borderRadius: isMe
                              ? "18px 18px 4px 18px"
                              : "18px 18px 18px 4px",
                            background: isMe ? chatTheme.bubbleMe : chatTheme.bubblePartner,
                            color: isMe ? chatTheme.bubbleMeColor : chatTheme.bubblePartnerColor,
                            border: isMe ? "none" : "1px solid",
                            borderColor: isMe ? "transparent" : chatTheme.partnerBorder,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            fontSize: "0.86rem",
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}
                        >
                          {msg.text}
                        </Box>
                      )}

                      {isMe && !msg.isDeleted && (
                        <Tooltip title="Thu hồi tin nhắn">
                          <IconButton
                            className="msg-delete-btn"
                            size="small"
                            onClick={() => setDeleteMsgId(msg._id || msg.id || null)}
                            sx={{
                              opacity: 0,
                              transition: "opacity 0.15s ease",
                              p: 0.4,
                              color: chatTheme.metaTextColor,
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "action.hover",
                              },
                            }}
                            aria-label="Thu hồi tin nhắn"
                          >
                            <Trash2 size={13} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Timestamp & Trạng thái đã xem */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.4,
                        mt: 0.25,
                        px: 0.5,
                        fontSize: "0.66rem",
                        color: chatTheme.metaTextColor,
                      }}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {isMe && isLastMsg && isSeen && !isRestricted && (
                        <Tooltip title="Đã xem">
                          <CheckCheck size={12} color="var(--mui-palette-brand-500)" style={{ marginLeft: 2 }} />
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
                  alt=""
                  sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "var(--mui-palette-brand-500)" }}
                >
                  {(targetUser.name || "U")[0].toUpperCase()}
                </Avatar>
                <Box
                  role="status"
                  aria-label={`${targetUser.name} đang soạn tin nhắn`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 1.4,
                    py: 1,
                    borderRadius: "16px 16px 16px 4px",
                    background: chatTheme.bubblePartner,
                    border: "1px solid",
                    borderColor: chatTheme.partnerBorder,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      aria-hidden
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        bgcolor: chatTheme.metaTextColor,
                        animation: `typingDot 1.2s infinite ${i * 0.15}s`,
                      }}
                    />
                  ))}
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
                borderTop: "1px solid var(--mui-palette-divider)",
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
                  sx={{ fontSize: "0.75rem", py: 0.3, px: 1.5, borderRadius: "8px" }}
                >
                  Bỏ chặn
                </Button>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                p: 1,
                px: 1.1,
                borderTop: "1px solid var(--mui-palette-divider)",
                bgcolor: "var(--mui-palette-background-paper)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={handleMediaSelect}
                aria-label="Chọn ảnh hoặc video để gửi"
              />
              <Tooltip title={uploadingMedia ? "Đang tải tệp lên…" : "Gửi ảnh hoặc video"}>
                <span>
                  <IconButton
                    size="small"
                    disabled={uploadingMedia}
                    aria-label="Gửi ảnh hoặc video"
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ color: "primary.main", p: 0.6 }}
                  >
                    {uploadingMedia ? <CircularProgress size={16} /> : <ImageIcon size={18} />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Nút chọn emoji */}
              <Tooltip title="Chọn biểu tượng cảm xúc">
                <IconButton
                  size="small"
                  aria-label="Chọn biểu tượng cảm xúc"
                  onClick={handleOpenEmoji}
                  sx={{
                    color: "text.secondary",
                    p: 0.6,
                    "&:hover": { color: "primary.main", bgcolor: "action.hover" },
                  }}
                >
                  <Smile size={18} />
                </IconButton>
              </Tooltip>

              {/* Ô nhập tin nhắn */}
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập tin nhắn…"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{
                  htmlInput: { "aria-label": "Nội dung tin nhắn" },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    bgcolor: "background.default",
                    fontSize: "0.85rem",
                    py: 0.2,
                    px: 1.2,
                    height: 36,
                    "& fieldset": { borderColor: "transparent" },
                    "&:hover fieldset": { borderColor: "divider" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputBase-input": {
                    py: 0.5,
                  },
                }}
              />

              {/* Nút Like 👍 nếu rỗng, hoặc nút Send nếu có chữ */}
              {inputText.trim() ? (
                <Tooltip title="Gửi (Enter)">
                  <IconButton
                    size="small"
                    aria-label="Gửi tin nhắn"
                    onClick={() => void handleSendMessage()}
                    sx={{
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      p: 0.7,
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    <Send size={15} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Gửi biểu tượng thích">
                  <IconButton
                    size="small"
                    aria-label="Gửi biểu tượng thích"
                    onClick={() => void handleSendMessage("👍")}
                    sx={{
                      color: "primary.main",
                      p: 0.7,
                      "&:hover": { bgcolor: "action.selected", transform: "scale(1.1)" },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ThumbsUp size={18} />
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
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  maxWidth: 240,
                },
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
              Biểu tượng cảm xúc
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 0.6,
              }}
            >
              {POPULAR_EMOJIS.map((emoji) => (
                <ButtonBase
                  key={emoji}
                  aria-label={`Chèn biểu tượng ${emoji}`}
                  onClick={() => handleSelectEmoji(emoji)}
                  sx={{
                    fontSize: "1.25rem",
                    p: 0.5,
                    borderRadius: "8px",
                    transition: "transform 0.1s, background-color 0.1s",
                    "&:hover": {
                      bgcolor: "action.hover",
                      transform: "scale(1.2)",
                    },
                  }}
                >
                  {emoji}
                </ButtonBase>
              ))}
            </Box>
          </Popover>
        </>
      )}

      <ImageLightbox
        src={lightboxUrl}
        alt="Ảnh trong tin nhắn"
        onClose={() => setLightboxUrl(null)}
      />

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
    </Paper>
  );
}
