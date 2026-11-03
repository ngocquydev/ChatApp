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
import { useNotificationStore } from "@/store/useNotificationStore";
import { formatRelativeTime } from "@/utils/formatTime";
import type { NotificationItem } from "@/services/notificationsApi";

export default function NotificationBell() {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { tr } = useTranslation();

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

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleClickItem = (item: NotificationItem) => {
    if (!item.isRead) {
      void markAsRead(item._id);
    }
    handleClose();
    if (item.link) {
      router.push(item.link);
    }
  };

  const handleDeleteItem = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    void deleteNotification(id);
  };

  const isOpen = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={tr("Thông báo", "Notifications")}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label={tr("Thông báo hệ thống", "System notifications")}
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
              {tr("Thông báo", "Notifications")}
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
              {tr("Đã đọc tất cả", "Mark all as read")}
            </Button>
          )}
        </Box>

        {/* Nội dung danh sách */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
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
              {notifications.map((item) => (
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
                        {item.content.startsWith(item.actor.name)
                          ? item.content.slice(item.actor.name.length).trim()
                          : item.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
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

              {hasMore && (
                <Button
                  fullWidth
                  size="small"
                  onClick={() => void loadMore()}
                  disabled={isLoadingMore}
                  sx={{ mt: 1, fontSize: "0.8rem", fontWeight: 600 }}
                >
                  {isLoadingMore ? <CircularProgress size={16} /> : tr("Xem thêm thông báo", "Load more notifications")}
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}
