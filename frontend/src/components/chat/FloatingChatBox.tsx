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
  InputAdornment,
  CircularProgress,
  Popover,
} from "@mui/material";
import {
  Minus,
  X,
  Send,
  Smile,
  ThumbsUp,
  CheckCheck,
  ChevronUp,
  ChevronDown,
  Palette,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Video,
  Paperclip,
} from "lucide-react";
import api from "@/services/api";
import { isVideoUrl, isAudioUrl, isFileDocUrl, uploadMedia, MAX_FILE_BYTES } from "@/services/postsApi";
import FileAttachmentItem from "./FileAttachmentItem";
import { mqttChatClient } from "@/services/mqttClient";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, ChatMessage, ChatUser, LocationData } from "@/store/useChatStore";
import { useChatBoxStore, ChatBoxSession } from "@/store/useChatBoxStore";
import { useCallStore } from "@/store/useCallStore";
import { useSoundStore } from "@/store/useSoundStore";
import { soundNotification } from "@/utils/soundNotification";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ImageLightbox from "@/components/posts/ImageLightbox";
import ThemeSelectDialog from "@/components/chat/app/ThemeSelectDialog";
import RestrictInfoDialog from "@/components/chat/app/RestrictInfoDialog";
import { getChatTheme } from "@/components/chat/app/chatThemes";
import { useTranslation } from "@/i18n/useTranslation";
import FloatingChatHeaderMenu from "./FloatingChatHeaderMenu";
import ReadReceiptsDialog from "./ReadReceiptsDialog";
import CallMessageItem from "./call/CallMessageItem";
import LocationMessageItem from "./LocationMessageItem";
import LocationPickerModal from "./LocationPickerModal";

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪",
];

