import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import api from "../services/api";

export interface ChatUser {
  _id: string;
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: string | ChatUser;
  receiverId: string | ChatUser;
  text: string;
  readAt?: string | null;
  createdAt: string;
}

export interface ConversationItem {
  _id: string;
  participants: ChatUser[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCounts?: Record<string, number>;
  updatedAt: string;
}

interface ChatState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  conversations: ConversationItem[];
  activeConversation: ConversationItem | null;
  messages: ChatMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingMap: Record<string, boolean>; // conversationId -> isTyping

  connectSocket: () => void;
  disconnectSocket: () => void;
  fetchConversations: () => Promise<void>;
  selectConversation: (conversation: ConversationItem) => Promise<void>;
  startConversationWithUser: (user: ChatUser) => Promise<ConversationItem>;
  sendMessage: (text: string) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  "http://localhost:3000";

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUserIds: [],
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingMap: {},

  connectSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket && currentSocket.connected) return;

    const socket = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socket.on("connect", () => {
      set({ isConnected: true });
    });

    socket.on("disconnect", () => {
      set({ isConnected: false });
    });

    socket.on("presence:initial", (data: { onlineUserIds: string[] }) => {
      if (Array.isArray(data?.onlineUserIds)) {
        set({ onlineUserIds: data.onlineUserIds });
      }
    });

    socket.on("user:online", (data: { userId: string }) => {
      if (!data?.userId) return;
      set((state) => ({
        onlineUserIds: Array.from(new Set([...state.onlineUserIds, data.userId])),
      }));
    });

    socket.on("user:offline", (data: { userId: string }) => {
      if (!data?.userId) return;
      set((state) => ({
        onlineUserIds: state.onlineUserIds.filter((id) => id !== data.userId),
      }));
    });

    socket.on("message:new", (newMsg: ChatMessage) => {
      const active = get().activeConversation;
      const convId = newMsg.conversationId;

      // Nếu đang mở đúng cuộc trò chuyện này, thêm tin nhắn và báo đã xem
      if (active && active._id === convId) {
        set((state) => {
          const exists = state.messages.some((m) => m._id === newMsg._id);
          return exists
            ? state
            : { messages: [...state.messages, newMsg] };
        });

        // Báo đã đọc
        const senderId =
          typeof newMsg.senderId === "string"
            ? newMsg.senderId
            : newMsg.senderId._id;
        socket.emit("message:read", {
          conversationId: convId,
          receiverId: senderId,
        });
      }

      // Cập nhật lastMessage trong danh sách hội thoại
      set((state) => {
        const updated = state.conversations.map((c) => {
          if (c._id === convId) {
            const senderId =
              typeof newMsg.senderId === "string"
                ? newMsg.senderId
                : newMsg.senderId._id;
            return {
              ...c,
              lastMessage: {
                text: newMsg.text,
                senderId,
                createdAt: newMsg.createdAt,
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        // Sắp xếp lại cuộc trò chuyện vừa có tin mới lên đầu
        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        return { conversations: updated };
      });
    });

    socket.on("typing:start", (data: { conversationId: string; userId: string }) => {
      if (!data?.conversationId) return;
      set((state) => ({
        typingMap: { ...state.typingMap, [data.conversationId]: true },
      }));
    });

    socket.on("typing:stop", (data: { conversationId: string; userId: string }) => {
      if (!data?.conversationId) return;
      set((state) => ({
        typingMap: { ...state.typingMap, [data.conversationId]: false },
      }));
    });

    socket.on(
      "message:seen",
      (data: { conversationId: string; readerId: string; readAt: string }) => {
        const active = get().activeConversation;
        if (active && active._id === data.conversationId) {
          set((state) => ({
            messages: state.messages.map((m) => ({
              ...m,
              readAt: m.readAt || data.readAt,
            })),
          }));
        }
      }
    );

    socket.on("friend:request_received", () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh_friend_requests"));
      }
    });

    socket.on("friend:accepted", () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refresh_friends_list"));
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.get("/chat/conversations");
      if (res.data?.conversations) {
        set({ conversations: res.data.conversations });
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cuộc trò chuyện:", err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (conversation: ConversationItem) => {
    set({ activeConversation: conversation, isLoadingMessages: true });
    try {
      const res = await api.get(`/chat/conversations/${conversation._id}/messages`);
      if (res.data?.messages) {
        set({ messages: res.data.messages });
      }

      // Đánh dấu đã xem
      await api.patch(`/chat/conversations/${conversation._id}/read`);

      const socket = get().socket;
      if (socket && socket.connected) {
        // Tìm partner ID
        const other = conversation.participants.find(
          (p) => p._id !== conversation.participants[0]?._id
        );
        socket.emit("message:read", {
          conversationId: conversation._id,
          receiverId: other?._id,
        });
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử tin nhắn:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  startConversationWithUser: async (user: ChatUser) => {
    const existing = get().conversations.find((c) =>
      c.participants.some((p) => p._id === user._id)
    );
    if (existing) {
      await get().selectConversation(existing);
      return existing;
    }

    try {
      const res = await api.post("/chat/conversations", {
        participantId: user._id,
      });
      const newConv = res.data?.conversation;
      if (newConv) {
        set((state) => ({
          conversations: [newConv, ...state.conversations],
        }));
        await get().selectConversation(newConv);
        return newConv;
      }
    } catch (err) {
      console.error("Lỗi tạo cuộc hội thoại:", err);
    }
    throw new Error("Không thể khởi tạo cuộc hội thoại");
  },

  sendMessage: async (text: string) => {
    const active = get().activeConversation;
    if (!active || !text.trim()) return;

    // Tìm người nhận trong participants
    const participants = active.participants;
    // Lấy user khác mình
    const currentUserId = (api.defaults.headers as any)?.["X-User-Id"]; // fallback
    const socket = get().socket;

    // Lấy partner
    const otherParticipant = participants.find(
      (p) => p._id !== currentUserId
    ) || participants[0];

    if (!otherParticipant?._id) return;

    const payload = {
      conversationId: active._id,
      receiverId: otherParticipant._id,
      text: text.trim(),
    };

    if (socket && socket.connected) {
      socket.emit("message:send", payload);
    } else {
      // Fallback qua REST API nếu socket chưa kết nối
      const res = await api.post("/chat/messages", payload);
      if (res.data?.message) {
        set((state) => ({
          messages: [...state.messages, res.data.message],
        }));
      }
    }
  },

  sendTyping: (isTyping: boolean) => {
    const active = get().activeConversation;
    const socket = get().socket;
    if (!active || !socket || !socket.connected) return;

    const otherParticipant = active.participants[1] || active.participants[0];
    if (!otherParticipant?._id) return;

    socket.emit(isTyping ? "typing:start" : "typing:stop", {
      conversationId: active._id,
      receiverId: otherParticipant._id,
    });
  },
}));
