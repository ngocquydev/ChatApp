"use client";

import { Box, ButtonBase, IconButton, Typography } from "@mui/material";
import { MoreHorizontal } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { isAuraBot } from "@/constants/auraBot";
import { useLanguageStore } from "@/i18n/useLanguageStore";
import { useTranslation } from "@/i18n/useTranslation";
import { ConversationItem } from "@/store/useChatStore";

const CLOUDINARY_MEDIA_RE = /^https:\/\/res\.cloudinary\.com\/.+\/(image|video)\/upload\/.+$/i;

export function formatChatPreview(text?: string, isDeleted?: boolean): string {
  const isEn = useLanguageStore.getState().language === "en";
  if (isDeleted) return isEn ? "Message unsent" : "Tin nhắn đã bị thu hồi";
  if (!text) return isEn ? "No messages yet" : "Chưa có tin nhắn";
  const match = text.trim().match(CLOUDINARY_MEDIA_RE);
  if (match) {
    if (match[1].toLowerCase() === "video") {
      return isEn ? "🎬 Sent a video" : "🎬 Đã gửi một video";
    }
    return isEn ? "📷 Sent a photo" : "📷 Đã gửi một hình ảnh";
  }
  return text;
}

export function formatChatShortTime(iso?: string): string {
  if (!iso) return "";
  const isEn = useLanguageStore.getState().language === "en";
  const locale = isEn ? "en-US" : "vi-VN";
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return isEn ? "Just now" : "Vừa xong";
  if (diffMin < 60) return isEn ? `${diffMin}m` : `${diffMin} phút`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  const diffDays = Math.floor(diffHours / 24);
  return diffDays < 7
    ? isEn
      ? `${diffDays}d`
      : `${diffDays} ngày`
    : date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
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
  const { tr } = useTranslation();
  const isGroup = conv.type === "group";
  const other = isGroup ? null : (conv.participants.find((p) => String(p._id || p.id) !== currentUserId) || conv.participants[0]);
  const isOtherAura = !isGroup && isAuraBot(other?._id || other?.id, other?.name);
  const displayName = isGroup
    ? conv.name || tr("Nhóm chat", "Group chat")
    : isOtherAura
      ? "Aura AI"
      : other?.name || tr("Người dùng", "User");
  const avatarSrc = isGroup
    ? conv.avatar
    : isOtherAura
      ? "/assets/avatars/aura-bot.svg"
      : other?.avatar;
  const isSentByMe = String(conv.lastMessage?.senderId || "") === currentUserId;
  const preview = formatChatPreview(conv.lastMessage?.text, conv.lastMessage?.isDeleted);
  const timeStr = formatChatShortTime(conv.lastMessage?.createdAt || conv.updatedAt);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: "12px",
        mb: 0.25,
        pr: 1,
        position: "relative",
        "&:hover": { bgcolor: "action.hover" },
        "&:hover .conv-more-btn": { opacity: 1 },
      }}
    >
      <ButtonBase
        component="div"
        aria-label={tr(`Mở đoạn chat với ${displayName}`, `Open chat with ${displayName}`)}
        onClick={() => onSelect(conv)}
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: "left",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: 1.5,
          p: 1.1,
          borderRadius: "12px",
        }}
      >
        <PresenceAvatar
          name={displayName}
          src={avatarSrc || undefined}
          size={50}
          online={!isGroup && (isOtherAura || isOnline)}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: isUnread ? 700 : 600, fontSize: "0.92rem" }}>
              {displayName}
            </Typography>
            {isOtherAura && <VerifiedBadge size={14} />}
          </Box>
          <Typography
            variant="body2"
            noWrap
            suppressHydrationWarning
            sx={{
              fontSize: "0.8rem",
              color: isUnread ? "primary.main" : "text.secondary",
              fontWeight: isUnread ? 700 : 400,
              fontStyle: conv.lastMessage?.isDeleted ? "italic" : "normal",
            }}
          >
            {conv.lastMessage && isSentByMe && !conv.lastMessage.isDeleted ? `${tr("Bạn", "You")}: ${preview}` : preview}
            {timeStr ? ` · ${timeStr}` : ""}
          </Typography>
        </Box>
      </ButtonBase>

      {/* Cụm nút tùy chọn 3 chấm và chấm chưa đọc tách riêng hoàn toàn khỏi ButtonBase */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, pl: 0.5 }}>
        <IconButton
          className="conv-more-btn"
          size="small"
          aria-label={tr(`Tùy chọn đoạn chat với ${other?.name || "Người dùng"}`, `Chat options for ${other?.name || "User"}`)}
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e.currentTarget, conv);
          }}
          sx={{
            width: 32,
            height: 32,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            opacity: isMenuOpen ? 1 : 0,
            transition: "opacity 0.15s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            "&:hover": { bgcolor: "action.selected" },
          }}
        >
          <MoreHorizontal size={16} />
        </IconButton>

        {isUnread && (
          <Box
            aria-label={tr("Chưa đọc", "Unread")}
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "primary.main",
              flexShrink: 0,
            }}
          />
        )}
      </Box>
    </Box>
  );
}
