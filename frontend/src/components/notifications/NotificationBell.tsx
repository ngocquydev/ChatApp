"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Popover,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Bell, BellOff, CheckCheck, Trash2 } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { useTranslation } from "@/i18n/useTranslation";
import type { SupportedLanguage } from "@/i18n/types";
import { useNotificationStore } from "@/store/useNotificationStore";
import { usePostModalStore } from "@/store/usePostModalStore";
import { formatRelativeTime } from "@/utils/formatTime";
import type { NotificationItem } from "@/services/notificationsApi";

function getLocalizedNotificationBody(item: NotificationItem, language: SupportedLanguage): string {
  const reactionType = (item.metadata?.reactionType as string) || "like";

  if (item.type === "post_like") {
    const map: Record<SupportedLanguage, Record<string, string>> = {
      vi: {
        like: "đã thích bài viết của bạn.",
        love: "đã thả tim bài viết của bạn.",
        care: "đã bày tỏ cảm xúc thương thương với bài viết của bạn.",
        haha: "đã thả haha vào bài viết của bạn.",
        wow: "đã bày tỏ ngạc nhiên về bài viết của bạn.",
        sad: "đã bày tỏ cảm xúc buồn về bài viết của bạn.",
        angry: "đã thả phẫn nộ vào bài viết của bạn.",
      },
      en: {
        like: "liked your post.",
        love: "loved your post.",
        care: "cared about your post.",
        haha: "laughed at your post.",
        wow: "was amazed by your post.",
        sad: "was saddened by your post.",
        angry: "reacted with anger to your post.",
      },
      "zh-CN": {
        like: "赞了你的帖子。",
        love: "对你的帖子表达了喜爱。",
        care: "对你的帖子表示关心。",
        haha: "对你的帖子表示哈哈。",
        wow: "对你的帖子表示惊讶。",
        sad: "对你的帖子感到难过。",
        angry: "对你的帖子感到愤怒。",
      },
      "zh-TW": {
        like: "說你的貼文讚。",
        love: "對你的貼文表示大愛。",
        care: "對你的貼文表示加油。",
        haha: "對你的貼文表示哈。",
        wow: "對你的貼文表示哇。",
        sad: "對你的貼文感到難過。",
        angry: "對你的貼文表示怒。",
      },
      ko: {
        like: "회원님의 게시물을 좋아합니다.",
        love: "회원님의 게시물을 최고로 꼽았습니다.",
        care: "회원님의 게시물에 따뜻함을 전했습니다.",
        haha: "회원님의 게시물에 웃음을 남겼습니다.",
        wow: "회원님의 게시물에 놀라움을 표현했습니다.",
        sad: "회원님의 게시물에 슬퍼했습니다.",
        angry: "회원님의 게시물에 화가 났습니다.",
      },
      th: {
        like: "ถูกใจโพสต์ของคุณ",
        love: "รักโพสต์ของคุณ",
        care: "ห่วงใยโพสต์ของคุณ",
        haha: "ขำโพสต์ของคุณ",
        wow: "ว้าวกับโพสต์ของคุณ",
        sad: "เศร้ากับโพสต์ของคุณ",
        angry: "โกรธโพสต์ของคุณ",
      },
    };
    return map[language]?.[reactionType] || map[language]?.like || map.vi.like;
  }

  if (item.type === "post_comment") {
    const map: Record<SupportedLanguage, string> = {
      vi: "đã bình luận về bài viết của bạn.",
      en: "commented on your post.",
      "zh-CN": "评论了你的帖子。",
      "zh-TW": "在你的貼文留言。",
      ko: "회원님의 게시물에 댓글을 남겼습니다.",
      th: "แสดงความคิดเห็นบนโพสต์ของคุณ",
    };
    return map[language] || map.vi;
  }

  if (item.type === "post_share") {
    const map: Record<SupportedLanguage, string> = {
      vi: "đã chia sẻ bài viết của bạn.",
      en: "shared your post.",
      "zh-CN": "分享了你的帖子。",
      "zh-TW": "分享了你的貼文。",
      ko: "회원님의 게시물을 공유했습니다.",
      th: "แชร์โพสต์ของคุณ",
    };
    return map[language] || map.vi;
  }

  if (item.type === "friend_request") {
    const map: Record<SupportedLanguage, string> = {
      vi: "đã gửi cho bạn một lời mời kết bạn.",
      en: "sent you a friend request.",
      "zh-CN": "向你发送了好友请求。",
      "zh-TW": "向你傳送了交友邀請。",
      ko: "회원님에게 친구 요청을 보냈습니다.",
      th: "ส่งคำขอเป็นเพื่อนถึงคุณ",
    };
    return map[language] || map.vi;
  }

  if (item.type === "friend_accepted") {
    const map: Record<SupportedLanguage, string> = {
      vi: "đã chấp nhận lời mời kết bạn của bạn.",
      en: "accepted your friend request.",
      "zh-CN": "接受了你的好友请求。",
      "zh-TW": "接受了你的交友邀請。",
      ko: "회원님의 친구 요청을 수락했습니다.",
      th: "ยอมรับคำขอเป็นเพื่อนของคุณแล้ว",
    };
    return map[language] || map.vi;
  }

  if (item.type === "mention") {
    const map: Record<SupportedLanguage, string> = {
      vi: "đã nhắc đến bạn trong một bài viết.",
      en: "mentioned you in a post.",
      "zh-CN": "在帖子中提及了你。",
      "zh-TW": "在一則貼文中提及了你。",
      ko: "게시물에서 회원님을 언급했습니다.",
      th: "ได้กล่าวถึงคุณในโพสต์",
    };
    return map[language] || map.vi;
  }

  if (item.content.startsWith(item.actor.name)) {
    return item.content.slice(item.actor.name.length).trim();
  }
  return item.content;
}

