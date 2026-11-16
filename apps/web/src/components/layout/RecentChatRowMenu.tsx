"use client";

import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import {
  Archive,
  Bell,
  BellOff,
  Check,
  Mail,
  MessageCircle,
  Trash2,
  User,
  UserX,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface RecentChatRowMenuProps {
  anchorEl: HTMLElement | null;
  isUnread: boolean;
  isMuted: boolean;
  isBlockedByMe: boolean;
  isRestricted: boolean;
  isAuraChat?: boolean;
  onClose: () => void;
  onToggleUnread: () => void;
  onOpenInMessenger: () => void;
  onToggleMute: () => void;
  onViewProfile: () => void;
  onToggleBlock: () => void;
  onToggleRestrict: () => void;
  onDeleteChat: () => void;
}

export default function RecentChatRowMenu({
  anchorEl,
  isUnread,
  isMuted,
  isBlockedByMe,
  isRestricted,
  isAuraChat = false,
  onClose,
  onToggleUnread,
  onOpenInMessenger,
  onToggleMute,
  onViewProfile,
  onToggleBlock,
  onToggleRestrict,
  onDeleteChat,
}: RecentChatRowMenuProps) {
  const { tr } = useTranslation();
  const itemSx = { py: 1, px: 1.5, borderRadius: "8px", gap: 0.5 };
  const labelSx = { fontWeight: 600, fontSize: "0.85rem" };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        root: { sx: { zIndex: 1400 } },
        paper: {
          sx: {
            minWidth: 230,
            borderRadius: "14px",
            p: 0.75,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
            zIndex: 1400,
          },
        },
      }}
    >
      <MenuItem
        onClick={() => {
          onToggleUnread();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          {isUnread ? <Check size={18} aria-hidden /> : <Mail size={18} aria-hidden />}
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {isUnread ? tr("Đánh dấu là đã đọc", "Mark as read") : tr("Đánh dấu là chưa đọc", "Mark as unread")}
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onOpenInMessenger();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          <MessageCircle size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Mở phần nhắn tin", "Open in Messenger")}
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onToggleMute();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          {isMuted ? <Bell size={18} aria-hidden /> : <BellOff size={18} aria-hidden />}
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {isMuted ? tr("Bật thông báo", "Unmute notifications") : tr("Tắt thông báo", "Mute notifications")}
          </Typography>
        </ListItemText>
      </MenuItem>

      {!isAuraChat && (
        <MenuItem
          onClick={() => {
            onViewProfile();
            onClose();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
            <User size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {tr("Xem trang cá nhân", "View profile")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      {!isAuraChat && <Divider sx={{ my: 0.5 }} />}

      {!isAuraChat && (
        <MenuItem
          onClick={() => {
            onToggleBlock();
            onClose();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
            <UserX size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {isBlockedByMe ? tr("Bỏ chặn", "Unblock") : tr("Chặn", "Block")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      {!isAuraChat && (
        <MenuItem
          onClick={() => {
            onToggleRestrict();
            onClose();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
            <Archive size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {isRestricted ? tr("Bỏ lưu trữ đoạn chat", "Unarchive chat") : tr("Lưu trữ đoạn chat", "Archive chat")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onDeleteChat();
          onClose();
        }}
        sx={{ ...itemSx, color: "error.main" }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "error.main" }}>
          <Trash2 size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={{ ...labelSx, color: "error.main" }}>
            {tr("Xóa đoạn chat", "Delete chat")}
          </Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
