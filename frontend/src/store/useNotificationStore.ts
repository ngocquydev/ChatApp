import { create } from "zustand";
import {
  deleteNotificationApi,
  fetchNotificationsApi,
  fetchUnreadNotificationCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  type NotificationItem,
} from "../services/notificationsApi";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  activeNotice: NotificationItem | null;

  fetchNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  handleIncomingNotification: (notification: NotificationItem, unreadCount?: number) => void;
  dismissNotice: () => void;
}

const NOTIFICATION_PAGE_SIZE = 5;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  nextCursor: null,
  activeNotice: null,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await fetchNotificationsApi({ limit: NOTIFICATION_PAGE_SIZE });
      set({
        notifications: res.notifications || [],
        unreadCount: res.unreadCount ?? 0,
        hasMore: Boolean(res.hasMore),
        nextCursor: res.nextCursor ?? null,
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách thông báo:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadMore: async () => {
    const { hasMore, nextCursor, isLoadingMore } = get();
    if (!hasMore || !nextCursor || isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const res = await fetchNotificationsApi({ limit: NOTIFICATION_PAGE_SIZE, before: nextCursor });
      set((state) => {
        const seen = new Set(state.notifications.map((n) => n._id));
        const fresh = (res.notifications || []).filter((n) => !seen.has(n._id));
        return {
          notifications: [...state.notifications, ...fresh],
          hasMore: Boolean(res.hasMore),
          nextCursor: res.nextCursor ?? null,
        };
      });
    } catch (err) {
      console.error("Lỗi tải thêm thông báo:", err);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await fetchUnreadNotificationCountApi();
      set({ unreadCount: count });
    } catch {
      // Bỏ qua lỗi ngầm
    }
  },

  markAsRead: async (id: string) => {
    const current = get().notifications.find((n) => n._id === id);
    if (!current || current.isRead) return;

    // Cập nhật lạc quan
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await markNotificationAsReadApi(id);
    } catch {
      // Giữ nguyên trạng thái lạc quan
    }
  },

  markAllAsRead: async () => {
    if (get().unreadCount === 0) return;

    // Cập nhật lạc quan
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    try {
      await markAllNotificationsAsReadApi();
    } catch {
      // Giữ nguyên trạng thái lạc quan
    }
  },

  deleteNotification: async (id: string) => {
    const target = get().notifications.find((n) => n._id === id);
    const wasUnread = target && !target.isRead;

    set((state) => ({
      notifications: state.notifications.filter((n) => n._id !== id),
      unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      await deleteNotificationApi(id);
    } catch {
      // Giữ nguyên trạng thái xóa
    }
  },

  handleIncomingNotification: (notification: NotificationItem, unreadCount?: number) => {
    set((state) => {
      const seen = new Set(state.notifications.map((n) => n._id));
      const exists = seen.has(notification._id);
      const nextList = exists
        ? state.notifications
        : [notification, ...state.notifications];
      const nextCount =
        typeof unreadCount === "number"
          ? unreadCount
          : state.unreadCount + (notification.isRead ? 0 : 1);

      return {
        notifications: nextList,
        unreadCount: nextCount,
        activeNotice: notification,
      };
    });
  },

  dismissNotice: () => set({ activeNotice: null }),
}));
