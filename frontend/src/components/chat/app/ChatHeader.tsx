"use client";

import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { ArrowLeft, MoreVertical, Phone, Video, Volume2, VolumeX } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { ChatUser } from "@/store/useChatStore";

interface ChatHeaderProps {
  partner: ChatUser | null;
  isOnline: boolean;
  isTyping: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  /** Quay lại danh sách (chỉ hiển thị trên mobile). */
  onBack: () => void;
}

/** Nút chưa có chức năng: hiển thị disabled kèm tooltip trung thực thay vì nút "chết". */
function ComingSoonButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip title={`${label} — sắp ra mắt`}>
      <span>
        <IconButton disabled aria-label={`${label} (sắp ra mắt)`} sx={{ color: "text.secondary" }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function ChatHeader({
  partner,
  isOnline,
  isTyping,
  isMuted,
  onToggleMute,
  onBack,
}: ChatHeaderProps) {
  const statusText = isTyping ? "Đang soạn tin nhắn…" : isOnline ? "Đang hoạt động" : "Ngoại tuyến";
  const statusColor = isTyping ? "primary.main" : isOnline ? "success.main" : "text.secondary";

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 1, sm: 2.5 },
        py: 1.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        minHeight: 68,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 }, minWidth: 0 }}>
        <IconButton
          onClick={onBack}
          aria-label="Quay lại danh sách hội thoại"
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <ArrowLeft size={22} />
        </IconButton>

        <PresenceAvatar name={partner?.name} src={partner?.avatar} online={isOnline} size={42} />

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {partner?.name || "Người dùng"}
          </Typography>
          <Typography
            variant="caption"
            role="status"
            aria-live="polite"
            sx={{ color: statusColor, fontWeight: 600, display: "block" }}
          >
            {statusText}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={isMuted ? "Bật âm thanh thông báo" : "Tắt âm thanh thông báo"}>
          <IconButton
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            aria-label={isMuted ? "Bật âm thanh thông báo" : "Tắt âm thanh thông báo"}
            sx={{
              color: isMuted ? "text.secondary" : "primary.main",
              bgcolor: isMuted ? "transparent" : "action.selected",
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
        </Tooltip>
        <Box sx={{ display: { xs: "none", sm: "flex" } }}>
          <ComingSoonButton label="Gọi thoại">
            <Phone size={20} />
          </ComingSoonButton>
          <ComingSoonButton label="Gọi video">
            <Video size={20} />
          </ComingSoonButton>
          <ComingSoonButton label="Tùy chọn khác">
            <MoreVertical size={20} />
          </ComingSoonButton>
        </Box>
      </Box>
    </Box>
  );
}
