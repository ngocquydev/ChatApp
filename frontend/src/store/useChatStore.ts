import { create } from "zustand";
import { io, Socket } from "socket.io-client";
import api from "../services/api";
import { mqttChatClient } from "../services/mqttClient";
import { useAuthStore } from "./useAuthStore";
import { useFriendStore, type FriendRealtimePayload } from "./useFriendStore";
import { useNotificationStore } from "./useNotificationStore";
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

export interface MessageReactionItem {
  userId: string;
  type: string;
  createdAt?: string;
}

export interface ChatMessage {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string | ChatUser;
  receiverId?: string | ChatUser | null;
  text: string;
  type?: "text" | "call" | "location" | "system";
  location?: LocationData | null;
  callLog?: CallLogData | null;
  readAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  reactions?: MessageReactionItem[];
  createdAt: string;
  isOptimistic?: boolean;
  isStreaming?: boolean;
  status?: "sending" | "sent" | "error";
}

export interface ConversationItem {
  _id: string;
  type?: "direct" | "group";
  name?: string | null;
  avatar?: string | null;
  creatorId?: string | ChatUser | null;
  adminIds?: (string | ChatUser)[];
  participants: ChatUser[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: string;
    isDeleted?: boolean;
    type?: string;
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
  createGroupChat: (
    name: string,
    memberIds: string[],
    avatar?: string,
  ) => Promise<ConversationItem>;
  addGroupMembers: (
    conversationId: string,
    memberIds: string[],
  ) => Promise<void>;
  removeGroupMember: (
    conversationId: string,
    memberId: string,
  ) => Promise<void>;
  updateGroupInfo: (
    conversationId: string,
    data: { name?: string; avatar?: string },
  ) => Promise<void>;
  promoteGroupAdmin: (
    conversationId: string,
    targetUserId: string,
  ) => Promise<void>;
  fetchGroupDetails: (
    conversationId: string,
  ) => Promise<ConversationItem | null>;
  sendMessage: (
    text: string,
    options?: {
      type?: "text" | "location";
      location?: LocationData;
    },
  ) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  deleteChatMessage: (
    messageId: string,
  ) => Promise<{ success: boolean; message?: string }>;
  updateActiveConversationTheme: (
    theme: string,
  ) => Promise<{ success: boolean; message?: string }>;
  blockActiveConversation: () => Promise<{
    success: boolean;
    message?: string;
  }>;
  unblockActiveConversation: () => Promise<{
    success: boolean;
    message?: string;
  }>;
  restrictActiveConversation: (
    restrict: boolean,
  ) => Promise<{ success: boolean; message?: string }>;
  deleteConversation: (
    conversationId: string,
  ) => Promise<{ success: boolean; message?: string }>;
  updateLiveLocation: (
    messageId: string,
    location: Partial<LocationData>,
  ) => void;
  stopLiveLocation: (messageId: string) => void;
  reactToMessage: (messageId: string, type: string) => Promise<void>;
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
  isTyping: boolean,
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
    const aTime = new Date(
      a.lastMessage?.createdAt || a.updatedAt || 0,
    ).getTime();
    const bTime = new Date(
      b.lastMessage?.createdAt || b.updatedAt || 0,
    ).getTime();
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
    // Chỉ kết nối khi người dùng đã đăng nhập để tránh gửi request không có token lên Gateway
    const currentUser = useAuthStore.getState().user;
    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    if (!currentUserId) {
      return;
    }
    const token = useAuthStore.getState().accessToken || "";
    mqttChatClient.connect(token, currentUserId);
    const isMqtt = mqttChatClient.getIsConnected();
    if (get().isMqttConnected !== isMqtt) {
      set({ isMqttConnected: isMqtt });
    }
    mqttUnbinders.forEach((unsub) => unsub());
    mqttUnbinders = [];

    const unbindMsg = mqttChatClient.onMessage((newMsg) => {
      const active = get().activeConversation;
      const msgConvId = String(newMsg.conversationId || "");
      const activeConvId = String(active?._id || "");
      const myId = String(
        useAuthStore.getState().user?._id ||
          useAuthStore.getState().user?.id ||
          "",
      );
      const senderId = String(newMsg.senderId || "");
      const receiverId = String(newMsg.receiverId || "");

      const partner = active?.participants?.find(
        (p) => String(p._id || p.id) !== myId,
      );
      const partnerId = String(partner?._id || partner?.id || "");

      const isMatchActive =
        Boolean(active) &&
        ((Boolean(msgConvId) &&
          Boolean(activeConvId) &&
          activeConvId === msgConvId) ||
          (Boolean(partnerId) &&
            ((senderId === partnerId && receiverId === myId) ||
              (senderId === myId && receiverId === partnerId))));

      if (senderId && senderId !== myId) {
        const conv = get().conversations.find(
          (c) => String(c._id) === msgConvId,
        );
        const partnerName =
          conv?.participants?.find((p) => String(p._id || p.id) === senderId)
            ?.name || partner?.name;
        soundNotification.playIncomingSound(
          newMsg._id || newMsg.id,
          partnerName,
        );
      }

      if (isMatchActive) {
        set((state) => {
          const realId = String(newMsg._id || newMsg.id);
          const exists = state.messages.some(
            (m) => !m.isOptimistic && String(m._id || m.id) === realId,
          );
          if (exists) return state;
          if (senderId === myId) {
            const optIndex = state.messages.findIndex(
              (m) =>
                m.isOptimistic && m.text.trim() === (newMsg.text || "").trim(),
            );
            if (optIndex !== -1) {
              const nextMessages = [...state.messages];
              nextMessages[optIndex] = {
                ...newMsg,
                isOptimistic: false,
                status: "sent",
              } as unknown as ChatMessage;
              return { messages: nextMessages };
            }
          }

          return {
            messages: [...state.messages, newMsg as unknown as ChatMessage],
          };
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
            const currentUnread = (c.unreadCounts && c.unreadCounts[myId]) || 0;
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
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        return { conversations: updated };
      });
    });
    mqttUnbinders.push(unbindMsg);

    const unbindTyping = mqttChatClient.onTyping((data) => {
      if (!data?.conversationId) return;
      updateStoreTyping(set, data.conversationId, data.isTyping);
    });
    mqttUnbinders.push(unbindTyping);

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
          new Set([...state.onlineUserIds, data.userId]),
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
          "",
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
        (p) => String(p._id || p.id) !== myId,
      );
      const partnerId = String(partner?._id || partner?.id || "");

      const isMatchActive =
        Boolean(active) &&
        ((Boolean(msgConvId) &&
          Boolean(activeConvId) &&
          activeConvId === msgConvId) ||
          (Boolean(partnerId) &&
            ((senderId === partnerId && receiverId === myId) ||
              (senderId === myId && receiverId === partnerId))));

      if (senderId && senderId !== myId) {
        const conv = get().conversations.find(
          (c) => String(c._id) === msgConvId,
        );
        const partnerName =
          typeof newMsg.senderId === "object" && newMsg.senderId?.name
            ? newMsg.senderId.name
            : conv?.participants?.find(
                (p) => String(p._id || p.id) === senderId,
              )?.name || partner?.name;
        soundNotification.playIncomingSound(
          newMsg._id || newMsg.id,
          partnerName,
        );
      }

      if (isMatchActive) {
        set((state) => {
          const realId = String(newMsg._id || newMsg.id);
          const existingIndex = state.messages.findIndex(
            (m) => String(m._id || m.id) === realId,
          );
          if (existingIndex !== -1) {
            const nextMessages = [...state.messages];
            nextMessages[existingIndex] = {
              ...nextMessages[existingIndex],
              ...newMsg,
              isStreaming: false,
            };
            return { messages: nextMessages };
          }

          if (senderId === myId) {
            const optIndex = state.messages.findIndex(
              (m) =>
                m.isOptimistic && m.text.trim() === (newMsg.text || "").trim(),
            );
            if (optIndex !== -1) {
              const nextMessages = [...state.messages];
              nextMessages[optIndex] = {
                ...newMsg,
                isOptimistic: false,
                status: "sent",
              };
              return { messages: nextMessages };
            }
          }

          return { messages: [...state.messages, newMsg] };
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
            const currentUnread = (c.unreadCounts && c.unreadCounts[myId]) || 0;
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
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        return { conversations: updated };
      });
    });
    socket.on("message:stream_start", (newMsg: ChatMessage) => {
      const active = get().activeConversation;
      const msgConvId = String(newMsg.conversationId || "");
      const activeConvId = String(active?._id || "");
      const isMatchActive =
        Boolean(active) &&
        Boolean(msgConvId) &&
        Boolean(activeConvId) &&
        activeConvId === msgConvId;

      if (isMatchActive) {
        set((state) => {
          const realId = String(newMsg._id || newMsg.id);
          const exists = state.messages.some(
            (m) => String(m._id || m.id) === realId,
          );
          if (exists) return state;
          return {
            messages: [
              ...state.messages,
              { ...newMsg, text: "", isStreaming: true },
            ],
          };
        });
      }
    });

