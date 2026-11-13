"use client";

import { useShallow } from "zustand/react/shallow";

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
  Clock,
  ChevronUp,
  ChevronDown,
  Trash2,
  MapPin,
  Phone,
  Video,
  Paperclip,
  Sparkles,
} from "lucide-react";
import api from "@/services/api";
import { uploadMedia, MAX_FILE_BYTES } from "@/services/postsApi";
import FloatingMessageList from "./FloatingMessageList";
import { decodeChatMessage, encodeSendMessage } from "@/services/chatBinary";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, ChatMessage, ChatUser, LocationData } from "@/store/useChatStore";
import { useChatBoxStore, ChatBoxSession } from "@/store/useChatBoxStore";
import { useCallStore } from "@/store/useCallStore";
import { useGroupCallStore } from "@/store/useGroupCallStore";
import { useSoundStore } from "@/store/useSoundStore";
import { soundNotification } from "@/utils/soundNotification";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import AppEmojiPicker from "@/components/common/AppEmojiPicker";
import type { ReactionType } from "@/components/reactions/reactionConstants";
import ImageLightbox from "@/components/posts/ImageLightbox";
import ThemeSelectDialog from "@/components/chat/app/ThemeSelectDialog";
import RestrictInfoDialog from "@/components/chat/app/RestrictInfoDialog";
import { getChatTheme } from "@/components/chat/app/chatThemes";
import { useTranslation } from "@/i18n/useTranslation";
import FloatingChatHeaderMenu from "./FloatingChatHeaderMenu";
import ReadReceiptsDialog from "./ReadReceiptsDialog";
import LocationPickerModal from "./LocationPickerModal";
import AppGiphyPicker from "@/components/common/AppGiphyPicker";
import { GifIcon } from "@/components/common/GifIcon";
import MentionAutocomplete, { MentionAutocompleteHandle } from "@/components/common/MentionAutocomplete";
import useMention from "@/hooks/useMention";
import AiChatSummaryDialog from "./AiChatSummaryDialog";
import AuraPromptSuggestions from "./AuraPromptSuggestions";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { AURA_BOT_ID, isAuraBot } from "@/constants/auraBot";

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪",
];

