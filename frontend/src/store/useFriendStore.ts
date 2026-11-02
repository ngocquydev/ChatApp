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
  email?: string;
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

/** Thông báo realtime về bạn bè, hiển thị bằng toast toàn cục. `id` tăng dần để cùng một người vẫn kích hoạt lại toast. */
export interface FriendNotice {
  id: number;
  type: "accepted" | "request_received";
  userId: string;
  name: string;
  avatar?: string;
}

/** Dữ liệu server gửi kèm sự kiện friend:accepted / friend:request_received */
export interface FriendRealtimePayload {
  user?: { _id?: string; name?: string; avatar?: string };
  request?: { _id?: string };
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
  /** Đang tải trang tiếp theo (infinite scroll) */
  isSearchingMore: boolean;
  /** Còn trang kết quả tiếp theo không */
  searchHasMore: boolean;
  /** Con trỏ trang tiếp theo (nextCursor của server) */
  searchCursor: string | null;
  /** Từ khóa của phiên tìm kiếm hiện tại — dùng khi tải thêm */
  searchTerm: string;
  /** Thông báo lỗi tìm kiếm (hết thời gian, mất mạng…) */
  searchError: string | null;
  searchSeq?: number;
  userLocation: { latitude: number; longitude: number } | null;
  /** Thông báo bạn bè mới nhất chưa bị đóng (null = không có) */
  notice: FriendNotice | null;

  /** Xử lý sự kiện socket: làm mới dữ liệu, cập nhật trạng thái đang hiển thị và bật thông báo */
  handleRealtimeEvent: (type: FriendNotice["type"], payload?: FriendRealtimePayload) => void;
  dismissNotice: () => void;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchRecommendations: (coords?: { latitude: number; longitude: number }) => Promise<void>;
  updateLocation: (latitude: number, longitude: number) => Promise<boolean>;
  /** `limit`: số kết quả trang đầu (mặc định server = 20) */
  searchUsers: (query: string, options?: { limit?: number }) => Promise<void>;
  /** Tải trang kết quả kế tiếp của phiên tìm kiếm hiện tại */
  loadMoreSearchResults: (limit?: number) => Promise<void>;
  sendFriendRequest: (recipientId: string) => Promise<{ success: boolean; message: string }>;
  respondToRequest: (
    requestId: string,
    action: "accept" | "reject"
  ) => Promise<{ success: boolean; message: string }>;
  cancelRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  unfriend: (friendId: string) => Promise<{ success: boolean; message: string }>;
  clearSearchResults: () => void;
}