    socket.on(
      "message:stream_chunk",
      (data: {
        messageId: string;
        conversationId: string;
        chunk: string;
        text: string;
      }) => {
        const active = get().activeConversation;
        const msgConvId = String(data.conversationId || "");
        const activeConvId = String(active?._id || "");
        const isMatchActive =
          Boolean(active) &&
          Boolean(msgConvId) &&
          Boolean(activeConvId) &&
          activeConvId === msgConvId;

        if (isMatchActive) {
          set((state) => ({
            messages: state.messages.map((m) =>
              String(m._id || m.id) === String(data.messageId)
                ? { ...m, text: data.text, isStreaming: true }
                : m,
            ),
          }));
        }
      },
    );

    socket.on("message:stream_end", (data: ChatMessage) => {
      const active = get().activeConversation;
      const msgConvId = String(data.conversationId || "");
      const activeConvId = String(active?._id || "");
      const isMatchActive =
        Boolean(active) &&
        Boolean(msgConvId) &&
        Boolean(activeConvId) &&
        activeConvId === msgConvId;

      if (isMatchActive) {
        set((state) => ({
          messages: state.messages.map((m) =>
            String(m._id || m.id) === String(data._id || data.id)
              ? { ...m, ...data, isStreaming: false }
              : m,
          ),
        }));
      }

      set((state) => {
        const senderId =
          typeof data.senderId === "string"
            ? data.senderId
            : String(data.senderId?._id || data.senderId?.id || "");
        const updated = state.conversations.map((c) => {
          if (String(c._id) === msgConvId) {
            return {
              ...c,
              lastMessage: {
                text: data.text,
                senderId,
                createdAt: data.createdAt,
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });

        updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );

        return { conversations: updated };
      });
    });

    socket.on(
      "typing:start",
      (data: { conversationId: string; userId: string }) => {
        if (!data?.conversationId) return;
        updateStoreTyping(set, data.conversationId, true);
      },
    );

    socket.on(
      "typing:stop",
      (data: { conversationId: string; userId: string }) => {
        if (!data?.conversationId) return;
        updateStoreTyping(set, data.conversationId, false);
      },
    );

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
      },
    );

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
              : m,
          ),
        }));
      },
    );

    socket.on(
      "message:reaction",
      (data: {
        messageId: string;
        conversationId: string;
        reactions: MessageReactionItem[];
      }) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === data.messageId || m.id === data.messageId
              ? { ...m, reactions: data.reactions }
              : m,
          ),
        }));
      },
    );
    socket.on("friend:request_received", (data?: FriendRealtimePayload) => {
      useFriendStore.getState().handleRealtimeEvent("request_received", data);
    });

    socket.on("friend:accepted", (data?: FriendRealtimePayload) => {
      useFriendStore.getState().handleRealtimeEvent("accepted", data);
    });
    socket.on(
      "notification:new",
      (data: { notification?: any; unreadCount?: number }) => {
        if (data?.notification) {
          useNotificationStore
            .getState()
            .handleIncomingNotification(data.notification, data.unreadCount);
          soundNotification.playIncomingSound(
            data.notification._id,
            data.notification.actor?.name,
          );
        }
      },
    );
    socket.on("post:new", (post: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_new", { detail: post }),
        );
      }
    });

    socket.on("post:deleted", (data: { postId: string }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_deleted", { detail: data }),
        );
      }
    });

    socket.on("post:updated", (post: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_updated", { detail: post }),
        );
      }
    });

    socket.on("post:reaction", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_reaction", { detail: data }),
        );
      }
    });

    socket.on("post:comment", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_comment", { detail: data }),
        );
      }
    });

    socket.on("post:comment_deleted", (data: any) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("chatapp:post_comment_deleted", { detail: data }),
        );
      }
    });

    socket.on(
      "post:share_count_updated",
      (data: { postId: string; shareCount: number }) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("chatapp:post_share_count_updated", {
              detail: data,
            }),
          );
        }
      },
    );

    socket.on(
      "message:deleted",
      (data: {
        messageId: string;
        conversationId: string;
        deletedBy: string;
      }) => {
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
                : m,
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
      },
    );

    socket.on(
      "conversation:theme_updated",
      (data: { conversationId: string; theme: string }) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === data.conversationId ? { ...c, theme: data.theme } : c,
          ),
          activeConversation:
            state.activeConversation &&
            state.activeConversation._id === data.conversationId
              ? { ...state.activeConversation, theme: data.theme }
              : state.activeConversation,
        }));
      },
    );

    socket.on(
      "conversation:blocked",
      (data: { conversationId: string; blockedBy: string }) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === data.conversationId
              ? { ...c, blockedBy: data.blockedBy }
              : c,
          ),
          activeConversation:
            state.activeConversation &&
            state.activeConversation._id === data.conversationId
              ? { ...state.activeConversation, blockedBy: data.blockedBy }
              : state.activeConversation,
        }));
      },
    );

    socket.on("conversation:unblocked", (data: { conversationId: string }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === data.conversationId ? { ...c, blockedBy: null } : c,
        ),
        activeConversation:
          state.activeConversation &&
          state.activeConversation._id === data.conversationId
            ? { ...state.activeConversation, blockedBy: null }
            : state.activeConversation,
      }));
    });

    socket.on(
      "conversation:created",
      (data: { conversation: ConversationItem }) => {
        if (data?.conversation?._id) {
          set((state) => ({
            conversations: [
              data.conversation,
              ...state.conversations.filter(
                (c) => c._id !== data.conversation._id,
              ),
            ],
          }));
        }
      },
    );

    socket.on(
      "conversation:updated",
      (data: { conversation: ConversationItem }) => {
        if (data?.conversation?._id) {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === data.conversation._id ? data.conversation : c,
            ),
            activeConversation:
              state.activeConversation?._id === data.conversation._id
                ? data.conversation
                : state.activeConversation,
          }));
        }
      },
    );

    socket.on("group:kicked", (data: { conversationId: string }) => {
      if (data?.conversationId) {
        set((state) => ({
          conversations: state.conversations.filter(
            (c) => c._id !== data.conversationId,
          ),
          activeConversation:
            state.activeConversation?._id === data.conversationId
              ? null
              : state.activeConversation,
          messages:
            state.activeConversation?._id === data.conversationId
              ? []
              : state.messages,
        }));
      }
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
        "",
    );
    set((state) => ({
      activeConversation: conversation,
      // Xóa tin nhắn cũ khi đổi sang hội thoại khác để tránh nhấp nháy nội dung sai
      messages:
        state.activeConversation?._id === conversation._id
          ? state.messages
          : [],
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
          : c,
      ),
    }));

    try {
      const res = await api.get(
        `/chat/conversations/${conversation._id}/messages`,
      );
      if (res.data?.messages) {
        set({ messages: res.data.messages });
      }

      // Đánh dấu đã xem
      await api.patch(`/chat/conversations/${conversation._id}/read`);

      const socket = get().socket;
      if (socket && socket.connected) {
        socket.emit("conversation:join", {
          conversationId: conversation._id,
        });
        // Tìm partner ID
        const other = conversation.participants.find(
          (p) => p._id !== conversation.participants[0]?._id,
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

  createGroupChat: async (
    name: string,
    memberIds: string[],
    avatar?: string,
  ) => {
    try {
      const res = await api.post("/chat/group", { name, memberIds, avatar });
      if (res.data?.conversation) {
        const newGroup = res.data.conversation as ConversationItem;
        set((state) => ({
          conversations: [
            newGroup,
            ...state.conversations.filter((c) => c._id !== newGroup._id),
          ],
        }));
        await get().selectConversation(newGroup);
        return newGroup;
      }
    } catch (err) {
      console.error("Lỗi tạo nhóm chat:", err);
      throw err;
    }
    throw new Error("Không thể tạo nhóm chat");
  },

  addGroupMembers: async (conversationId: string, memberIds: string[]) => {
    try {
      const res = await api.post(`/chat/group/${conversationId}/members`, {
        memberIds,
      });
      if (res.data?.conversation) {
        const updated = res.data.conversation as ConversationItem;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? updated : c,
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? updated
              : state.activeConversation,
        }));
      }
    } catch (err) {
      console.error("Lỗi thêm thành viên:", err);
      throw err;
    }
  },

  removeGroupMember: async (conversationId: string, memberId: string) => {
    try {
      const res = await api.delete(
        `/chat/group/${conversationId}/members/${memberId}`,
      );
      if (res.data?.conversation) {
        const updated = res.data.conversation as ConversationItem;
        const myId = String(
          useAuthStore.getState().user?._id ||
            useAuthStore.getState().user?.id ||
            "",
        );
        if (memberId === myId) {
          // Tự rời nhóm
          set((state) => ({
            conversations: state.conversations.filter(
              (c) => c._id !== conversationId,
            ),
            activeConversation:
              state.activeConversation?._id === conversationId
                ? null
                : state.activeConversation,
            messages:
              state.activeConversation?._id === conversationId
                ? []
                : state.messages,
          }));
        } else {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c._id === conversationId ? updated : c,
            ),
            activeConversation:
              state.activeConversation?._id === conversationId
                ? updated
                : state.activeConversation,
          }));
        }
      }
    } catch (err) {
      console.error("Lỗi xóa/rời thành viên:", err);
      throw err;
    }
  },

  updateGroupInfo: async (
    conversationId: string,
    data: { name?: string; avatar?: string },
  ) => {
    try {
      const res = await api.patch(`/chat/group/${conversationId}`, data);
      if (res.data?.conversation) {
        const updated = res.data.conversation as ConversationItem;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? updated : c,
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? updated
              : state.activeConversation,
        }));
      }
    } catch (err) {
      console.error("Lỗi cập nhật nhóm:", err);
      throw err;
    }
  },

  promoteGroupAdmin: async (conversationId: string, targetUserId: string) => {
    try {
      const res = await api.post(
        `/chat/group/${conversationId}/admins/${targetUserId}`,
      );
      if (res.data?.conversation) {
        const updated = res.data.conversation as ConversationItem;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? updated : c,
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? updated
              : state.activeConversation,
        }));
      }
    } catch (err) {
      console.error("Lỗi bổ nhiệm admin:", err);
      throw err;
    }
  },

  fetchGroupDetails: async (conversationId: string) => {
    try {
      const res = await api.get(`/chat/group/${conversationId}`);
      if (res.data?.conversation) {
        const updated = res.data.conversation as ConversationItem;
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c._id === conversationId ? updated : c,
          ),
          activeConversation:
            state.activeConversation?._id === conversationId
              ? updated
              : state.activeConversation,
        }));
        return updated;
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin nhóm:", err);
    }
    return null;
  },

  startConversationWithUser: async (user: ChatUser) => {
    const existing = get().conversations.find((c) =>
      c.participants.some((p) => p._id === user._id),
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

    const headers = api.defaults.headers as unknown as Record<string, unknown>;
    const currentUserId =
      typeof headers?.["X-User-Id"] === "string"
        ? headers["X-User-Id"]
        : undefined; // fallback

    // Xử lý gửi tin nhắn cho cuộc trò chuyện nhóm
    if (active.type === "group") {
      const textToSend = text.trim();
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMessage: ChatMessage = {
        _id: tempId,
        id: tempId,
        conversationId: active._id,
        senderId: currentUserId || "",
        receiverId: null,
        text: textToSend,
        type: options?.type || "text",
        location: options?.location || null,
        createdAt: new Date().toISOString(),
        readAt: null,
        isDeleted: false,
        isOptimistic: true,
        status: "sending",
      };

      set((state) => ({
        messages: [...state.messages, optimisticMessage],
        conversations: state.conversations.map((c) =>
          c._id === active._id
            ? {
                ...c,
                lastMessage: {
                  text: textToSend,
                  senderId: currentUserId || "",
                  createdAt: optimisticMessage.createdAt,
                  type: optimisticMessage.type,
                },
                updatedAt: optimisticMessage.createdAt,
              }
            : c,
        ),
      }));

      try {
        const res = await api.post(`/chat/group/${active._id}/messages`, {
          conversationId: active._id,
          text: textToSend,
          type: options?.type || "text",
          location: options?.location,
        });
        if (res.data?.message) {
          const realMsg = res.data.message;
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === tempId
                ? { ...realMsg, isOptimistic: false, status: "sent" }
                : m,
            ),
          }));
        }
      } catch (err) {
        console.error("Lỗi gửi tin nhắn nhóm:", err);
        set((state) => ({
          messages: state.messages.map((m) =>
            m._id === tempId ? { ...m, status: "error" } : m,
          ),
        }));
      }
      return;
    }

    // Tìm người nhận trong participants (cho hội thoại 1-1)
    const participants = active.participants;
    const socket = get().socket;

    const otherParticipant =
      participants.find((p) => p._id !== currentUserId) || participants[0];

    if (!otherParticipant?._id) return;

    const textToSend = text.trim();
    const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      id: tempId,
      conversationId: active._id,
      senderId: currentUserId || "",
      receiverId: otherParticipant._id,
      text: textToSend,
      type: options?.type || "text",
      location: options?.location || null,
      createdAt: new Date().toISOString(),
      readAt: null,
      isDeleted: false,
      isOptimistic: true,
      status: "sending",
    };

    // 1. CẬP NHẬT TỨC THÌ (OPTIMISTIC UI): Đưa tin nhắn lên màn hình ngay lập tức 0ms
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
      conversations: state.conversations.map((c) =>
        c._id === active._id
          ? {
              ...c,
              lastMessage: {
                text: textToSend,
                senderId: currentUserId || "",
                createdAt: optimisticMessage.createdAt,
              },
              updatedAt: optimisticMessage.createdAt,
            }
          : c,
      ),
    }));

    const isLocationMsg = options?.type === "location" && options.location;

    // 2. Nếu là tin nhắn text thông thường, ưu tiên gửi qua MQTT Protobuf
    let sentViaMqtt = false;
    if (!isLocationMsg) {
      sentViaMqtt = mqttChatClient.sendMessage(
        active._id,
        otherParticipant._id,
        textToSend,
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
        text: textToSend,
        type: options?.type,
        location: options?.location,
      };

      if (socket && socket.connected) {
        socket.emit("message:send", payload);
      } else {
        // Fallback qua REST API nếu socket chưa kết nối
        try {
          const res = await api.post("/chat/messages", payload);
          if (res.data?.message) {
            const confirmed = res.data.message;
            set((state) => ({
              messages: state.messages.map((m) =>
                m._id === tempId
                  ? { ...confirmed, isOptimistic: false, status: "sent" }
                  : m,
              ),
            }));
          }
        } catch {
          set((state) => ({
            messages: state.messages.map((m) =>
              m._id === tempId ? { ...m, status: "error" } : m,
            ),
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
      active.participants.find(
        (p) => String(p._id || p.id) !== currentUserId,
      ) || active.participants[0];
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
            : m,
        ),
      }));

      // Báo qua socket nếu đang kết nối
      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId,
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
          c._id === active._id ? { ...c, theme } : c,
        ),
      }));

      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId,
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
      useAuthStore.getState().user?._id ||
        useAuthStore.getState().user?.id ||
        "",
    );
    try {
      await api.patch(`/chat/conversations/${active._id}/block`);
      set((state) => ({
        activeConversation: state.activeConversation
          ? { ...state.activeConversation, blockedBy: myId }
          : null,
        conversations: state.conversations.map((c) =>
          c._id === active._id ? { ...c, blockedBy: myId } : c,
        ),
      }));

      const socket = get().socket;
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId,
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
          c._id === active._id ? { ...c, blockedBy: null } : c,
        ),
      }));

      const socket = get().socket;
      const currentUser = useAuthStore.getState().user;
      const myId = String(currentUser?._id || currentUser?.id || "");
      const partner = active.participants.find(
        (p) => String(p._id || p.id) !== myId,
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
      useAuthStore.getState().user?._id ||
        useAuthStore.getState().user?.id ||
        "",
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
          c._id === active._id ? { ...c, restrictedBy: updatedRestricted } : c,
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
      useAuthStore.getState().user?._id ||
        useAuthStore.getState().user?.id ||
        "",
    );
    const partner = active?.participants.find(
      (p) => String(p._id) !== currentUserId,
    );
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
          : m,
      ),
    }));

    // Phát broadcast event nội bộ để các component khác (như FloatingChatBox, LocationViewModal) đồng bộ ngay lập tức
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("chatapp:location_updated", {
          detail: { messageId, ...locUpdate },
        }),
      );
    }
  },

  stopLiveLocation: (messageId: string) => {
    get().updateLiveLocation(messageId, { isLiveActive: false });
  },

  reactToMessage: async (messageId: string, type: string) => {
    const { socket, activeConversation } = get();
    const currentUser = useAuthStore.getState().user;
    const currentUserId = String(currentUser?._id || currentUser?.id || "");
    const partner = activeConversation?.participants.find(
      (p) => String(p._id) !== currentUserId,
    );
    const receiverId = partner?._id ? String(partner._id) : undefined;

    // Optimistic local update
    if (currentUserId) {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (m._id !== messageId && m.id !== messageId) return m;
          const currentReactions = [...(m.reactions || [])];
          const existIdx = currentReactions.findIndex(
            (r) => r.userId === currentUserId,
          );
          if (existIdx > -1) {
            if (currentReactions[existIdx].type === type) {
              currentReactions.splice(existIdx, 1);
            } else {
              currentReactions[existIdx] = {
                ...currentReactions[existIdx],
                type,
              };
            }
          } else {
            currentReactions.push({
              userId: currentUserId,
              type,
              createdAt: new Date().toISOString(),
            });
          }
          return { ...m, reactions: currentReactions };
        }),
      }));
    }

    try {
      if (socket && socket.connected) {
        socket.emit("message:reaction", {
          messageId,
          conversationId: activeConversation?._id || "",
          type,
          receiverId,
        });
      } else {
        await api.post(`/chat/messages/${messageId}/reaction`, { type });
      }
    } catch (err) {
      console.error("Lỗi thả cảm xúc tin nhắn:", err);
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
      set((state) => {
        const nextConversations = state.conversations.filter(
          (c) => c._id !== conversationId,
        );
        const isCurrentActive =
          state.activeConversation?._id === conversationId;
        return {
          conversations: nextConversations,
          activeConversation: isCurrentActive ? null : state.activeConversation,
          messages: isCurrentActive ? [] : state.messages,
        };
      });
      return { success: true };
    } catch (err: unknown) {
      console.error("Lỗi khi xóa cuộc hội thoại:", err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Xóa cuộc hội thoại thất bại";
      return { success: false, message: msg };
    }
  },
}));
