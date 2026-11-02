"use client";

import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import {
  Archive,
  Sparkles,
  Bell,
  BellOff,
  ChevronRight,
  Eye,
  MessageCircle,
  Palette,
  ShieldAlert,
  Trash2,
  User,
  UserX,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface FloatingChatHeaderMenuProps {
  anchorEl: HTMLElement | null;
  isMuted: boolean;
  isRestricted: boolean;
  isBlockedByMe: boolean;
  readReceiptsEnabled: boolean;
  isAuraChat?: boolean;
  onClose: () => void;
  onOpenFullChat: () => void;
  onViewProfile: () => void;
  onOpenTheme: () => void;
  onToggleMute: () => void;
  onOpenBlock: () => void;
  onOpenReadReceipts: () => void;
  onOpenRestrict: () => void;
  onArchiveChat: () => void;
  onCloseChat: () => void;
  onDeleteChat?: () => void;
  onOpenSummary?: () => void;
}

export default function FloatingChatHeaderMenu({
  anchorEl,
  isMuted,
  isRestricted,
  isBlockedByMe,
  readReceiptsEnabled,
  isAuraChat = false,
  onClose,
  onOpenFullChat,
  onViewProfile,
  onOpenTheme,
  onToggleMute,
  onOpenBlock,
  onOpenReadReceipts,
  onOpenRestrict,
  onArchiveChat,
  onCloseChat,
  onDeleteChat,
  onOpenSummary,
}: FloatingChatHeaderMenuProps) {
  const { tr } = useTranslation();
  const itemSx = { py: 1, px: 1.5, borderRadius: "10px", gap: 0.5 };
  const labelSx = { fontWeight: 600, fontSize: "0.86rem" };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      disableRestoreFocus
      transformOrigin={{ horizontal: "left", vertical: "top" }}
      anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
      slotProps={{
        paper: {
          sx: {
            width: 260,
            borderRadius: "14px",
            p: 0.75,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
            zIndex: 1400,
          },
        },
      }}
    >
      <MenuItem
        onClick={() => {
          onOpenFullChat();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
          <MessageCircle size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Mở trong Messenger", "Open in Messenger")}
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
          <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
            <User size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {tr("Xem trang cá nhân", "View profile")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onOpenTheme();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "primary.main" }}>
          <Palette size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Đổi chủ đề", "Change theme")}
          </Typography>
        </ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.75 }} />

      <MenuItem
        onClick={() => {
          onToggleMute();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
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
            onOpenBlock();
            onClose();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
            <UserX size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {isBlockedByMe ? tr("Bỏ chặn", "Unblock") : tr("Chặn", "Block")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onOpenReadReceipts();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
          <Eye size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography variant="body2" sx={labelSx}>
              {tr("Thông báo đã đọc", "Read receipts")}
            </Typography>
          }
          secondary={
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.74rem" }}>
              {readReceiptsEnabled ? tr("Bật", "On") : tr("Tắt", "Off")}
            </Typography>
          }
        />
        <ChevronRight size={16} color="var(--mui-palette-text-secondary)" aria-hidden />
      </MenuItem>

      <MenuItem
        onClick={() => {
          onOpenRestrict();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
          <ShieldAlert size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {isRestricted ? tr("Bỏ hạn chế", "Unrestrict") : tr("Hạn chế", "Restrict")}
          </Typography>
        </ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.75 }} />

      {!isAuraChat && (
        <MenuItem
          onClick={() => {
            onArchiveChat();
            onClose();
          }}
          sx={itemSx}
        >
          <ListItemIcon sx={{ minWidth: 34, color: "text.primary" }}>
            <Archive size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={labelSx}>
              {isRestricted ? tr("Bỏ lưu trữ đoạn chat", "Unarchive chat") : tr("Lưu trữ đoạn chat", "Archive chat")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      {onDeleteChat && (
        <MenuItem
          onClick={() => {
            onDeleteChat();
            onClose();
          }}
          sx={{ ...itemSx, color: "error.main" }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: "error.main" }}>
            <Trash2 size={18} aria-hidden />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" sx={{ ...labelSx, color: "error.main" }}>
              {tr("Xóa đoạn chat", "Delete chat")}
            </Typography>
          </ListItemText>
        </MenuItem>
      )}

      <MenuItem
        onClick={() => {
          onCloseChat();
          onClose();
        }}
        sx={{ ...itemSx, color: "text.secondary" }}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "text.secondary" }}>
          <Trash2 size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Đóng đoạn chat", "Close chat")}
          </Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
