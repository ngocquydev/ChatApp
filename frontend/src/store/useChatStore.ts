import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import api from "../services/api";
import { mqttChatClient } from "../services/mqttClient";
import { useAuthStore } from "./useAuthStore";
import { useFriendStore, type FriendRealtimePayload } from "./useFriendStore";
import { soundNotification } from "../utils/soundNotification";

export interface ChatUser {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  [key: string]: unknown;
}

export interface CallLogData {
  callType: "audio" | "video";
  status: "missed" | "declined" | "completed" | "busy" | "cancelled";
  duration: number; // in seconds
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  isLive?: boolean;
  liveExpiresAt?: string | null;
  isLiveActive?: boolean;
}

export interface ChatMessage {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string | ChatUser;
  receiverId: string | ChatUser;
  text: string;
  type?: "text" | "call" | "location";
  location?: LocationData | null;
  callLog?: CallLogData | null;
  readAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt: string;
}

export interface ConversationItem {
  _id: string;
  participants: ChatUser[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: string;
    isDeleted?: boolean;
  } | null;
  unreadCounts?: Record<string, number>;
  theme?: string;
  blockedBy?: string | null;
  restrictedBy?: string[];
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
  clearActiveConversation: () => void;
  startConversationWithUser: (user: ChatUser) => Promise<ConversationItem>;
  sendMessage: (
    text: string,
    options?: {
      type?: "text" | "location";
      location?: LocationData;
    },
  ) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  deleteChatMessage: (messageId: string) => Promise<{ success: boolean; message?: string }>;
  updateActiveConversationTheme: (theme: string) => Promise<{ success: boolean; message?: string }>;
  blockActiveConversation: () => Promise<{ success: boolean; message?: string }>;
  unblockActiveConversation: () => Promise<{ success: boolean; message?: string }>;
  restrictActiveConversation: (restrict: boolean) => Promise<{ success: boolean; message?: string }>;
  updateLiveLocation: (messageId: string, location: Partial<LocationData>) => void;
  stopLiveLocation: (messageId: string) => void;
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

function dedupeConversations(list: ConversationItem[]): ConversationItem[] {
  const sorted = [...list].sort((a, b) => {
    const aHasMsg = Boolean(a.lastMessage?.text);
    const bHasMsg = Boolean(b.lastMessage?.text);
    if (aHasMsg !== bHasMsg) return bHasMsg ? 1 : -1;
    const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
    const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });

  const seenKeys = new Set<string>();
  const result: ConversationItem[] = [];
  for (const conv of sorted) {
    const ids = (conv.participants || [])
      .map((p) => String(p?._id || p?.id || ""))
      .filter(Boolean)
      .sort();
    const key = ids.length > 0 ? ids.join(":") : conv._id;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push(conv);
    }
  }
  return result;
}

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
      const isMqtt = mqttChatClient.getIsConnected();
      if (get().isMqttConnected !== isMqtt) {
        set({ isMqttConnected: isMqtt });
      }

      // Hủy các listener cũ trước khi đăng ký mới để tránh trùng lặp
      mqttUnbinders.forEach((unsub) => unsub());
      mqttUnbinders = [];

      // Lắng nghe tin nhắn mới nhị phân qua MQTT
      const unbindMsg = mqttChatClient.onMessage((newMsg) => {
        const active = get().activeConversation;
        const msgConvId = String(newMsg.conversationId || "");
        const activeConvId = String(active?._id || "");
        const myId = String(
          useAuthStore.getState().user?._id ||
            useAuthStore.getState().user?.id ||
            ""
        );
        const senderId = String(newMsg.senderId || "");
        const receiverId = String(newMsg.receiverId || "");

        const partner = active?.participants?.find(
          (p) => String(p._id || p.id) !== myId
        );
        const partnerId = String(partner?._id || partner?.id || "");

        const isMatchActive =
          Boolean(active) &&
          ((Boolean(msgConvId) && Boolean(activeConvId) && activeConvId === msgConvId) ||
            (Boolean(partnerId) &&
              ((senderId === partnerId && receiverId === myId) ||
                (senderId === myId && receiverId === partnerId))));

        // Phát âm thanh khi người khác nhắn tin cho mình
        if (senderId && senderId !== myId) {
          const conv = get().conversations.find((c) => String(c._id) === msgConvId);
          const partnerName =
            conv?.participants?.find(
              (p) => String(p._id || p.id) === senderId
            )?.name || partner?.name;
          soundNotification.playIncomingSound(
            newMsg._id || newMsg.id,
            partnerName
          );
        }

        if (isMatchActive) {
          set((state) => {
            const exists = state.messages.some(
              (m) => String(m._id || m.id) === String(newMsg._id || newMsg.id)
            );
            return exists
              ? state
              : { messages: [...state.messages, newMsg as unknown as ChatMessage] };
          });

          mqttChatClient.sendRead(msgConvId || activeConvId, newMsg.senderId);
        }

        set((state) => {
          const updated = state.conversations.map((c) => {
            const isThisConv =
              (Boolean(msgConvId) && String(c._id) === msgConvId) ||
              (c.participants.some((p) => String(p._id || p.id) === senderId) &&
                c.participants.some((p) => String(p._id || p.id) === receiverId));

            if (isThisConv) {
              const currentUnread =
                (c.unreadCounts && c.unreadCounts[myId]) || 0;
              const isNotActive = !active || String(active._id) !== String(c._id);
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
    if (
      currentSocket &&
      (currentSocket.connected ||
        (currentSocket as unknown as { active?: boolean }).active)
    ) {
      return;
    }

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
      const msgConvId = String(newMsg.conversationId || "");
      const activeConvId = String(active?._id || "");
      const myId = String(
        useAuthStore.getState().user?._id ||
          useAuthStore.getState().user?.id ||
          ""
      );
      const senderId =
        typeof newMsg.senderId === "string"
          ? newMsg.senderId
          : String(newMsg.senderId?._id || newMsg.senderId?.id || "");
      const receiverId =
        typeof newMsg.receiverId === "string"
          ? newMsg.receiverId
          : String(newMsg.receiverId?._id || newMsg.receiverId?.id || "");

      const partner = active?.participants?.find(
        (p) => String(p._id || p.id) !== myId
      );
      const partnerId = String(partner?._id || partner?.id || "");

      const isMatchActive =
        Boolean(active) &&
        ((Boolean(msgConvId) && Boolean(activeConvId) && activeConvId === msgConvId) ||
          (Boolean(partnerId) &&
            ((senderId === partnerId && receiverId === myId) ||
              (senderId === myId && receiverId === partnerId))));

      // Phát âm thanh khi người khác nhắn tin cho mình
      if (senderId && senderId !== myId) {
        const conv = get().conversations.find((c) => String(c._id) === msgConvId);
        const partnerName =
          typeof newMsg.senderId === "object" && newMsg.senderId?.name
            ? newMsg.senderId.name
            : conv?.participants?.find(
                (p) => String(p._id || p.id) === senderId
              )?.name || partner?.name;
        soundNotification.playIncomingSound(
          newMsg._id || newMsg.id,
          partnerName
        );
      }

      if (isMatchActive) {
        set((state) => {
          const exists = state.messages.some(
            (m) => String(m._id || m.id) === String(newMsg._id || newMsg.id)
          );
          return exists
            ? state
            : { messages: [...state.messages, newMsg] };
        });

        socket.emit("message:read", {
          conversationId: msgConvId || activeConvId,
          receiverId: senderId,
        });
      }

      set((state) => {
        const updated = state.conversations.map((c) => {
          const isThisConv =
            (Boolean(msgConvId) && String(c._id) === msgConvId) ||
            (c.participants.some((p) => String(p._id || p.id) === senderId) &&
              c.participants.some((p) => String(p._id || p.id) === receiverId));

          if (isThisConv) {
            const currentUnread =
              (c.unreadCounts && c.unreadCounts[myId]) || 0;
            const isNotActive = !active || String(active._id) !== String(c._id);
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

    // Lắng nghe cập nhật tọa độ vị trí trực tiếp (Live Location)
    socket.on(
      "location:live_updated",
      (data: {
        messageId: string;
        conversationId: string;
        senderId: string;
        location: LocationData;
      }) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === data.messageId || m.id === data.messageId
              ? {
                  ...m,
                  location: m.location
                    ? { ...m.location, ...data.location }
                    : data.location,
                }
              : m
          ),
        }));
      }
    );

    // Lắng nghe sự kiện lời mời kết bạn real-time (toast hiện ở FriendNoticeToast toàn cục)
    socket.on("friend:request_received", (data?: FriendRealtimePayload) => {
      useFriendStore.getState().handleRealtimeEvent("request_received", data);
    });

    socket.on("friend:accepted", (data?: FriendRealtimePayload) => {
      useFriendStore.getState().handleRealtimeEvent("accepted", data);
    });

    socket.on(
      "message:deleted",
      (data: { messageId: string; conversationId: string; deletedBy: string }) => {
        const active = get().activeConversation;
        if (active && active._id === data.conversationId) {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === data.messageId
                ? {
                    ...m,
                    isDeleted: true,
                    text: "Tin nhắn đã bị thu hồi",
                    deletedBy: data.deletedBy,
                  }
                : m
            ),
          }));
        }
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c._id === data.conversationId && c.lastMessage) {
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  text: "Tin nhắn đã bị thu hồi",
                },
              };
            }
            return c;
          }),
        }));
      }
    );

    socket.on(
      "conversation:theme_updated",
      (data: { conversationId: string; theme: string }) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === data.conversationId ? { ...c, theme: data.theme } : c
          ),
          activeConversation:
            state.activeConversation &&
            state.activeConversation._id === data.conversationId
              ? { ...state.activeConversation, theme: data.theme }
              : state.activeConversation,
        }));
      }
    );

    socket.on(
      "conversation:blocked",
      (data: { conversationId: string; blockedBy: string }) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === data.conversationId
              ? { ...c, blockedBy: data.blockedBy }
              : c
          ),
          activeConversation:
            state.activeConversation &&
            state.activeConversation._id === data.conversationId
              ? { ...state.activeConversation, blockedBy: data.blockedBy }
              : state.activeConversation,
        }));
      }
    );

    socket.on(
      "conversation:unblocked",
      (data: { conversationId: string }) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === data.conversationId ? { ...c, blockedBy: null } : c
          ),
          activeConversation:
            state.activeConversation &&
            state.activeConversation._id === data.conversationId
              ? { ...state.activeConversation, blockedBy: null }
              : state.activeConversation,
        }));
      }
    );

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
        set({ conversations: dedupeConversations(res.data.conversations) });
      }
    } catch (err) {
      console.error("Lỗi tải danh sách cuộc trò chuyện:", err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  clearActiveConversation: () => {
    set({ activeConversation: null, messages: [], isLoadingMessages: false });
  },

  selectConversation: async (conversation: ConversationItem) => {
    const myId = String(
      useAuthStore.getState().user?._id ||
        useAuthStore.getState().user?.id ||
        ""
    );
    set((state) => ({
      activeConversation: conversation,
      // Xóa tin nhắn cũ khi đổi sang hội thoại khác để tránh nhấp nháy nội dung sai
      messages: state.activeConversation?._id === conversation._id ? state.messages : [],
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

  sendMessage: async (
    text: string,
    options?: {
      type?: "text" | "location";
      location?: LocationData;
    },
  ) => {
    const active = get().activeConversation;
    if (!active || !text.trim()) return;

    // Tìm người nhận trong participants
    const participants = active.participants;
    const headers = api.defaults.headers as unknown as Record<string, unknown>;
    const currentUserId = typeof headers?.["X-User-Id"] === "string" ? headers["X-User-Id"] : undefined; // fallback
    const socket = get().socket;

    const otherParticipant =
      participants.find((p) => p._id !== currentUserId) || participants[0];

    if (!otherParticipant?._id) return;

    const isLocationMsg = options?.type === "location" && options.location;

    // 1. Nếu là tin nhắn text thông thường, ưu tiên gửi qua MQTT Protobuf
    let sentViaMqtt = false;
    if (!isLocationMsg) {
      sentViaMqtt = mqttChatClient.sendMessage(
        active._id,
        otherParticipant._id,
        text.trim()
      );
    }

    if (!sentViaMqtt) {
      const payload: {
        conversationId: string;
        receiverId: string;
        text: string;
        type?: "text" | "location";
        location?: LocationData;
      } = {
        conversationId: active._id,
        receiverId: otherParticipant._id,
        text: text.trim(),
        type: options?.type,
        location: options?.location,
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
    if (!otherParticipant?._id && !otherParticipant?.id) return;

    const receiverId = String(otherParticipant._id || otherParticipant.id);

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

  deleteChatMessage: async (messageId: string) => {
    const active = get().activeConversation;
    if (!active) return { success: false, message: "Chưa chọn hội thoại" };

    try {
      await api.delete(`/chat/messages/${messageId}`);
      // Optimistic update
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, text: "Tin nhắn đã bị thu hồi" }
            : m
        ),
      }));

      // Báo qua socket nếu đang kết nối
      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId
      );
      if (socket && socket.connected) {
        socket.emit("message:delete", {
          messageId,
          conversationId: active._id,
          receiverId: partner?._id || partner?.id,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Thu hồi tin nhắn thất bại";
      return { success: false, message: msg };
    }
  },

  updateActiveConversationTheme: async (theme: string) => {
    const active = get().activeConversation;
    if (!active) return { success: false, message: "Chưa chọn hội thoại" };

    try {
      await api.patch(`/chat/conversations/${active._id}/theme`, { theme });
      set((state) => ({
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, theme }
          : null,
        conversations: state.conversations.map((c) =>
          c._id === active._id ? { ...c, theme } : c
        ),
      }));

      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId
      );
      if (socket && socket.connected) {
        socket.emit("conversation:theme", {
          conversationId: active._id,
          theme,
          partnerId: partner?._id || partner?.id,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Đổi hình nền thất bại";
      return { success: false, message: msg };
    }
  },

  blockActiveConversation: async () => {
    const active = get().activeConversation;
    if (!active) return { success: false, message: "Chưa chọn hội thoại" };

    const myId = String(
      useAuthStore.getState().user?._id || useAuthStore.getState().user?.id || ""
    );
    try {
      await api.patch(`/chat/conversations/${active._id}/block`);
      set((state) => ({
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, blockedBy: myId }
          : null,
        conversations: state.conversations.map((c) =>
          c._id === active._id ? { ...c, blockedBy: myId } : c
        ),
      }));

      const socket = get().socket;
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId
      );
      if (socket && socket.connected) {
        socket.emit("conversation:block", {
          conversationId: active._id,
          partnerId: partner?._id || partner?.id,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Chặn thất bại";
      return { success: false, message: msg };
    }
  },

  unblockActiveConversation: async () => {
    const active = get().activeConversation;
    if (!active) return { success: false, message: "Chưa chọn hội thoại" };

    try {
      await api.patch(`/chat/conversations/${active._id}/unblock`);
      set((state) => ({
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, blockedBy: null }
          : null,
        conversations: state.conversations.map((c) =>
          c._id === active._id ? { ...c, blockedBy: null } : c
        ),
      }));

      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId
      );
      if (socket && socket.connected) {
        socket.emit("conversation:unblock", {
          conversationId: active._id,
          partnerId: partner?._id || partner?.id,
        });
      }

      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Bỏ chặn thất bại";
      return { success: false, message: msg };
    }
  },

  restrictActiveConversation: async (restrict: boolean) => {
    const active = get().activeConversation;
    if (!active) return { success: false, message: "Chưa chọn hội thoại" };

    const myId = String(
      useAuthStore.getState().user?._id || useAuthStore.getState().user?.id || ""
    );
    try {
      await api.patch(`/chat/conversations/${active._id}/restrict`, {
        restrict,
      });
      const currentRestricted = active.restrictedBy || [];
      const updatedRestricted = restrict
        ? Array.from(new Set([...currentRestricted, myId]))
        : currentRestricted.filter((id) => id !== myId);

      set((state) => ({
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, restrictedBy: updatedRestricted }
          : null,
        conversations: state.conversations.map((c) =>
          c._id === active._id
            ? { ...c, restrictedBy: updatedRestricted }
            : c
        ),
      }));

      return { success: true };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Cập nhật hạn chế thất bại";
      return { success: false, message: msg };
    }
  },

  updateLiveLocation: (messageId: string, locUpdate: Partial<LocationData>) => {
    const socket = get().socket;
    const active = get().activeConversation;
    const currentUserId = String(
      useAuthStore.getState().user?._id || useAuthStore.getState().user?.id || ""
    );
    const partner = active?.participants.find((p) => String(p._id) !== currentUserId);
    const receiverId = partner?._id ? String(partner._id) : "";

    if (socket && socket.connected) {
      socket.emit("location:live_update", {
        messageId,
        conversationId: active?._id || "",
        receiverId,
        ...locUpdate,
      });
    }

    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId || m.id === messageId
          ? {
              ...m,
              location: m.location
                ? { ...m.location, ...locUpdate }
                : (locUpdate as LocationData),
            }
          : m
      ),
    }));

    // Phát broadcast event nội bộ để các component khác (như FloatingChatBox, LocationViewModal) đồng bộ ngay lập tức
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chatapp:location_updated", {
          detail: { messageId, ...locUpdate },
        })
      );
    }
  },

  stopLiveLocation: (messageId: string) => {
    get().updateLiveLocation(messageId, { isLiveActive: false });
  },
}));