const NOTIFICATION_PAGE_SIZE = 5;

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(NOTIFICATION_PAGE_SIZE);
  const { t, tr, language } = useTranslation();

  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchNotifications,
    loadMore,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Tự động nâng visibleCount để hiển thị các mục vừa tải thêm
  useEffect(() => {
    if (notifications.length > visibleCount && visibleCount > NOTIFICATION_PAGE_SIZE) {
      setVisibleCount(notifications.length);
    }
  }, [notifications.length, visibleCount]);

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setVisibleCount(NOTIFICATION_PAGE_SIZE);
    void fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
    setVisibleCount(NOTIFICATION_PAGE_SIZE);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 80) {
      if (visibleCount < notifications.length) {
        setVisibleCount((prev) => Math.min(prev + NOTIFICATION_PAGE_SIZE, notifications.length));
      } else if (hasMore && !isLoadingMore) {
        void loadMore();
      }
    }
  };

  const handleClickItem = (item: NotificationItem) => {
    if (!item.isRead) {
      void markAsRead(item._id);
    }
    handleClose();

    // Nếu thông báo liên quan đến bài viết (bình luận, thả icon, chia sẻ, tag tên):
    const targetPostId =
      (item.metadata?.postId as string | undefined) ||
      (item.metadata?.originalPostId as string | undefined) ||
      (item.metadata?.sharedPostId as string | undefined);

    if (targetPostId) {
      usePostModalStore.getState().openPostModal(targetPostId);
      return;
    }

    if (item.link) {
      router.push(item.link);
    }
  };

  const handleDeleteItem = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    void deleteNotification(id);
  };

  const displayedNotifications = notifications.slice(0, visibleCount);
  const canLoadMore = visibleCount < notifications.length || hasMore;
  const isOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={t("notifications.title")}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label={t("notifications.title")}
          aria-haspopup="true"
          aria-expanded={isOpen}
          sx={{
            color: "white",
            minWidth: 40,
            minHeight: 40,
            borderRadius: "50%",
            "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)" },
          }}
        >
          <Badge
            color="error"
            badgeContent={unreadCount}
            max={99}
            invisible={unreadCount === 0}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.7rem",
                height: 18,
                minWidth: 18,
                px: 0.5,
              },
            }}
          >
            <Bell size={20} aria-hidden />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        disableScrollLock
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 320, sm: 380 },
              maxHeight: 490,
              borderRadius: "16px",
              boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.2)",
              mt: 1,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        {/* Header Popover */}
        <Box
          sx={{
            p: 1.5,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {t("notifications.title")}
            </Typography>
            {unreadCount > 0 && (
              <Box
                sx={{
                  bgcolor: "error.main",
                  color: "common.white",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  px: 0.8,
                  py: 0.1,
                  borderRadius: "10px",
                }}
              >
                {unreadCount}
              </Box>
            )}
          </Box>

          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={14} aria-hidden />}
              onClick={() => void markAllAsRead()}
              sx={{ fontSize: "0.75rem", textTransform: "none", py: 0.2 }}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </Box>

        {/* Nội dung danh sách */}
        <Box
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 1,
            maxHeight: 390,
          }}
        >
          {isLoading && notifications.length === 0 ? (
            <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[1, 2, 3].map((k) => (
                <Box key={k} sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="80%" height={20} />
                    <Skeleton variant="text" width="45%" height={16} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : notifications.length === 0 ? (
            <EmptyState
              compact
              icon={<BellOff size={28} />}
              title={tr("Chưa có thông báo nào", "No notifications yet")}
              description={tr("Bạn sẽ nhận được thông báo khi có người kết bạn hoặc tương tác.", "You'll receive notifications when someone adds you or interacts with your posts.")}
            />
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {displayedNotifications.map((item) => (
                <Box
                  key={item._id}
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "12px",
                    bgcolor: item.isRead ? "transparent" : "action.hover",
                    transition: "background-color 0.2s ease",
                    "&:hover": { bgcolor: "action.hover" },
                    position: "relative",
                  }}
                >
                  <ButtonBase
                    component="div"
                    onClick={() => handleClickItem(item)}
                    aria-label={item.title}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.2,
                      pr: 5,
                      borderRadius: "12px",
                      textAlign: "left",
                      justifyContent: "flex-start",
                    }}
                  >
                    <PresenceAvatar
                      name={item.actor.name}
                      src={item.actor.avatar}
                      size={40}
                      hidePresence
                    />

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.85rem",
                          color: "text.primary",
                          lineHeight: 1.35,
                        }}
                      >
                        <strong>{item.actor.name}</strong>{" "}
                        {getLocalizedNotificationBody(item, language)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        suppressHydrationWarning
                        sx={{ fontSize: "0.75rem", display: "block", mt: 0.3 }}
                      >
                        {formatRelativeTime(item.createdAt)}
                      </Typography>
                    </Box>
                  </ButtonBase>

                  {/* Nút xóa & Chấm xanh chưa đọc nằm ngoài ButtonBase (không lồng button vào button) */}
                  <Box
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      zIndex: 2,
                    }}
                  >
                    {!item.isRead && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                        }}
                      />
                    )}

                    <IconButton
                      size="small"
                      aria-label={tr("Xóa thông báo", "Delete notification")}
                      onClick={(e) => handleDeleteItem(e, item._id)}
                      sx={{
                        opacity: 0.5,
                        "&:hover": { opacity: 1, color: "error.main" },
                        p: 0.5,
                      }}
                    >
                      <Trash2 size={14} aria-hidden />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              {/* Đang tải thêm khi cuộn */}
              {isLoadingMore && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                  <CircularProgress size={20} />
                </Box>
              )}

              {/* Nút xem thêm dự phòng nếu cần click thủ công */}
              {canLoadMore && !isLoadingMore && (
                <Button
                  fullWidth
                  size="small"
                  onClick={() => {
                    if (visibleCount < notifications.length) {
                      setVisibleCount((prev) => Math.min(prev + NOTIFICATION_PAGE_SIZE, notifications.length));
                    } else if (hasMore) {
                      void loadMore();
                    }
                  }}
                  sx={{ mt: 1, fontSize: "0.8rem", fontWeight: 600, textTransform: "none" }}
                >
                  {t("notifications.loadMore")}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