function mergeMessagesFromServer(
  serverMessages: ChatMessage[],
  currentMessages: ChatMessage[],
): ChatMessage[] {
  const serverIds = new Set(
    serverMessages.map((message) => String(message._id || message.id)),
  );

  return [
    ...serverMessages,
    ...currentMessages.filter(
      (message) => !serverIds.has(String(message._id || message.id)),
    ),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
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
  const currentUser = useAuthStore((state) => state.user);
  const { socket, onlineUserIds, startConversationWithUser } = useChatStore(useShallow((state) => ({
    socket: state.socket,
    onlineUserIds: state.onlineUserIds,
    startConversationWithUser: state.startConversationWithUser,
  })));
  const { setConversationId, incrementUnread, clearUnread } = useChatBoxStore(useShallow((state) => ({
    setConversationId: state.setConversationId,
    incrementUnread: state.incrementUnread,
    clearUnread: state.clearUnread,
  })));
  const { isMuted, toggleMute } = useSoundStore();
  const { startCall } = useCallStore();
  const { initiateGroupCall } = useGroupCallStore();

  const [convId, setConvId] = useState<string | null>(session.conversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const inputTextRef = useRef(inputText);
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);
  const isMultiline = inputText.includes("\n") || inputText.length > 25;
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [partnerSeenAt, setPartnerSeenAt] = useState<string | null>(null);

  // Emoji & GIF popover state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [gifAnchorEl, setGifAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Theme, Block, Restrict, Delete states
  const [convTheme, setConvTheme] = useState<string>("default");
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [restrictedBy, setRestrictedBy] = useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false);
  const [openReadReceiptsDialog, setOpenReadReceiptsDialog] = useState(false);
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const mentionRef = useRef<MentionAutocompleteHandle | null>(null);
  const { mentionOpen, mentionQuery, mentionAnchorEl, checkMention, insertMention, closeMention } = useMention(inputText, setInputText, inputRef);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("chat_read_receipts_enabled");
    return saved !== null ? saved === "true" : true;
  });
  const [openBlockConfirm, setOpenBlockConfirm] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showAuraSuggestions, setShowAuraSuggestions] = useState(false);
  const [openLocationPicker, setOpenLocationPicker] = useState(false);

  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const wasMinimizedRef = useRef(session.isMinimized);
  const wasLoadingRef = useRef(isLoading);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const partnerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const targetUser = session.user;
  const targetUserName = targetUser.name;
  const targetUserId = String(targetUser._id || targetUser.id);
  const currentUserId = String(currentUser?._id || currentUser?.id);

  const isAuraChat = isAuraBot(targetUserId);
  const isBlocked = Boolean(blockedBy);
  const isBlockedByMe = Boolean(blockedBy && currentUserId && blockedBy === currentUserId);
  const isRestricted = Boolean(currentUserId && restrictedBy.includes(currentUserId));
  const isOnline = isAuraChat || (!isRestricted && onlineUserIds.includes(targetUserId));

  const chatTheme = getChatTheme(convTheme);

  const socketRef = useRef(socket);
  const convIdRef = useRef(convId);
  const isRestrictedRef = useRef(isRestricted);
  useEffect(() => {
    socketRef.current = socket;
    convIdRef.current = convId;
    isRestrictedRef.current = isRestricted;
  }, [socket, convId, isRestricted]);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadOlderMessages = useCallback(async () => {
    if (!convId || !olderCursor || isLoadingOlder) return;
    const currentConversationId = convId;
    setIsLoadingOlder(true);
    setOlderError(false);
    try {
      const response = await api.get(`/chat/conversations/${currentConversationId}/messages`, {
        params: { before: olderCursor },
      });
      if (convIdRef.current !== currentConversationId || !Array.isArray(response.data?.messages)) return;
      setMessages((current) => mergeMessagesFromServer(response.data.messages, current));
      setOlderCursor(response.data.nextCursor ?? null);
    } catch (error) {
      setOlderError(true);
      throw error;
    } finally {
      setIsLoadingOlder(false);
    }
  }, [convId, olderCursor, isLoadingOlder]);

  useEffect(() => {
    setOlderCursor(null);
    setOlderError(false);
  }, [convId]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!convId) return;


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
          if (isMounted && Array.isArray(msgRes.data?.messages)) {
            setMessages((current) =>
              mergeMessagesFromServer(msgRes.data.messages, current),
            );
            setOlderCursor(msgRes.data.nextCursor ?? null);
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

  // Socket.IO cannot replay events missed while a tab is suspended or reconnecting.
  // Reconcile this floating chat with the server when the connection returns or
  // the user brings the tab back into view.
  useEffect(() => {
    if (!socket || !convId) return;

    let isCurrent = true;
    let isSyncing = false;

    const syncMessages = async () => {
      if (isSyncing) return;
      isSyncing = true;
      const requestedConversationId = convId;

      try {
        const response = await api.get(
          `/chat/conversations/${requestedConversationId}/messages`,
        );
        if (
          !isCurrent ||
          convIdRef.current !== requestedConversationId ||
          !Array.isArray(response.data?.messages)
        ) {
          return;
        }

        setMessages((current) =>
          mergeMessagesFromServer(response.data.messages, current),
        );
      } catch (error) {
        console.error("Lỗi đồng bộ tin nhắn của cửa sổ chat:", error);
      } finally {
        isSyncing = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && socket.connected) {
        void syncMessages();
      }
    };

    socket.on("connect", syncMessages);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (socket.connected) void syncMessages();

    return () => {
      isCurrent = false;
      socket.off("connect", syncMessages);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [socket, convId]);

  // Cuộn xuống đáy khi tin nhắn thay đổi hoặc khi un-minimize
  useEffect(() => {
    const latestId = String(messages[messages.length - 1]?._id || messages[messages.length - 1]?.id || "");
    const latestChanged = latestId !== lastMessageIdRef.current;
    const reopened = wasMinimizedRef.current && !session.isMinimized;
    const finishedLoading = wasLoadingRef.current && !isLoading;
    lastMessageIdRef.current = latestId;
    wasMinimizedRef.current = session.isMinimized;
    wasLoadingRef.current = isLoading;
    if (!session.isMinimized && !isLoading && (latestChanged || reopened || finishedLoading)) {
      scrollToBottom("auto");
    }
  }, [messages, session.isMinimized, isLoading, scrollToBottom]);

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

    const handleNewMessage = (payload: ArrayBuffer | Uint8Array) => {
      const newMsg = decodeChatMessage(payload) as ChatMessage;
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
          const realId = String(newMsg._id || newMsg.id);
          const existingIndex = prev.findIndex(
            (m) => String(m._id || m.id) === realId
          );
          if (existingIndex !== -1) {
            const copy = [...prev];
            copy[existingIndex] = {
              ...copy[existingIndex],
              ...newMsg,
              isStreaming: false,
            };
            return copy;
          }

          // Nếu tin nhắn do chính mình gửi, thay thế tin optimistic
          if (senderId === currentUserId) {
            const optIndex = prev.findIndex(
              (m) => m.isOptimistic && m.text.trim() === (newMsg.text || "").trim()
            );
            if (optIndex !== -1) {
              const copy = [...prev];
              copy[optIndex] = {
                ...newMsg,
                isOptimistic: false,
                status: "sent",
              };
              return copy;
            }
          }

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

    const handleMessageReaction = (data: {
      messageId: string;
      conversationId: string;
      reactions: { userId: string; type: string }[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id || m.id) === String(data.messageId)
            ? { ...m, reactions: data.reactions }
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

    const handleStreamStart = (newMsg: ChatMessage) => {
      const msgConvId = String(newMsg.conversationId || "");
      const currentConvId = String(convId || "");
      if (currentConvId && msgConvId && msgConvId !== currentConvId) return;
      setMessages((prev) => {
        const realId = String(newMsg._id || newMsg.id);
        const exists = prev.some((m) => String(m._id || m.id) === realId);
        if (exists) return prev;
        return [...prev, { ...newMsg, text: "", isStreaming: true }];
      });
      scrollToBottom("smooth");
    };

    const handleStreamChunk = (data: {
      messageId: string;
      conversationId: string;
      chunk: string;
      text: string;
    }) => {
      const msgConvId = String(data.conversationId || "");
      const currentConvId = String(convId || "");
      if (currentConvId && msgConvId && msgConvId !== currentConvId) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id || m.id) === String(data.messageId)
            ? { ...m, text: data.text, isStreaming: true }
            : m
        )
      );
      scrollToBottom("smooth");
    };

    const handleStreamEnd = (data: ChatMessage) => {
      const msgConvId = String(data.conversationId || "");
      const currentConvId = String(convId || "");
      if (currentConvId && msgConvId && msgConvId !== currentConvId) return;
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id || m.id) === String(data._id || data.id)
            ? { ...m, ...data, isStreaming: false }
            : m
        )
      );
      scrollToBottom("smooth");
    };

    if (socket) {
      socket.on("message:new:binary", handleNewMessage);
      socket.on("message:stream_start", handleStreamStart);
      socket.on("message:stream_chunk", handleStreamChunk);
      socket.on("message:stream_end", handleStreamEnd);
      socket.on("typing:start", handleTypingStart);
      socket.on("typing:stop", handleTypingStop);
      socket.on("message:seen", handleMessageSeen);
      socket.on("conversation:theme_updated", handleThemeUpdated);
      socket.on("conversation:blocked", handleBlocked);
      socket.on("conversation:unblocked", handleUnblocked);
      socket.on("message:deleted", handleMessageDeleted);
      socket.on("location:live_updated", handleLiveLocationUpdated);
      socket.on("message:reaction", handleMessageReaction);
    }
    window.addEventListener("chatapp:location_updated", handleLocalLocationUpdate);

    return () => {
      if (partnerTypingTimeoutRef.current) {
        clearTimeout(partnerTypingTimeoutRef.current);
      }
      window.removeEventListener("chatapp:location_updated", handleLocalLocationUpdate);
      if (socket) {
        socket.off("message:new:binary", handleNewMessage);
        socket.off("message:stream_start", handleStreamStart);
        socket.off("message:stream_chunk", handleStreamChunk);
        socket.off("message:stream_end", handleStreamEnd);
        socket.off("typing:start", handleTypingStart);
        socket.off("typing:stop", handleTypingStop);
        socket.off("message:seen", handleMessageSeen);
        socket.off("conversation:theme_updated", handleThemeUpdated);
        socket.off("conversation:blocked", handleBlocked);
        socket.off("conversation:unblocked", handleUnblocked);
        socket.off("message:deleted", handleMessageDeleted);
        socket.off("location:live_updated", handleLiveLocationUpdated);
        socket.off("message:reaction", handleMessageReaction);
      }
    };
  }, [socket, convId, targetUserId, currentUserId, targetUserName, session.isMinimized, clearUnread, incrementUnread, scrollToBottom]);

  // 3. Xử lý gõ chữ & bắn event typing nhị phân
  const handleInputChange = (text: string, cursorIndex?: number) => {
    setInputText(text);
    checkMention(text, cursorIndex);

    if (!convId) return;

    // Dọn dẹp timer cũ trước khi đặt timer mới (tránh tích lũy timer khi gõ nhanh)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Nếu người dùng xóa sạch nội dung -> Dừng trạng thái typing ngay lập tức
    if (!text.trim()) {
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

    // Chỉ khi dừng gõ quá 3.5 giây mới gửi tín hiệu dừng
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
      lastTypingSentRef.current = 0;
    }, 3500);
  };

  const handleSendMessage = useCallback(
    async (
      customText?: string,
      options?: { type?: "location"; location?: LocationData },
    ) => {
      const textToSend = (customText ?? inputTextRef.current).trim();
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
        setShowAuraSuggestions(false);
      }

      // TẠO TIN NHẮN LẠC QUAN (OPTIMISTIC UI): Hiển thị ngay lập tức (0ms)
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMsg: ChatMessage = {
        _id: tempId,
        id: tempId,
        conversationId: convId,
        senderId: currentUserId,
        receiverId: targetUserId,
        text: textToSend,
        type: options?.type || "text",
        location: options?.location || null,
        createdAt: new Date().toISOString(),
        readAt: null,
        isDeleted: false,
        isOptimistic: true,
        status: "sending",
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => scrollToBottom("smooth"), 10);

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
          socket.timeout(10_000).emit(
            "message:send:binary",
            encodeSendMessage(payload),
            (error: Error | null, response: { success?: boolean } | undefined) => {
              if (!error && response?.success) return;
              setMessages((prev) => prev.map((m) =>
                m._id === tempId ? { ...m, status: "error" } : m
              ));
            },
          );
        } else {
          try {
            const res = await api.post("/chat/messages", payload);
            if (res.data?.message) {
              const confirmed = res.data.message;
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === tempId ? { ...confirmed, isOptimistic: false, status: "sent" } : m
                )
              );
            }
          } catch (err) {
            console.error("Lỗi gửi tin nhắn qua REST API:", err);
            setMessages((prev) =>
              prev.map((m) => (m._id === tempId ? { ...m, status: "error" } : m))
            );
          }
        }
    },
    [
      isBlocked,
      convId,
      emitTyping,
      currentUserId,
      targetUserId,
      scrollToBottom,
      socket,
    ]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    if (mentionRef.current?.handleKeyDown(e as any)) return;
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
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

  const handleDeleteConversation = async () => {
    if (!convId) {
      onClose();
      return;
    }
    try {
      await useChatStore.getState().deleteConversation(convId);
      onClose();
    } catch (err) {
      console.error("Lỗi xóa hội thoại:", err);
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

  const handleReactMessage = useCallback(
    async (msgId: string, type: ReactionType) => {
      if (!convId) return;
      // Optimistic local update
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== msgId && m.id !== msgId) return m;
          const currentReactions = [...(m.reactions || [])];
          const existIdx = currentReactions.findIndex((r) => r.userId === currentUserId);
          if (existIdx > -1) {
            if (currentReactions[existIdx].type === type) {
              currentReactions.splice(existIdx, 1);
            } else {
              currentReactions[existIdx] = { ...currentReactions[existIdx], type };
            }
          } else {
            currentReactions.push({
              userId: currentUserId,
              type,
              createdAt: new Date().toISOString(),
            });
          }
          return { ...m, reactions: currentReactions };
        })
      );

      try {
        if (socket && socket.connected) {
          socket.emit("message:reaction", {
            messageId: msgId,
            conversationId: convId,
            type,
            receiverId: targetUserId,
          });
        } else {
          await api.post(`/chat/messages/${msgId}/reaction`, { type });
        }
      } catch (err) {
        console.error("Lỗi thả cảm xúc tin nhắn:", err);
      }
    },
    [convId, currentUserId, socket, targetUserId]
  );

  const handlePromptDeleteMessage = useCallback((msgId: string) => {
    setDeleteMsgId(msgId);
  }, []);

  const handleOpenLightbox = useCallback((url: string) => {
    setLightboxUrl(url);
  }, []);

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

              {isAuraChat && <VerifiedBadge size={15} />}

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
                  color: isAuraChat ? "primary.main" : isOnline ? "success.main" : "text.secondary",
                  fontWeight: isAuraChat || isOnline ? 600 : 400,
                  lineHeight: 1.15,
                }}
              >
                {isAuraChat
                  ? tr("Trợ lý ảo AI • Sẵn sàng", "AI Assistant • Ready")
                  : isOnline
                  ? tr("Đang hoạt động", "Online")
                  : tr("Ngoại tuyến", "Offline")}
              </Typography>
            )}
          </Box>
        </ButtonBase>

        {/* Nút Gọi thoại, Gọi video (ẩn với Aura AI), Thu nhỏ (-) & Đóng (×) */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
          {!session.isMinimized && !isAuraChat && (
            <>
              <Tooltip title={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}>
                <IconButton
                  size="small"
                  aria-label={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}
                  onClick={(e) => {
                    e.stopPropagation();
                    const groupConv = convId
                      ? useChatStore.getState().conversations.find((c) => c._id === convId && c.type === "group")
                      : null;
                    if (groupConv) {
                      void initiateGroupCall(
                        groupConv._id,
                        groupConv.name || tr("Nhóm chat", "Group chat"),
                        groupConv.avatar || undefined,
                        "audio"
                      );
                    } else {
                      void startCall(
                        {
                          id: targetUserId,
                          name: targetUser.name,
                          avatar: targetUser.avatar,
                          conversationId: convId || undefined,
                        },
                        "audio"
                      );
                    }
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
                    const groupConv = convId
                      ? useChatStore.getState().conversations.find((c) => c._id === convId && c.type === "group")
                      : null;
                    if (groupConv) {
                      void initiateGroupCall(
                        groupConv._id,
                        groupConv.name || tr("Nhóm chat", "Group chat"),
                        groupConv.avatar || undefined,
                        "video"
                      );
                    } else {
                      void startCall(
                        {
                          id: targetUserId,
                          name: targetUser.name,
                          avatar: targetUser.avatar,
                          conversationId: convId || undefined,
                        },
                        "video"
                      );
                    }
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
        isAuraChat={isAuraChat}
        onOpenSummary={() => setOpenSummaryDialog(true)}
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
        onDeleteChat={() => setOpenDeleteConfirm(true)}
      />

      {/* BODY KHI MỞ RỘNG */}
      {!session.isMinimized && (
        <>
          {/* VÙNG DANH SÁCH TIN NHẮN (ĐÃ MEMO HÓA QUA FloatingMessageList ĐỂ TRIỆT ĐỂ LOẠI BỎ LAG KHI GÕ CHỮ) */}
          <FloatingMessageList
            messages={messages}
            isLoading={isLoading}
            isAuraChat={isAuraChat}
            targetUser={targetUser}
            targetUserId={targetUserId}
            currentUserId={currentUserId}
            isOnline={isOnline}
            isPartnerTyping={isPartnerTyping}
            partnerSeenAt={partnerSeenAt}
            isRestricted={isRestricted}
            chatTheme={chatTheme}
            convId={convId}
            messagesEndRef={messagesEndRef}
            olderCursor={olderCursor}
            isLoadingOlder={isLoadingOlder}
            olderError={olderError}
            onLoadOlderMessages={loadOlderMessages}
            onSendMessage={handleSendMessage}
            onReactMessage={handleReactMessage}
            onDeleteMessage={handlePromptDeleteMessage}
            onOpenLightbox={handleOpenLightbox}
          />

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
            <Box sx={{ borderTop: "1px solid var(--mui-palette-divider)", bgcolor: "var(--mui-palette-background-paper)" }}>
              {(showAuraSuggestions || inputText.includes("@aura")) && (
                <AuraPromptSuggestions
                  onSelectPrompt={(promptText) => {
                    handleInputChange(promptText);
                    inputRef.current?.focus();
                  }}
                />
              )}
              <Box
                sx={{
                  py: 0.85,
                  px: 1,
                  display: "flex",
                  alignItems: isMultiline ? "flex-end" : "center",
                  gap: 0.5,
                }}
              >
              <input
                ref={docInputRef}
                type="file"
                hidden
                onChange={handleFileSelect}
                aria-label={tr("Chọn tệp hoặc ảnh để gửi (tối đa 100MB)", "Choose file or image to send (max 100MB)")}
              />
              <Tooltip title={uploadingMedia ? tr("Đang tải tệp lên…", "Uploading file…") : tr("Đính kèm tệp hoặc ảnh (tối đa 100MB)", "Attach file or image (max 100MB)")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={uploadingMedia}
                    aria-label={tr("Đính kèm tệp hoặc ảnh (tối đa 100MB)", "Attach file or image (max 100MB)")}
                    onClick={() => docInputRef.current?.click()}
                    sx={{ color: "primary.main", p: 0.65, mb: isMultiline ? 0.15 : 0 }}
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
                  sx={{ color: "primary.main", p: 0.65, mb: isMultiline ? 0.15 : 0 }}
                >
                  <MapPin size={18} />
                </IconButton>
              </Tooltip>

              <Tooltip title={tr("Trò chuyện vui cùng Aura AI (RAG)", "Fun chat with Aura AI (RAG)")}>
                <IconButton
                  size="small"
                  aria-label={tr("Gợi ý hỏi Aura AI", "Suggestions for Aura AI")}
                  onClick={() => setShowAuraSuggestions((prev) => !prev)}
                  sx={{
                    color: showAuraSuggestions || inputText.includes("@aura") ? "primary.main" : "text.secondary",
                    p: 0.65,
                    mb: isMultiline ? 0.15 : 0,
                  }}
                >
                  <Sparkles size={18} />
                </IconButton>
              </Tooltip>

              {/* Ô nhập tin nhắn kiểu "Aa" chuẩn Facebook Messenger (tự động xuống dòng, mở rộng tối đa 5 dòng) */}
              <TextField
                fullWidth
                multiline
                minRows={1}
                maxRows={5}
                inputRef={inputRef}
                placeholder="Aa"
                value={inputText}
                onChange={(e) => handleInputChange(e.target.value, e.target.selectionStart ?? undefined)}
                onKeyDown={handleKeyDown}
                slotProps={{
                  htmlInput: {
                    "aria-label": tr("Nội dung tin nhắn", "Message content"),
                    style: {
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                      whiteSpace: "pre-wrap",
                      maxHeight: 120,
                      overflowY: "auto",
                      lineHeight: 1.42,
                      padding: 0,
                    },
                  },
                  input: {
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        sx={{
                          mb: isMultiline ? 0.2 : 0,
                          alignSelf: isMultiline ? "flex-end" : "center",
                        }}
                      >
                        <Tooltip title={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}>
                          <IconButton
                            size="small"
                            aria-label={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}
                            onClick={(e: MouseEvent<HTMLButtonElement>) => setGifAnchorEl(e.currentTarget)}
                            sx={{ color: "primary.main", p: 0.4 }}
                          >
                            <GifIcon size={18} />
                          </IconButton>
                        </Tooltip>
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
                    borderRadius: "18px",
                    bgcolor: "action.hover",
                    fontSize: "0.875rem",
                    py: 0.5,
                    pl: 1.5,
                    pr: 1,
                    minHeight: 36,
                    maxHeight: 140,
                    alignItems: isMultiline ? "flex-end" : "center",
                    "& fieldset": { borderColor: "transparent" },
                    "&:hover fieldset": { borderColor: "transparent" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputBase-input": {
                    py: 0,
                    lineHeight: 1.42,
                  },
                  "& textarea::placeholder": {
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
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
                      mb: isMultiline ? 0.15 : 0,
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
                      mb: isMultiline ? 0.15 : 0,
                      "&:hover": { bgcolor: "action.hover", transform: "scale(1.1)" },
                      transition: "all 0.15s ease",
                    }}
                  >
                    <ThumbsUp size={19} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
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
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: 4,
                },
              },
            }}
          >
            <AppEmojiPicker
              onEmojiSelect={handleSelectEmoji}
              width={300}
              height={360}
            />
          </Popover>

          <MentionAutocomplete
            ref={mentionRef}
            open={mentionOpen}
            anchorEl={mentionAnchorEl}
            query={mentionQuery}
            onSelect={insertMention}
            onClose={closeMention}
          />

          <AiChatSummaryDialog
            open={openSummaryDialog}
            onClose={() => setOpenSummaryDialog(false)}
            conversationId={convId || ""}
            partnerName={targetUserName}
          />

          {/* POPOVER GIPHY */}
          <Popover
            open={Boolean(gifAnchorEl)}
            anchorEl={gifAnchorEl}
            onClose={() => setGifAnchorEl(null)}
            disableScrollLock
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "bottom", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: 4,
                  mb: 1,
                },
              },
            }}
          >
            <AppGiphyPicker
              onSelect={(gifUrl) => {
                setGifAnchorEl(null);
                void handleSendMessage(gifUrl);
              }}
              onClose={() => setGifAnchorEl(null)}
              width={310}
              height={380}
            />
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

      {/* Dialog Xác Nhận Xóa Cuộc Hội Thoại */}
      <ConfirmDialog
        open={openDeleteConfirm}
        title={tr("Xóa đoạn chat?", "Delete chat?")}
        description={
          isAuraChat
            ? tr(
                "Toàn bộ tin nhắn với trợ lý ảo Aura AI sẽ bị xóa vĩnh viễn.",
                "All messages with smart assistant Aura AI will be permanently deleted."
              )
            : tr(
                "Bạn sẽ không thể xem lại các tin nhắn này nữa. Người kia vẫn có thể xem cuộc trò chuyện của họ.",
                "You won't be able to view these messages anymore. The other person can still view their conversation."
              )
        }
        confirmLabel={tr("Xóa đoạn chat", "Delete chat")}
        cancelLabel={tr("Hủy", "Cancel")}
        onClose={() => setOpenDeleteConfirm(false)}
        onConfirm={() => void handleDeleteConversation()}
      />
    </Paper>
  );
}

