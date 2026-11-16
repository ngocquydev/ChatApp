import api from "./api";

export type NotificationType =
  | "friend_accepted"
  | "friend_request"
  | "post_like"
  | "post_comment"
  | "post_share"
  | "mention"
  | "system";

export interface NotificationActor {
  _id: string;
  name: string;
  avatar?: string;
}

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  actor: NotificationActor;
  createdAt: string;
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export async function fetchNotificationsApi(params?: {
  limit?: number;
  before?: string;
}): Promise<GetNotificationsResponse> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.before) query.set("before", params.before);
  const qs = query.toString();
  const res = await api.get(`/notifications${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function fetchUnreadNotificationCountApi(): Promise<number> {
  const res = await api.get("/notifications/unread-count");
  return res.data?.unreadCount ?? 0;
}

export async function markNotificationAsReadApi(id: string): Promise<boolean> {
  const res = await api.patch(`/notifications/${id}/read`);
  return Boolean(res.data?.success);
}

export async function markAllNotificationsAsReadApi(): Promise<boolean> {
  const res = await api.patch("/notifications/read-all");
  return Boolean(res.data?.success);
}

export async function deleteNotificationApi(id: string): Promise<boolean> {
  const res = await api.delete(`/notifications/${id}`);
  return Boolean(res.data?.success);
}
