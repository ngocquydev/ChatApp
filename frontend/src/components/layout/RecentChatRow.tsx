"use client";

import { Box, ButtonBase, IconButton, Typography } from "@mui/material";
import { MoreHorizontal } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { ConversationItem } from "@/store/useChatStore";

const CLOUDINARY_MEDIA_RE = /^https:\/\/res\.cloudinary\.com\/.+\/(image|video)\/upload\/.+$/i;

export function formatChatPreview(text?: string, isDeleted?: boolean): string {
  if (isDeleted) return "Tin nhắn đã bị thu hồi";
  if (!text) return "Chưa có tin nhắn";
  const match = text.trim().match(CLOUDINARY_MEDIA_RE);
  if (match) return match[1].toLowerCase() === "video" ? "🎬 Đã gửi một video" : "📷 Đã gửi một hình ảnh";
  return text;
}

export function formatChatShortTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor(diffHours / 24);
  return diffDays < 7 ? `${diffDays} ngày` : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

interface RecentChatRowProps {
  conv: ConversationItem;
  currentUserId: string;
  isOnline: boolean;
  isUnread: boolean;
  isMenuOpen: boolean;
  onSelect: (conv: ConversationItem) => void;
  onOpenMenu: (el: HTMLElement, conv: ConversationItem) => void;
}

export default function RecentChatRow({
  conv,
  currentUserId,
  isOnline,
  isUnread,
  isMenuOpen,
  onSelect,
  onOpenMenu,
}: RecentChatRowProps) {
  const other = conv.participants.find((p) => String(p._id || p.id) !== currentUserId) || conv.participants[0];
  const isSentByMe = String(conv.lastMessage?.senderId || "") === currentUserId;
  const preview = formatChatPreview(conv.lastMessage?.text, conv.lastMessage?.isDeleted);
  const timeStr = formatChatShortTime(conv.lastMessage?.createdAt || conv.updatedAt);

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: "12px",
        mb: 0.25,
        "&:hover": { bgcolor: "action.hover" },
        "&:hover .conv-more-btn": { opacity: 1, pointerEvents: "auto" },
      }}
    >
      <ButtonBase
        component="div"
        aria-label={`Mở đoạn chat với ${other?.name || "Người dùng"}`}
        onClick={() => onSelect(conv)}
        sx={{
          width: "100%",
          textAlign: "left",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 1.5,
          p: 1.1,
          pr: 6,
          borderRadius: "12px",
        }}
      >
        <PresenceAvatar name={other?.name} src={other?.avatar} size={50} online={isOnline} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: isUnread ? 700 : 600, fontSize: "0.92rem" }}>
            {other?.name || "Người dùng"}
          </Typography>
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontSize: "0.8rem",
              color: isUnread ? "primary.main" : "text.secondary",
              fontWeight: isUnread ? 700 : 400,
              fontStyle: conv.lastMessage?.isDeleted ? "italic" : "normal",
            }}
          >
            {conv.lastMessage && isSentByMe && !conv.lastMessage.isDeleted ? `Bạn: ${preview}` : preview}
            {timeStr ? ` · ${timeStr}` : ""}
          </Typography>
        </Box>
      </ButtonBase>

      <IconButton
        className="conv-more-btn"
        size="small"
        aria-label={`Tùy chọn đoạn chat với ${other?.name || "Người dùng"}`}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenMenu(e.currentTarget, conv);
        }}
        sx={{
          position: "absolute",
          right: isUnread ? 24 : 10,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: isMenuOpen ? 1 : 0,
          pointerEvents: isMenuOpen ? "auto" : "none",
          transition: "opacity 0.15s ease",
          width: 32,
          height: 32,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          zIndex: 5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          "&:hover": { bgcolor: "action.selected" },
        }}
      >
        <MoreHorizontal size={16} />
      </IconButton>

      {isUnread && (
        <Box
          aria-label="Chưa đọc"
          sx={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: "primary.main",
          }}
        />
      )}
    </Box>
  );
}

