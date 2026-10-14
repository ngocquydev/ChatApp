import { create } from "zustand";
import api from "../services/api";
import { ChatUser } from "./useChatStore";

export interface FriendItem {
  friendshipId: string;
  friend: ChatUser;
  createdAt: string;
}

export interface FriendRequestItem {
  _id: string;
  requesterId?: ChatUser;
  recipientId?: ChatUser;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface UserRelationResult extends ChatUser {
  relationStatus: "none" | "pending_sent" | "pending_received" | "friends";
  requestId?: string;
}

interface FriendState {
  friends: FriendItem[];
  receivedRequests: FriendRequestItem[];
  sentRequests: FriendRequestItem[];
  searchResults: UserRelationResult[];
  isLoadingFriends: boolean;
  isLoadingRequests: boolean;
  isSearching: boolean;
  searchSeq?: number;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  sendFriendRequest: (recipientId: string) => Promise<{ success: boolean; message: string }>;
  respondToRequest: (
    requestId: string,
    action: "accept" | "reject"
  ) => Promise<{ success: boolean; message: string }>;
  cancelRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  unfriend: (friendId: string) => Promise<{ success: boolean; message: string }>;
  clearSearchResults: () => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  searchResults: [],
  isLoadingFriends: false,
  isLoadingRequests: false,
  isSearching: false,
  searchSeq: 0,

  clearSearchResults: () => {
    set({ searchResults: [], isSearching: false });
  },

  fetchFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await api.get("/friends");
      if (res.data?.friends) {
        set({ friends: res.data.friends });
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách bạn bè:", err);
    } finally {
      set({ isLoadingFriends: false });
    }
  },

  fetchRequests: async () => {
    set({ isLoadingRequests: true });
    try {
      const res = await api.get("/friends/requests");
      set({
        receivedRequests: res.data?.received || [],
        sentRequests: res.data?.sent || [],
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách lời mời:", err);
    } finally {
      set({ isLoadingRequests: false });
    }
  },

  searchUsers: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    const nextSeq = (get().searchSeq || 0) + 1;
    set({ isSearching: true, searchSeq: nextSeq });
    try {
      const res = await api.get(`/friends/search?q=${encodeURIComponent(trimmed)}`);
      // Chỉ cập nhật nếu request này là mới nhất (tránh race condition giữa các phím gõ nhanh)
      if (get().searchSeq === nextSeq) {
        set({ searchResults: res.data?.users || [], isSearching: false });
      }
    } catch (err) {
      console.error("Lỗi tìm kiếm bạn bè:", err);
      if (get().searchSeq === nextSeq) {
        set({ isSearching: false });
      }
    }
  },

  sendFriendRequest: async (recipientId: string) => {
    try {
      const res = await api.post("/friends/request", { recipientId });
      // Cập nhật lại trạng thái trong searchResults
      set((state) => ({
        searchResults: state.searchResults.map((u) =>
          u._id === recipientId
            ? {
                ...u,
                relationStatus:
                  res.data?.request?.status === "accepted"
                    ? "friends"
                    : "pending_sent",
                requestId: res.data?.request?._id,
              }
            : u
        ),
      }));
      // Tải lại lời mời và bạn bè nếu auto-accept
      get().fetchRequests();
      if (res.data?.request?.status === "accepted") {
        get().fetchFriends();
      }
      return { success: true, message: res.data?.message || "Đã gửi lời mời!" };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gửi lời mời thất bại";
      return { success: false, message: msg };
    }
  },

  respondToRequest: async (requestId: string, action: "accept" | "reject") => {
    try {
      const res = await api.patch(`/friends/requests/${requestId}/respond`, {
        action,
      });
      // Xóa khỏi receivedRequests
      set((state) => ({
        receivedRequests: state.receivedRequests.filter((r) => r._id !== requestId),
      }));
      if (action === "accept") {
        get().fetchFriends();
      }
      return { success: true, message: res.data?.message || "Xử lý thành công!" };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Xử lý lời mời thất bại";
      return { success: false, message: msg };
    }
  },

  cancelRequest: async (requestId: string) => {
    try {
      const res = await api.delete(`/friends/requests/${requestId}`);
      set((state) => ({
        sentRequests: state.sentRequests.filter((r) => r._id !== requestId),
        searchResults: state.searchResults.map((u) =>
          u.requestId === requestId ? { ...u, relationStatus: "none", requestId: undefined } : u
        ),
      }));
      return { success: true, message: res.data?.message || "Đã hủy lời mời" };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Hủy lời mời thất bại";
      return { success: false, message: msg };
    }
  },

  unfriend: async (friendId: string) => {
    try {
      const res = await api.delete(`/friends/${friendId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f.friend?._id !== friendId),
        searchResults: state.searchResults.map((u) =>
          u._id === friendId ? { ...u, relationStatus: "none" } : u
        ),
      }));
      return { success: true, message: res.data?.message || "Đã hủy kết bạn" };
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Hủy kết bạn thất bại";
      return { success: false, message: msg };
    }
  },
}));
