import { ExploreCardData } from "./ExploreUserCard";
import {
  FriendItem,
  FriendRecommendationResult,
  FriendRequestItem,
  UserRelationResult,
} from "@/store/useFriendStore";
import { useLanguageStore } from "@/i18n/useLanguageStore";

export function buildExploreItems(params: {
  isSearchingMode: boolean;
  tab: number;
  searchResults: UserRelationResult[];
  recommendations: FriendRecommendationResult[];
  receivedRequests: FriendRequestItem[];
  sentRequests: FriendRequestItem[];
  friends: FriendItem[];
  onlineUserIds: string[];
  language?: string;
}): ExploreCardData[] {
  const isEn = (params.language ?? useLanguageStore.getState().language) === "en";
  const {
    isSearchingMode,
    tab,
    searchResults,
    recommendations,
    receivedRequests,
    sentRequests,
    friends,
    onlineUserIds,
  } = params;

  if (isSearchingMode) {
    return searchResults.map((u) => ({
      id: u._id,
      name: u.name,
      avatar: u.avatar,
      bio: u.bio,
      online: onlineUserIds.includes(u._id),
      relationStatus: u.relationStatus,
      requestId: u.requestId,
    }));
  }

  if (tab === 0) {
    return recommendations.map((rec) => ({
      id: rec._id,
      name: rec.name,
      avatar: rec.avatar,
      bio: rec.bio,
      online: onlineUserIds.includes(rec._id),
      mutualFriendsCount: rec.mutualFriendsCount,
      distanceKm: rec.distanceKm,
      friendsCount: rec.friendsCount,
      relationStatus: rec.relationStatus,
      requestId: rec.requestId,
    }));
  }

  if (tab === 1) {
    const received = receivedRequests.flatMap((req) =>
      req.requesterId
        ? [
            {
              id: req.requesterId._id,
              name: req.requesterId.name,
              avatar: req.requesterId.avatar,
              bio: req.requesterId.bio,
              online: onlineUserIds.includes(req.requesterId._id),
              relationStatus: "pending_received" as const,
              requestId: req._id,
              subtitle: isEn ? "Sent you a friend request" : "Đã gửi lời mời kết bạn cho bạn",
            },
          ]
        : [],
    );
    const sent = sentRequests.flatMap((req) =>
      req.recipientId
        ? [
            {
              id: req.recipientId._id,
              name: req.recipientId.name,
              avatar: req.recipientId.avatar,
              bio: req.recipientId.bio,
              online: onlineUserIds.includes(req.recipientId._id),
              relationStatus: "pending_sent" as const,
              requestId: req._id,
              subtitle: isEn ? "Waiting for response to your request" : "Đang chờ phản hồi lời mời của bạn",
            },
          ]
        : [],
    );
    return [...received, ...sent];
  }

  return friends.flatMap((item) => {
    const f = item.friend;
    if (!f) return [];
    const isOnline = onlineUserIds.includes(f._id);
    return [
      {
        id: f._id,
        name: f.name,
        avatar: f.avatar,
        bio: f.bio,
        online: isOnline,
        relationStatus: "friends" as const,
        subtitle: isOnline ? (isEn ? "Online" : "Đang hoạt động") : f.bio || (isEn ? "Friend" : "Bạn bè"),
      },
    ];
  });
}