function getBubbleRadius(isMe: boolean, isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) return "18px";
  if (isMe) {
    if (isFirst) return "18px 18px 4px 18px";
    if (isLast) return "18px 4px 18px 18px";
    return "18px 4px 4px 18px";
  }
  if (isFirst) return "18px 18px 18px 4px";
  if (isLast) return "4px 18px 18px 18px";
  return "4px 18px 18px 4px";
}

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
  const { tr } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const { socket, onlineUserIds, startConversationWithUser } = useChatStore();
  const { setConversationId, incrementUnread, clearUnread } = useChatBoxStore();
  const { isMuted, toggleMute } = useSoundStore();
  const { startCall } = useCallStore();

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
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false);
  const [openReadReceiptsDialog, setOpenReadReceiptsDialog] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("chat_read_receipts_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [openBlockConfirm, setOpenBlockConfirm] = useState(false);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [openLocationPicker, setOpenLocationPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
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
      const msgConvId = String(newMsg.conversationId || "");
      const currentConvId = String(convId || "");
      const msgSenderId = String(newMsg.senderId || "");
      const msgReceiverId = String(newMsg.receiverId || "");

      const isMatch =
        (Boolean(msgConvId) && Boolean(currentConvId) && msgConvId === currentConvId) ||
        (msgSenderId === targetUserId && msgReceiverId === currentUserId) ||
        (msgSenderId === currentUserId && msgReceiverId === targetUserId);

      if (isMatch) {
        if (!convId && msgConvId) {
          setConvId(msgConvId);
        }
        setPartnerTypingInactive();
        if (msgSenderId && msgSenderId !== currentUserId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, targetUserName);
        }
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m._id || m.id) === String(newMsg._id || newMsg.id)
          );
          if (exists) return prev;
          return [...prev, newMsg as unknown as ChatMessage];
        });

        if (!session.isMinimized) {
          mqttChatClient.sendRead(msgConvId || currentConvId, targetUserId);
          if (msgConvId || currentConvId) {
            api.patch(`/chat/conversations/${msgConvId || currentConvId}/read`).catch(() => {});
          }
          clearUnread(targetUserId);
        } else {
          incrementUnread(msgConvId || currentConvId);
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
      const msgConvId = String(newMsg.conversationId || "");
      const currentConvId = String(convId || "");
      const senderId =
        typeof newMsg.senderId === "string"
          ? newMsg.senderId
          : String(newMsg.senderId?._id || newMsg.senderId?.id || "");
      const receiverId =
        typeof newMsg.receiverId === "string"
          ? newMsg.receiverId
          : String(newMsg.receiverId?._id || newMsg.receiverId?.id || "");

      const isMatch =
        (Boolean(msgConvId) && Boolean(currentConvId) && msgConvId === currentConvId) ||
        (senderId === targetUserId && receiverId === currentUserId) ||
        (senderId === currentUserId && receiverId === targetUserId);

      if (isMatch) {
        if (!convId && msgConvId) {
          setConvId(msgConvId);
        }
        setPartnerTypingInactive();
        if (senderId && senderId !== currentUserId) {
          soundNotification.playIncomingSound(newMsg._id || newMsg.id, targetUserName);
        }
        setMessages((prev) => {
          const exists = prev.some(
            (m) => String(m._id || m.id) === String(newMsg._id || newMsg.id)
          );
          if (exists) return prev;
          return [...prev, newMsg];
        });

        if (!session.isMinimized) {
          if (socket && socket.connected) {
            socket.emit("message:read", {
              conversationId: msgConvId || currentConvId,
              receiverId: targetUserId,
            });
          }
          if (msgConvId || currentConvId) {
            api.patch(`/chat/conversations/${msgConvId || currentConvId}/read`).catch(() => {});
          }
          clearUnread(targetUserId);
        } else {
          incrementUnread(msgConvId || currentConvId);
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

    const handleLiveLocationUpdated = (data: {
      messageId: string;
      conversationId: string;
      senderId: string;
      location: LocationData;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id || m.id) === String(data.messageId)
            ? {
                ...m,
                location: m.location ? { ...m.location, ...data.location } : data.location,
              }
            : m
        )
      );
    };

    const handleLocalLocationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string } & Partial<LocationData>>;
      const { messageId, ...locUpdate } = customEvent.detail || {};
      if (!messageId) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m._id || m.id) !== String(messageId)) return m;
          if (!m.location) return m;
          return {
            ...m,
            location: { ...m.location, ...locUpdate },
          };
        })
      );
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
      socket.on("location:live_updated", handleLiveLocationUpdated);
    }
    window.addEventListener("chatapp:location_updated", handleLocalLocationUpdate);

    return () => {
      unbindMqttMsg();
      unbindMqttTyping();
      unbindMqttSeen();
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      window.removeEventListener("chatapp:location_updated", handleLocalLocationUpdate);
      if (socket) {
        socket.off("message:new", handleNewMessage);
        socket.off("typing:start", handleTypingStart);
        socket.off("typing:stop", handleTypingStop);
        socket.off("message:seen", handleMessageSeen);
        socket.off("conversation:theme_updated", handleThemeUpdated);
        socket.off("conversation:blocked", handleBlocked);
        socket.off("conversation:unblocked", handleUnblocked);
        socket.off("message:deleted", handleMessageDeleted);
        socket.off("location:live_updated", handleLiveLocationUpdated);
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
  const handleSendMessage = async (
    customText?: string,
    options?: { type?: "location"; location?: LocationData },
  ) => {
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

    const isLocationMsg = options?.type === "location" && options.location;

    // 1. Gửi qua MQTT Protocol Buffers nhị phân nếu là tin nhắn text thường
    let sentViaMqtt = false;
    if (!isLocationMsg) {
      sentViaMqtt = mqttChatClient.sendMessage(convId, targetUserId, textToSend);
    }

    // 2. Gửi qua Socket.IO hoặc Fallback REST API
    if (!sentViaMqtt) {
      const payload: {
        conversationId: string;
        receiverId: string;
        text: string;
        type?: "text" | "location";
        location?: LocationData;
      } = {
        conversationId: convId,
        receiverId: targetUserId,
        text: textToSend,
        type: options?.type,
        location: options?.location,
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

  const handleToggleReadReceipts = (enabled: boolean) => {
    setReadReceiptsEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("chat_read_receipts_enabled", String(enabled));
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
    if (file.size > MAX_FILE_BYTES) return;
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !convId) return;
    e.target.value = "";
    if (file.size > MAX_FILE_BYTES) return;
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
        width: { xs: 295, sm: 338 },
        height: session.isMinimized ? 52 : 455,
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
          height: 54,
          px: 1,
          bgcolor: "var(--mui-palette-background-paper)",
          borderBottom: session.isMinimized ? "none" : "1px solid var(--mui-palette-divider)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {/* Avatar & Tên (Nhấn để mở Menu cài đặt đoạn chat như Facebook Messenger) */}
        <ButtonBase
          component="div"
          aria-label={
            session.isMinimized
              ? tr(`Mở rộng hộp chat với ${targetUser.name}`, `Expand chat with ${targetUser.name}`)
              : tr(`Mở tùy chọn đoạn chat với ${targetUser.name}`, `Open chat options with ${targetUser.name}`)
          }
          onClick={(e) => {
            if (session.isMinimized) {
              onToggleMinimize();
            } else {
              setMenuAnchorEl(e.currentTarget);
            }
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            textAlign: "left",
            gap: 1.1,
            minWidth: 0,
            flex: 1,
            py: 0.6,
            px: 0.75,
            borderRadius: "10px",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <PresenceAvatar
            name={targetUser.name}
            src={targetUser.avatar}
            online={isOnline}
            size={34}
          />

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "text.primary",
                  lineHeight: 1.25,
                }}
              >
                {targetUser.name}
              </Typography>

              {!session.isMinimized && (
                <ChevronDown size={15} color="var(--mui-palette-primary-main)" style={{ flexShrink: 0 }} aria-hidden />
              )}

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
                  display: "block",
                  fontSize: "0.72rem",
                  color: isOnline ? "success.main" : "text.secondary",
                  fontWeight: isOnline ? 600 : 400,
                  lineHeight: 1.15,
                }}
              >
                {isOnline ? tr("Đang hoạt động", "Online") : tr("Ngoại tuyến", "Offline")}
              </Typography>
            )}
          </Box>
        </ButtonBase>

        {/* Nút Gọi thoại, Gọi video, Thu nhỏ (-) & Đóng (×) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
          {!session.isMinimized && (
            <>
              <Tooltip title={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}>
                <IconButton
                  size="small"
                  aria-label={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}
                  onClick={(e) => {
                    e.stopPropagation();
                    void startCall(
                      {
                        id: targetUserId,
                        name: targetUser.name,
                        avatar: targetUser.avatar,
                        conversationId: convId || undefined,
                      },
                      "audio"
                    );
                  }}
                  sx={{
                    color: "primary.main",
                    p: 0.65,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Phone size={18} />
                </IconButton>
              </Tooltip>

              <Tooltip title={tr("Bắt đầu cuộc gọi video", "Start video call")}>
                <IconButton
                  size="small"
                  aria-label={tr("Bắt đầu cuộc gọi video", "Start video call")}
                  onClick={(e) => {
                    e.stopPropagation();
                    void startCall(
                      {
                        id: targetUserId,
                        name: targetUser.name,
                        avatar: targetUser.avatar,
                        conversationId: convId || undefined,
                      },
                      "video"
                    );
                  }}
                  sx={{
                    color: "primary.main",
                    p: 0.65,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Video size={18} />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title={session.isMinimized ? tr("Mở rộng", "Expand") : tr("Thu nhỏ", "Minimize")}>
            <IconButton
              size="small"
              aria-label={session.isMinimized ? tr("Mở rộng hộp chat", "Expand chat") : tr("Thu nhỏ hộp chat", "Minimize chat")}
              onClick={(e) => {
                e.stopPropagation();
                onToggleMinimize();
              }}
              sx={{
                color: "primary.main",
                p: 0.65,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {session.isMinimized ? <ChevronUp size={18} /> : <Minus size={18} />}
            </IconButton>
          </Tooltip>

          <Tooltip title={tr("Đóng đoạn chat", "Close chat")}>
            <IconButton
              size="small"
              aria-label={tr("Đóng hộp chat", "Close chat")}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              sx={{
                color: "primary.main",
                p: 0.65,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <X size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Menu tùy chọn chuẩn Facebook Messenger khi bấm vào tên/avatar hoặc nút 3 chấm trên Header */}
      <FloatingChatHeaderMenu
        anchorEl={menuAnchorEl}
        isMuted={isMuted}
        isRestricted={isRestricted}
        isBlockedByMe={isBlockedByMe}
        readReceiptsEnabled={readReceiptsEnabled}
        onClose={() => setMenuAnchorEl(null)}
        onOpenFullChat={() => void handleOpenFullChat()}
        onViewProfile={() => {
          onClose();
          router.push(`/profile/${targetUserId}`);
        }}
        onOpenTheme={() => setOpenThemeDialog(true)}
        onToggleMute={toggleMute}
        onOpenBlock={() => setOpenBlockConfirm(true)}
        onOpenReadReceipts={() => setOpenReadReceiptsDialog(true)}
        onOpenRestrict={() => setOpenRestrictDialog(true)}
        onArchiveChat={() => void handleToggleRestrict()}
        onCloseChat={onClose}
      />

      {/* BODY KHI MỞ RỘNG */}
      {!session.isMinimized && (
        <>
          {/* VÙNG DANH SÁCH TIN NHẮN */}
          <Box
            role="log"
            aria-live="polite"
            aria-label={tr(`Tin nhắn với ${targetUser.name}`, `Messages with ${targetUser.name}`)}
            sx={{
              flex: 1,
              overflowY: "auto",
              px: 1.25,
              py: 1.5,
              background: chatTheme.background,
              display: "flex",
              flexDirection: "column",
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
                <Typography variant="caption">{tr("Đang tải tin nhắn…", "Loading messages…")}</Typography>
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
                  {tr("Các bạn đã kết nối trên ChatApp. Hãy bắt đầu cuộc trò chuyện!", "You're connected on ChatApp. Start a conversation!")}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleSendMessage(tr("👋 Chào bạn!", "👋 Hello!"))}
                  sx={{
                    borderRadius: "20px",
                    px: 2,
                    py: 0.6,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    bgcolor: "background.paper",
                  }}
                >
                  {tr("👋 Nói xin chào!", "👋 Say hello!")}
                </Button>
              </Box>
            ) : (
              messages.map((msg, index) => {
                const isMe = isSenderMe(msg);
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                const curTime = new Date(msg.createdAt || 0).getTime();
                const prevTime = prevMsg ? new Date(prevMsg.createdAt || 0).getTime() : 0;
                const nextTime = nextMsg ? new Date(nextMsg.createdAt || 0).getTime() : 0;

                const showTimeDivider = !prevMsg || curTime - prevTime > 10 * 60 * 1000;
                const sameAsPrev =
                  Boolean(prevMsg) &&
                  isSenderMe(prevMsg!) === isMe &&
                  curTime - prevTime <= 5 * 60 * 1000 &&
                  !showTimeDivider;
                const sameAsNext =
                  Boolean(nextMsg) &&
                  isSenderMe(nextMsg!) === isMe &&
                  nextTime - curTime <= 5 * 60 * 1000;

                const isFirstInGroup = !sameAsPrev;
                const isLastInGroup = !sameAsNext;
                const isLastMsg = index === messages.length - 1;
                const isSeen = Boolean(msg.readAt || partnerSeenAt);
                const trimmed = msg.text?.trim() || "";
                const isMedia = !msg.isDeleted && /^https:\/\/res\.cloudinary\.com\//i.test(trimmed);
                const isVideo = isMedia && isVideoUrl(trimmed);
                const isAudio = isMedia && isAudioUrl(trimmed);
                const isFileDoc = isMedia && isFileDocUrl(trimmed);
                const bubbleRadius = getBubbleRadius(isMe, isFirstInGroup, isLastInGroup);

                return (
                  <Box
                    key={msg._id || index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      mb: isLastInGroup ? 1 : 0.25,
                    }}
                  >
                    {showTimeDivider && (
                      <Typography
                        variant="caption"
                        sx={{
                          alignSelf: "center",
                          my: 1,
                          px: 1.25,
                          py: 0.2,
                          borderRadius: "999px",
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: chatTheme.dayPillColor,
                          bgcolor: chatTheme.dayPillBg,
                        }}
                      >
                        {formatTime(msg.createdAt)}
                      </Typography>
                    )}

                    <Box
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
                        {!isMe &&
                          (isLastInGroup ? (
                            <Avatar
                              src={targetUser.avatar || ""}
                              alt=""
                              sx={{
                                width: 26,
                                height: 26,
                                fontSize: "0.68rem",
                                bgcolor: "var(--mui-palette-brand-500)",
                                alignSelf: "flex-end",
                                flexShrink: 0,
                              }}
                            >
                              {(targetUser.name || "U")[0].toUpperCase()}
                            </Avatar>
                          ) : (
                            <Box sx={{ width: 26, flexShrink: 0 }} />
                          ))}

                        <Tooltip title={formatTime(msg.createdAt)} placement={isMe ? "left" : "right"} enterDelay={400}>
                          {msg.isDeleted ? (
                            <Box
                              sx={{
                                py: 0.85,
                                px: 1.4,
                                borderRadius: bubbleRadius,
                                bgcolor: chatTheme.isDarkTheme ? "rgba(30, 41, 59, 0.55)" : "action.hover",
                                color: chatTheme.metaTextColor,
                                fontSize: "0.82rem",
                                fontStyle: "italic",
                                border: "1px dashed",
                                borderColor: chatTheme.partnerBorder,
                                lineHeight: 1.38,
                              }}
                            >
                              {tr("Tin nhắn đã bị thu hồi", "Message unsent")}
                            </Box>
                          ) : msg.type === "call" || Boolean(msg.callLog) || /^(📞|📹)\s*Cuộc gọi/i.test(trimmed) ? (
                            <CallMessageItem
                              message={msg}
                              isMe={isMe}
                              partner={{
                                id: targetUserId,
                                name: targetUser.name,
                                avatar: targetUser.avatar,
                              }}
                              conversationId={convId || undefined}
                            />
                          ) : msg.type === "location" || Boolean(msg.location) ? (
                            <LocationMessageItem message={msg} isMe={isMe} />
                          ) : isMedia ? (
                            isFileDoc ? (
                              <FileAttachmentItem url={trimmed} isMe={isMe} />
                            ) : isAudio ? (
                              <Box
                                sx={{
                                  p: 0.8,
                                  borderRadius: bubbleRadius,
                                  bgcolor: isMe ? "rgba(255, 255, 255, 0.15)" : "var(--mui-palette-background-paper)",
                                  border: "1px solid",
                                  borderColor: isMe ? "rgba(255, 255, 255, 0.25)" : "var(--mui-palette-divider)",
                                  maxWidth: 210,
                                }}
                              >
                                <Box
                                  component="audio"
                                  controls
                                  preload="metadata"
                                  src={trimmed}
                                  sx={{ width: "100%", height: 32, display: "block" }}
                                />
                              </Box>
                            ) : (
                            <Box
                              sx={{
                                overflow: "hidden",
                                borderRadius: bubbleRadius,
                                maxWidth: 210,
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
                                  aria-label={tr("Phóng to ảnh trong tin nhắn", "Zoom message image")}
                                  sx={{ display: "block", width: "100%" }}
                                >
                                  <Box
                                    component="img"
                                    src={trimmed}
                                    alt={tr("Ảnh trong tin nhắn", "Message image")}
                                    loading="lazy"
                                    sx={{ maxWidth: "100%", maxHeight: 200, display: "block" }}
                                  />
                                </ButtonBase>
                              )}
                            </Box>
                          )) : (
                            <Box
                              sx={{
                                py: 0.85,
                                px: 1.4,
                                borderRadius: bubbleRadius,
                                background: isMe ? chatTheme.bubbleMe : chatTheme.bubblePartner,
                                color: isMe ? chatTheme.bubbleMeColor : chatTheme.bubblePartnerColor,
                                border: isMe ? "none" : "1px solid",
                                borderColor: isMe ? "transparent" : chatTheme.partnerBorder,
                                fontSize: "0.875rem",
                                lineHeight: 1.38,
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.text}
                            </Box>
                          )}
                        </Tooltip>

                        {isMe && !msg.isDeleted && (
                          <Tooltip title={tr("Thu hồi tin nhắn", "Unsend message")}>
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
                              aria-label={tr("Thu hồi tin nhắn", "Unsend message")}
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>

                      {/* Trạng thái đã xem kiểu Facebook Messenger (chỉ hiện ở tin nhắn cuối cùng) */}
                      {isMe && isLastMsg && !isRestricted && (
                        <Box sx={{ display: "flex", alignItems: "center", mt: 0.35, pr: 0.25 }}>
                          {isSeen ? (
                            <Tooltip title={`${tr("Đã xem lúc", "Seen at")} ${formatTime(partnerSeenAt || msg.readAt || msg.createdAt)}`}>
                              <Avatar
                                src={targetUser.avatar || ""}
                                alt={tr(`Đã xem bởi ${targetUser.name}`, `Seen by ${targetUser.name}`)}
                                sx={{ width: 14, height: 14, fontSize: "0.5rem", bgcolor: "var(--mui-palette-brand-500)" }}
                              >
                                {(targetUser.name || "U")[0].toUpperCase()}
                              </Avatar>
                            </Tooltip>
                          ) : (
                            <Tooltip title={tr("Đã gửi", "Sent")}>
                              <CheckCheck size={12} color={chatTheme.metaTextColor} />
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}

            {/* Bouncing Dots khi bạn bè đang soạn tin nhắn */}
            {isPartnerTyping && (
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.8, mt: 0.5 }}>
                <Avatar
                  src={targetUser.avatar || ""}
                  alt=""
                  sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "var(--mui-palette-brand-500)" }}
                >
                  {(targetUser.name || "U")[0].toUpperCase()}
                </Avatar>
                <Box
                  role="status"
                  aria-label={tr(`${targetUser.name} đang soạn tin nhắn`, `${targetUser.name} is typing`)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.4,
                    px: 1.4,
                    py: 1,
                    borderRadius: "18px 18px 18px 4px",
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

          {/* FOOTER: Thanh nhập tin nhắn chuẩn Facebook Messenger ("Aa" + Emoji bên trong) */}
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
                  ? tr("Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục trò chuyện.", "You have blocked this user. Unblock to continue chatting.")
                  : tr("Người dùng này hiện không thể nhận tin nhắn vào lúc này.", "This user cannot receive messages right now.")}
              </Typography>
              {isBlockedByMe && (
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleToggleBlock}
                  sx={{ fontSize: "0.75rem", py: 0.3, px: 1.5, borderRadius: "8px" }}
                >
                  {tr("Bỏ chặn", "Unblock")}
                </Button>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                py: 0.85,
                px: 1,
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
                aria-label={tr("Chọn ảnh hoặc video để gửi", "Choose image or video to send")}
              />
              <Tooltip title={uploadingMedia ? tr("Đang tải tệp lên…", "Uploading file…") : tr("Đính kèm ảnh hoặc video", "Attach image or video")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={uploadingMedia}
                    aria-label={tr("Đính kèm ảnh hoặc video", "Attach image or video")}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ color: "primary.main", p: 0.65 }}
                  >
                    {uploadingMedia ? <CircularProgress size={16} /> : <ImageIcon size={19} />}
                  </IconButton>
                </span>
              </Tooltip>

              <input
                ref={docInputRef}
                type="file"
                hidden
                onChange={handleFileSelect}
                aria-label={tr("Chọn tệp để gửi (tối đa 100MB)", "Choose file to send (max 100MB)")}
              />
              <Tooltip title={uploadingMedia ? tr("Đang tải tệp lên…", "Uploading file…") : tr("Đính kèm tệp (tối đa 100MB)", "Attach file (max 100MB)")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={uploadingMedia}
                    aria-label={tr("Đính kèm tệp (tối đa 100MB)", "Attach file (max 100MB)")}
                    onClick={() => docInputRef.current?.click()}
                    sx={{ color: "primary.main", p: 0.65 }}
                  >
                    <Paperclip size={18} />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={tr("Chia sẻ vị trí", "Share location")}>
                <IconButton
                  size="small"
                  aria-label={tr("Chia sẻ vị trí", "Share location")}
                  onClick={() => setOpenLocationPicker(true)}
                  sx={{ color: "primary.main", p: 0.65 }}
                >
                  <MapPin size={18} />
                </IconButton>
              </Tooltip>

              <Tooltip title={tr("Đổi chủ đề cuộc trò chuyện", "Change chat theme")}>
                <IconButton
                  size="small"
                  aria-label={tr("Đổi chủ đề cuộc trò chuyện", "Change chat theme")}
                  onClick={() => setOpenThemeDialog(true)}
                  sx={{ color: "primary.main", p: 0.65 }}
                >
                  <Palette size={18} />
                </IconButton>
              </Tooltip>

              {/* Ô nhập tin nhắn kiểu "Aa" có nút Emoji bên phải trong ô */}
              <TextField
                fullWidth
                size="small"
                placeholder="Aa"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{
                  htmlInput: { "aria-label": tr("Nội dung tin nhắn", "Message content") },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={tr("Chọn biểu tượng cảm xúc", "Choose emoji")}>
                          <IconButton
                            size="small"
                            aria-label={tr("Chọn biểu tượng cảm xúc", "Choose emoji")}
                            onClick={handleOpenEmoji}
                            sx={{ color: "primary.main", p: 0.4, mr: -0.5 }}
                          >
                            <Smile size={18} />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "999px",
                    bgcolor: "action.hover",
                    fontSize: "0.875rem",
                    py: 0.15,
                    pl: 1.5,
                    pr: 1,
                    height: 36,
                    "& fieldset": { borderColor: "transparent" },
                    "&:hover fieldset": { borderColor: "transparent" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputBase-input": {
                    py: 0.5,
                  },
                }}
              />

              {/* Nút Like 👍 nếu rỗng, hoặc nút Send nếu có chữ */}
              {inputText.trim() ? (
                <Tooltip title={tr("Gửi (Enter)", "Send (Enter)")}>
                  <IconButton
                    size="small"
                    aria-label={tr("Gửi tin nhắn", "Send message")}
                    onClick={() => void handleSendMessage()}
                    sx={{
                      color: "primary.main",
                      p: 0.7,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Send size={18} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title={tr("Gửi biểu tượng thích", "Send a like")}>
                  <IconButton
                    size="small"
                    aria-label={tr("Gửi biểu tượng thích", "Send a like")}
                    onClick={() => void handleSendMessage("👍")}
                    sx={{
                      color: "primary.main",
                      p: 0.7,
                      "&:hover": { bgcolor: "action.hover", transform: "scale(1.1)" },
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
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  maxWidth: 240,
                },
              },
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
              {tr("Biểu tượng cảm xúc", "Emojis")}
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
                  aria-label={tr(`Chèn biểu tượng ${emoji}`, `Insert emoji ${emoji}`)}
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
        alt={tr("Ảnh trong tin nhắn", "Message image")}
        onClose={() => setLightboxUrl(null)}
      />

      {/* Dialog Chọn Vị Trí Bản Đồ */}
      <LocationPickerModal
        open={openLocationPicker}
        onClose={() => setOpenLocationPicker(false)}
        onSelectLocation={(loc) => {
          const defaultText = loc.isLive
            ? tr("🛰️ Vị trí trực tiếp (Thời gian thực)", "🛰️ Live location (Real-time)")
            : (loc.name || loc.address || tr("📍 Vị trí đã ghim", "📍 Pinned Location"));
          void handleSendMessage(defaultText, {
            type: "location",
            location: loc,
          });
        }}
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

      {/* Dialog Thông Báo Đã Đọc */}
      <ReadReceiptsDialog
        open={openReadReceiptsDialog}
        enabled={readReceiptsEnabled}
        partnerName={targetUserName}
        onClose={() => setOpenReadReceiptsDialog(false)}
        onToggle={handleToggleReadReceipts}
      />

      {/* Dialog Xác Nhận Chặn / Bỏ Chặn */}
      <ConfirmDialog
        open={openBlockConfirm}
        title={isBlockedByMe ? tr("Bỏ chặn người dùng?", "Unblock user?") : tr(`Chặn ${targetUser.name}?`, `Block ${targetUser.name}?`)}
        description={
          isBlockedByMe
            ? tr("Sau khi bỏ chặn, hai bạn sẽ có thể gửi và nhận tin nhắn bình thường.", "After unblocking, you will be able to send and receive messages normally.")
            : tr("Người này sẽ không thể gửi tin nhắn cho bạn và bạn cũng không thể gửi tin nhắn cho họ cho đến khi bỏ chặn.", "This user won't be able to message you and you won't be able to message them until you unblock them.")
        }
        confirmLabel={isBlockedByMe ? tr("Bỏ chặn", "Unblock") : tr("Chặn người dùng", "Block user")}
        cancelLabel={tr("Hủy", "Cancel")}
        onClose={() => setOpenBlockConfirm(false)}
        onConfirm={handleToggleBlock}
      />

      {/* Dialog Xác Nhận Thu Hồi Tin Nhắn */}
      <ConfirmDialog
        open={Boolean(deleteMsgId)}
        title={tr("Thu hồi tin nhắn?", "Unsend message?")}
        description={tr("Tin nhắn này sẽ bị thu hồi với tất cả mọi người trong cuộc trò chuyện.", "This message will be unsent for everyone in the conversation.")}
        confirmLabel={tr("Thu hồi", "Unsend")}
        cancelLabel={tr("Hủy", "Cancel")}
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