/** Chuyển lỗi axios thành câu tiếng Việt ngắn gọn cho người dùng */
function searchErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string } } };
  if (e.response?.status === 408) {
    return e.response.data?.message || "Tìm kiếm mất quá nhiều thời gian. Hãy nhập từ khóa cụ thể hơn.";
  }
  return "Không thể tìm kiếm lúc này. Vui lòng thử lại.";
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
  isSearchingMore: false,
  searchHasMore: false,
  searchCursor: null,
  searchTerm: "",
  searchError: null,
  searchSeq: 0,
  userLocation: null,
  notice: null,

  dismissNotice: () => set({ notice: null }),

  handleRealtimeEvent: (type, payload) => {
    const otherId = payload?.user?._id;

    if (type === "accepted") get().fetchFriends();
    get().fetchRequests();

    // Cập nhật ngay các danh sách đang hiển thị (tìm kiếm, gợi ý) thay vì đợi người dùng tải lại
    if (otherId) {
      const next =
        type === "accepted"
          ? { relationStatus: "friends" as const, requestId: undefined }
          : { relationStatus: "pending_received" as const, requestId: payload?.request?._id };
      set((state) => ({
        searchResults: state.searchResults.map((u) => (u._id === otherId ? { ...u, ...next } : u)),
        recommendations: state.recommendations.map((r) => (r._id === otherId ? { ...r, ...next } : r)),
      }));
    }

    set({
      notice: {
        id: Date.now(),
        type,
        userId: otherId ?? "",
        name: payload?.user?.name || "Một người dùng",
        avatar: payload?.user?.avatar,
      },
    });
  },

  clearSearchResults: () => {
    // Tăng searchSeq để mọi request đang bay bị bỏ qua khi về
    set({
      searchResults: [],
      isSearching: false,
      isSearchingMore: false,
      searchHasMore: false,
      searchCursor: null,
      searchTerm: "",
      searchError: null,
      searchSeq: (get().searchSeq || 0) + 1,
    });
  },

  fetchFriends: async () => {
    set({ isLoadingFriends: true });
    try {
      const res = await api.get("/friends");
      if (res.data?.friends) {
        const cleanFriends = res.data.friends.filter(
          (f: { friend?: { role?: string } }) => f.friend?.role !== "admin" && f.friend?.role !== "bot"
        );
        set({ friends: cleanFriends });
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
      const cleanReceived = (res.data?.received || []).filter(
        (r: { requesterId?: { role?: string } }) => r.requesterId?.role !== "admin" && r.requesterId?.role !== "bot"
      );
      const cleanSent = (res.data?.sent || []).filter(
        (r: { recipientId?: { role?: string } }) => r.recipientId?.role !== "admin" && r.recipientId?.role !== "bot"
      );
      set({
        receivedRequests: cleanReceived,
        sentRequests: cleanSent,
      });
    } catch (err) {
      console.error("Lỗi lấy danh sách lời mời:", err);
    } finally {
      set({ isLoadingRequests: false });
    }
  },

  searchUsers: async (query: string, options?: { limit?: number }) => {
    const trimmed = query.trim();
    if (!trimmed) {
      get().clearSearchResults();
      return;
    }
    const nextSeq = (get().searchSeq || 0) + 1;
    set({
      isSearching: true,
      isSearchingMore: false,
      searchError: null,
      searchTerm: trimmed,
      searchSeq: nextSeq,
    });
    try {
      const params = new URLSearchParams({ q: trimmed });
      if (options?.limit) params.set("limit", String(options.limit));
      const res = await api.get(`/friends/search?${params.toString()}`);
      // Chỉ cập nhật nếu request này là mới nhất (tránh race condition giữa các phím gõ nhanh)
      if (get().searchSeq === nextSeq) {
        const rawUsers = (res.data?.users || []) as (UserRelationResult & { role?: string })[];
        const cleanUsers = rawUsers.filter((u) => u.role !== "admin" && u.role !== "bot");
        set({
          searchResults: cleanUsers,
          searchHasMore: Boolean(res.data?.hasMore),
          searchCursor: res.data?.nextCursor ?? null,
          isSearching: false,
        });
      }
    } catch (err) {
      console.error("Lỗi tìm kiếm bạn bè:", err);
      if (get().searchSeq === nextSeq) {
        set({
          isSearching: false,
          searchHasMore: false,
          searchCursor: null,
          searchError: searchErrorMessage(err),
        });
      }
    }
  },

  loadMoreSearchResults: async (limit = 20) => {
    const { searchHasMore, searchCursor, searchTerm, isSearching, isSearchingMore, searchSeq } = get();
    // Chặn gọi chồng: đang tải trang đầu/trang kế, hết dữ liệu hoặc chưa có con trỏ
    if (!searchHasMore || !searchCursor || !searchTerm || isSearching || isSearchingMore) return;
    const seq = searchSeq || 0;
    set({ isSearchingMore: true, searchError: null });
    try {
      const params = new URLSearchParams({ q: searchTerm, limit: String(limit), after: searchCursor });
      const res = await api.get(`/friends/search?${params.toString()}`);
      // Từ khóa đã đổi trong lúc chờ → bỏ kết quả cũ
      if (get().searchSeq !== seq) return;
      const incoming: UserRelationResult[] = res.data?.users || [];
      set((state) => {
        const seen = new Set(state.searchResults.map((u) => u._id));
        return {
          searchResults: [...state.searchResults, ...incoming.filter((u) => !seen.has(u._id))],
          searchHasMore: Boolean(res.data?.hasMore),
          searchCursor: res.data?.nextCursor ?? null,
          isSearchingMore: false,
        };
      });
    } catch (err) {
      console.error("Lỗi tải thêm kết quả tìm kiếm:", err);
      if (get().searchSeq === seq) {
        set({ isSearchingMore: false, searchError: searchErrorMessage(err) });
      }
    }
  },

  fetchRecommendations: async (coords?: { latitude: number; longitude: number }) => {
    // SWR Pattern: Chỉ bật loading toàn phần khi store chưa có gợi ý nào
    if (get().recommendations.length === 0) {
      set({ isLoadingRecommendations: true });
    }
    try {
      // Gọi trực tiếp Lambda Serving Layer REST API (< 5ms từ Redis ZSET / MongoDB 2dsphere)
      let url = "/friends/recommendations?limit=25";
      const targetCoords = coords || get().userLocation;
      if (targetCoords) {
        url += `&lat=${targetCoords.latitude}&lng=${targetCoords.longitude}&radiusKm=35`;
      }
      const res = await api.get(url);
      if (res.data?.recommendations) {
        const rawRecs = (res.data.recommendations || []) as (FriendRecommendationResult & { role?: string })[];
        const cleanRecs = rawRecs.filter((r) => r.role !== "admin" && r.role !== "bot");
        set({ recommendations: cleanRecs });
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
