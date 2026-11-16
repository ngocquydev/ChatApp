"use client";

import { ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { CheckCheck, Maximize2, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface RecentChatsHeaderMenuProps {
  anchorEl: HTMLElement | null;
  isMuted: boolean;
  onClose: () => void;
  onToggleMute: () => void;
  onMarkAllAsRead: () => void;
  onOpenFullChat: () => void;
}

export default function RecentChatsHeaderMenu({
  anchorEl,
  isMuted,
  onClose,
  onToggleMute,
  onMarkAllAsRead,
  onOpenFullChat,
}: RecentChatsHeaderMenuProps) {
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
          onMarkAllAsRead();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          <CheckCheck size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Đánh dấu tất cả là đã đọc", "Mark all as read")}
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
          {isMuted ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {isMuted ? tr("Bật âm thanh tin nhắn", "Unmute message sounds") : tr("Tắt âm thanh tin nhắn", "Mute message sounds")}
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onOpenFullChat();
          onClose();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          <Maximize2 size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {tr("Xem tất cả trong Messenger", "See all in Messenger")}
          </Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}
