import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import api from "../services/api";
import { mqttChatClient } from "../services/mqttClient";
import { useAuthStore } from "./useAuthStore";
import { useFriendStore } from "./useFriendStore";
import { soundNotification } from "../utils/soundNotification";

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
  id?: string;
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
  isMqttConnected: boolean;
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

const typingExpiryTimers = new Map<string, NodeJS.Timeout>();
let mqttUnbinders: (() => void)[] = [];

const updateStoreTyping = (
  set: (fn: (state: ChatState) => Partial<ChatState>) => void,
  conversationId: string,
  isTyping: boolean
) => {
  if (typingExpiryTimers.has(conversationId)) {
    clearTimeout(typingExpiryTimers.get(conversationId)!);
    typingExpiryTimers.delete(conversationId);
  }

  if (isTyping) {
    set((state) => ({
      typingMap: { ...state.typingMap, [conversationId]: true },
    }));
    const timer = setTimeout(() => {
      set((state) => ({
        typingMap: { ...state.typingMap, [conversationId]: false },
      }));
      typingExpiryTimers.delete(conversationId);
    }, 6500);
    typingExpiryTimers.set(conversationId, timer);
  } else {
    set((state) => ({
      typingMap: { ...state.typingMap, [conversationId]: false },
    }));
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  isConnected: false,
  isMqttConnected: false,
  onlineUserIds: [],
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  typingMap: {},

  connectSocket: () => {
    // 1. KẾT NỐI MQTT OVER WEBSOCKET BROKER (PROTOCOL BUFFERS BINARY CHAT)
    const currentUser = useAuthStore.getState().user;
    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    if (currentUserId) {
      mqttChatClient.connect("", currentUserId);
      set({ isMqttConnected: mqttChatClient.getIsConnected() });

      // Hủy các listener cũ trước khi đăng ký mới để tránh trùng lặp
      mqttUnbinders.forEach((unsub) => unsub());
      mqttUnbinders = [];

      // Lắng nghe tin nhắn mới nhị phân qua MQTT
      const unbindMsg = mqttChatClient.onMessage((newMsg) => {
        const active = get().activeConversation;
        const convId = newMsg.conversationId;
        const myId = String(
          useAuthStore.getState().user?._id ||
            useAuthStore.getState().user?.id ||
            ""
        );
        const senderId = String(newMsg.senderId || "");

        // Phát âm thanh khi người khác nhắn tin cho mình
        if (senderId && senderId !== myId) {
          const conv = get().conversations.find((c) => c._id === convId);
          const partner = conv?.participants?.find(
            (p) => String(p._id || p.id) === senderId
          );
          soundNotification.playIncomingSound(
            newMsg._id || newMsg.id,
            partner?.name
          );
        }

        if (active && active._id === convId) {
          set((state) => {
            const exists = state.messages.some(
              (m) => m._id === newMsg._id || m.id === newMsg.id
            );
            return exists
              ? state
              : { messages: [...state.messages, newMsg as any] };
          });

          mqttChatClient.sendRead(convId, newMsg.senderId);
        }

        set((state) => {
          const updated = state.conversations.map((c) => {
            if (c._id === convId) {
              const currentUnread =
                (c.unreadCounts && c.unreadCounts[myId]) || 0;
              const isNotActive = !active || active._id !== convId;
              return {
                ...c,
                lastMessage: {
                  text: newMsg.text,
                  senderId: newMsg.senderId,
                  createdAt: newMsg.createdAt,
                },
                unreadCounts:
                  isNotActive && senderId !== myId
                    ? { ...c.unreadCounts, [myId]: currentUnread + 1 }
                    : c.unreadCounts,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          });

          updated.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          return { conversations: updated };
        });
      });
      mqttUnbinders.push(unbindMsg);

      // Lắng nghe typing nhị phân
      const unbindTyping = mqttChatClient.onTyping((data) => {
        if (!data?.conversationId) return;
        updateStoreTyping(set, data.conversationId, data.isTyping);
      });
      mqttUnbinders.push(unbindTyping);

      // Lắng nghe seen nhị phân
      const unbindSeen = mqttChatClient.onSeen((data) => {
        const active = get().activeConversation;
        if (active && active._id === data.conversationId) {
          set((state) => ({
            messages: state.messages.map((m) => ({
              ...m,
              readAt: m.readAt || data.readAt,
            })),
          }));
        }
      });
      mqttUnbinders.push(unbindSeen);

      // Lắng nghe presence nhị phân
      const unbindPresence = mqttChatClient.onPresence((data) => {
        if (data.onlineUserIds && data.onlineUserIds.length > 0) {
          set({ onlineUserIds: data.onlineUserIds });
        } else if (data.userId) {
          set((state) => ({
            onlineUserIds: data.isOnline
              ? Array.from(new Set([...state.onlineUserIds, data.userId]))
              : state.onlineUserIds.filter((id) => id !== data.userId),
          }));
        }
      });
      mqttUnbinders.push(unbindPresence);
    }

    // 2. KẾT NỐI SOCKET.IO (DUAL HYBRID FALLBACK)
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
        onlineUserIds: Array.from(
          new Set([...state.onlineUserIds, data.userId])
        ),
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
      const myId = String(
        useAuthStore.getState().user?._id ||
          useAuthStore.getState().user?.id ||
          ""
      );
      const senderId =
        typeof newMsg.senderId === "string"
          ? newMsg.senderId
          : String(newMsg.senderId?._id || (newMsg.senderId as any)?.id || "");

      // Phát âm thanh khi người khác nhắn tin cho mình
      if (senderId && senderId !== myId) {
        const conv = get().conversations.find((c) => c._id === convId);
        const partnerName =
          typeof newMsg.senderId === "object" && newMsg.senderId?.name
            ? newMsg.senderId.name
            : conv?.participants?.find(
                (p) => String(p._id || p.id) === senderId
              )?.name;
        soundNotification.playIncomingSound(
          newMsg._id || newMsg.id,
          partnerName
        );
      }

      if (active && active._id === convId) {
        set((state) => {
          const exists = state.messages.some(
            (m) => m._id === newMsg._id || m.id === newMsg.id
          );
          return exists
            ? state
            : { messages: [...state.messages, newMsg] };
        });

        socket.emit("message:read", {
          conversationId: convId,
          receiverId: senderId,
        });
      }

      set((state) => {
        const updated = state.conversations.map((c) => {
          if (c._id === convId) {
            const currentUnread =
              (c.unreadCounts && c.unreadCounts[myId]) || 0;
            const isNotActive = !active || active._id !== convId;
            return {
              ...c,
              lastMessage: {
                text: newMsg.text,
                senderId,
                createdAt: newMsg.createdAt,
              },
              unreadCounts:
                isNotActive && senderId !== myId
                  ? { ...c.unreadCounts, [myId]: currentUnread + 1 }
                  : c.unreadCounts,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        return { conversations: updated };
      });
    });

    socket.on("typing:start", (data: { conversationId: string; userId: string }) => {
      if (!data?.conversationId) return;
      updateStoreTyping(set, data.conversationId, true);
    });

    socket.on("typing:stop", (data: { conversationId: string; userId: string }) => {
      if (!data?.conversationId) return;
      updateStoreTyping(set, data.conversationId, false);
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

    // Lắng nghe sự kiện lời mời kết bạn real-time
    socket.on("friend:request_received", () => {
      useFriendStore.getState().fetchRequests();
    });

    socket.on("friend:accepted", () => {
      useFriendStore.getState().fetchFriends();
      useFriendStore.getState().fetchRequests();
    });

    set({ socket });
  },

  disconnectSocket: () => {
    mqttUnbinders.forEach((unsub) => unsub());
    mqttUnbinders = [];
    mqttChatClient.disconnect();
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, isMqttConnected: false });
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
    const myId = String(
      useAuthStore.getState().user?._id ||
        useAuthStore.getState().user?.id ||
        ""
    );
    set((state) => ({
      activeConversation: conversation,
      isLoadingMessages: true,
      conversations: state.conversations.map((c) =>
        c._id === conversation._id && myId
          ? {
              ...c,
              unreadCounts: {
                ...c.unreadCounts,
                [myId]: 0,
              },
            }
          : c
      ),
    }));

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
    const currentUserId = (api.defaults.headers as any)?.["X-User-Id"]; // fallback
    const socket = get().socket;

    const otherParticipant =
      participants.find((p) => p._id !== currentUserId) || participants[0];

    if (!otherParticipant?._id) return;

    // 1. ƯU TIÊN GỬI QUA MQTT PROTOCOL BUFFERS NHỊ PHÂN (CHUẨN FACEBOOK MESSENGER)
    const sentViaMqtt = mqttChatClient.sendMessage(
      active._id,
      otherParticipant._id,
      text.trim()
    );

    if (!sentViaMqtt) {
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
    }
  },

  sendTyping: (isTyping: boolean) => {
    const active = get().activeConversation;
    const socket = get().socket;
    const currentUser = useAuthStore.getState().user;
    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    if (!active) return;

    const otherParticipant =
      active.participants.find((p) => String(p._id || p.id) !== currentUserId) ||
      active.participants[0];
    if (!otherParticipant?._id && !(otherParticipant as any)?.id) return;

    const receiverId = String(otherParticipant._id || (otherParticipant as any).id);

    // Bắn typing nhị phân qua MQTT
    mqttChatClient.sendTyping(active._id, receiverId, isTyping);

    // Bắn song song qua Socket.IO nếu có
    if (socket && socket.connected) {
      socket.emit(isTyping ? "typing:start" : "typing:stop", {
        conversationId: active._id,
        receiverId,
      });
    }
  },
}));
