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

export interface FriendRecommendationResult {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  distanceKm?: number;
  mutualFriendsCount: number;
  friendsCount: number;
  score: number;
  recommendationReason: string;
  relationStatus: "none" | "pending_sent" | "pending_received" | "friends";
  requestId?: string;
}

interface FriendState {
  friends: FriendItem[];
  receivedRequests: FriendRequestItem[];
  sentRequests: FriendRequestItem[];
  searchResults: UserRelationResult[];
  recommendations: FriendRecommendationResult[];
  isLoadingFriends: boolean;
  isLoadingRequests: boolean;
  isLoadingRecommendations: boolean;
  isLocating: boolean;
  isSearching: boolean;
  searchSeq?: number;
  userLocation: { latitude: number; longitude: number } | null;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchRecommendations: (coords?: { latitude: number; longitude: number }) => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<boolean>;
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
  recommendations: [],
  isLoadingFriends: false,
  isLoadingRequests: false,
  isLoadingRecommendations: false,
  isLocating: false,
  isSearching: false,
  searchSeq: 0,
  userLocation: null,

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

  fetchRecommendations: async (coords?: { latitude: number; longitude: number }) => {
    set({ isLoadingRecommendations: true });
    try {
      let url = "/friends/recommendations?limit=25";
      const targetCoords = coords || get().userLocation;
      if (targetCoords) {
        url += `&lat=${targetCoords.latitude}&lng=${targetCoords.longitude}&radiusKm=35`;
      }
      const res = await api.get(url);
      if (res.data?.recommendations) {
        set({ recommendations: res.data.recommendations });
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách gợi ý bạn bè:", err);
    } finally {
      set({ isLoadingRecommendations: false });
    }
  },

  updateLocation: async (latitude: number, longitude: number) => {
    set({ isLocating: true });
    try {
      await api.post("/friends/location", { latitude, longitude });
      set({ userLocation: { latitude, longitude } });
      // Tải lại gợi ý dựa trên tọa độ mới
      await get().fetchRecommendations({ latitude, longitude });
      return true;
    } catch (err) {
      console.error("Lỗi cập nhật vị trí:", err);
      return false;
    } finally {
      set({ isLocating: false });
    }
  },

  sendFriendRequest: async (recipientId: string) => {
    try {
      const res = await api.post("/friends/request", { recipientId });
      const nextStatus =
        res.data?.request?.status === "accepted" ? "friends" : "pending_sent";
      const reqId = res.data?.request?._id;

      // Cập nhật lại trạng thái trong searchResults và recommendations
      set((state) => ({
        searchResults: state.searchResults.map((u) =>
          u._id === recipientId
            ? {
                ...u,
                relationStatus: nextStatus,
                requestId: reqId,
              }
            : u
        ),
        recommendations: state.recommendations.map((r) =>
          r._id === recipientId
            ? {
                ...r,
                relationStatus: nextStatus,
                requestId: reqId,
              }
            : r
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
        recommendations: state.recommendations.map((r) =>
          r.requestId === requestId
            ? {
                ...r,
                relationStatus: action === "accept" ? "friends" : "none",
                requestId: undefined,
              }
            : r
        ),
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
        recommendations: state.recommendations.map((r) =>
          r.requestId === requestId ? { ...r, relationStatus: "none", requestId: undefined } : r
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
        recommendations: state.recommendations.map((r) =>
          r._id === friendId ? { ...r, relationStatus: "none" } : r
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
