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

interface RecentChatRowMenuProps {
  anchorEl: HTMLElement | null;
  isUnread: boolean;
  isMuted: boolean;
  isBlockedByMe: boolean;
  isRestricted: boolean;
  onClose: () => void;
  onToggleUnread: () => void;
  onOpenInMessenger: () => void;
  onToggleMute: () => void;
  onViewProfile: () => void;
  onToggleBlock: () => void;
  onToggleRestrict: () => void;
  onHideChat: () => void;
}

export default function RecentChatRowMenu({
  anchorEl,
  isUnread,
  isMuted,
  isBlockedByMe,
  isRestricted,
  onClose,
  onToggleUnread,
  onOpenInMessenger,
  onToggleMute,
  onViewProfile,
  onToggleBlock,
  onToggleRestrict,
  onHideChat,
}: RecentChatRowMenuProps) {
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
            {isUnread ? "Đánh dấu là đã đọc" : "Đánh dấu là chưa đọc"}
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
            Mở phần nhắn tin
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
            {isMuted ? "Bật thông báo" : "Tắt thông báo"}
          </Typography>
        </ListItemText>
      </MenuItem>

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
            Xem trang cá nhân
          </Typography>
        </ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.5 }} />

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
            {isBlockedByMe ? "Bỏ chặn" : "Chặn"}
          </Typography>
        </ListItemText>
      </MenuItem>

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
            {isRestricted ? "Bỏ lưu trữ đoạn chat" : "Lưu trữ đoạn chat"}
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onHideChat();
          onClose();
        }}
        sx={{ ...itemSx, color: "error.main" }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "error.main" }}>
          <Trash2 size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={{ ...labelSx, color: "error.main" }}>
            Xóa đoạn chat
          </Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
