import { create } from "zustand";
import { ChatUser } from "./useChatStore";

export interface ChatBoxSession {
  user: ChatUser;
  conversationId?: string;
  isMinimized: boolean;
  unreadCount: number;
}

interface ChatBoxState {
  openBoxes: ChatBoxSession[];
  openChat: (user: ChatUser, conversationId?: string) => void;
  closeChat: (userId: string) => void;
  toggleMinimize: (userId: string) => void;
  minimizeChat: (userId: string, isMinimized: boolean) => void;
  setConversationId: (userId: string, conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (userId: string) => void;
  closeAll: () => void;
}

const MAX_CHAT_BOXES = 3;

export const useChatBoxStore = create<ChatBoxState>((set, get) => ({
  openBoxes: [],

  openChat: (user: ChatUser, conversationId?: string) => {
    const current = get().openBoxes;
    const targetId = String(user._id || user.id);

    const existingIndex = current.findIndex(
      (b) => String(b.user._id || b.user.id) === targetId
    );

    if (existingIndex !== -1) {
      // Đã mở: un-minimize và xóa badge chưa đọc
      const updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        isMinimized: false,
        unreadCount: 0,
        conversationId: conversationId || updated[existingIndex].conversationId,
      };
      set({ openBoxes: updated });
      return;
    }

    // Chưa mở: giới hạn tối đa MAX_CHAT_BOXES
    let newBoxes = [...current];
    if (newBoxes.length >= MAX_CHAT_BOXES) {
      // Đóng hộp cũ nhất
      newBoxes.shift();
    }

    newBoxes.push({
      user,
      conversationId,
      isMinimized: false,
      unreadCount: 0,
    });

    set({ openBoxes: newBoxes });
  },

  closeChat: (userId: string) => {
    set((state) => ({
      openBoxes: state.openBoxes.filter(
        (b) => String(b.user._id || b.user.id) !== String(userId)
      ),
    }));
  },

  toggleMinimize: (userId: string) => {
    set((state) => ({
      openBoxes: state.openBoxes.map((b) =>
        String(b.user._id || b.user.id) === String(userId)
          ? {
              ...b,
              isMinimized: !b.isMinimized,
              unreadCount: b.isMinimized ? 0 : b.unreadCount,
            }
          : b
      ),
    }));
  },

  minimizeChat: (userId: string, isMinimized: boolean) => {
    set((state) => ({
      openBoxes: state.openBoxes.map((b) =>
        String(b.user._id || b.user.id) === String(userId)
          ? {
              ...b,
              isMinimized,
              unreadCount: !isMinimized ? 0 : b.unreadCount,
            }
          : b
      ),
    }));
  },

  setConversationId: (userId: string, conversationId: string) => {
    set((state) => ({
      openBoxes: state.openBoxes.map((b) =>
        String(b.user._id || b.user.id) === String(userId)
          ? { ...b, conversationId }
          : b
      ),
    }));
  },

  incrementUnread: (conversationId: string) => {
    set((state) => ({
      openBoxes: state.openBoxes.map((b) =>
        b.conversationId === conversationId && b.isMinimized
          ? { ...b, unreadCount: b.unreadCount + 1 }
          : b
      ),
    }));
  },

  clearUnread: (userId: string) => {
    set((state) => ({
      openBoxes: state.openBoxes.map((b) =>
        String(b.user._id || b.user.id) === String(userId)
          ? { ...b, unreadCount: 0 }
          : b
      ),
    }));
  },

  closeAll: () => {
    set({ openBoxes: [] });
  },
}));
