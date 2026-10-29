"use client";

import { ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import { CheckCheck, Maximize2, ShieldAlert, Volume2, VolumeX } from "lucide-react";

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
  const itemSx = { py: 1, px: 1.5, borderRadius: "8px", gap: 0.5 };
  const labelSx = { fontWeight: 600, fontSize: "0.85rem" };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      disableScrollLock
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
          onClose();
          onMarkAllAsRead();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          <CheckCheck size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            Đánh dấu tất cả là đã đọc
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onClose();
          onToggleMute();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          {isMuted ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            {isMuted ? "Bật âm thanh tin nhắn" : "Tắt âm thanh tin nhắn"}
          </Typography>
        </ListItemText>
      </MenuItem>

      <MenuItem
        onClick={() => {
          onClose();
          onOpenFullChat();
        }}
        sx={itemSx}
      >
        <ListItemIcon sx={{ minWidth: 32, color: "text.primary" }}>
          <Maximize2 size={18} aria-hidden />
        </ListItemIcon>
        <ListItemText>
          <Typography variant="body2" sx={labelSx}>
            Xem tất cả trong Messenger
          </Typography>
        </ListItemText>
      </MenuItem>
    </Menu>
  );
}

