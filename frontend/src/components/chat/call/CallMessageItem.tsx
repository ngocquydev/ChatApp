"use client";

import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { Phone, PhoneCall, PhoneMissed, PhoneOff, Video, VideoOff } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { ChatMessage } from "@/store/useChatStore";
import { useCallStore, CallType } from "@/store/useCallStore";

interface CallMessageItemProps {
  message: ChatMessage;
  isMe: boolean;
  partner?: { id: string; name: string; avatar?: string } | null;
  conversationId?: string;
}

function formatDurationSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CallMessageItem({
  message,
  isMe,
  partner,
  conversationId,
}: CallMessageItemProps) {
  const { tr } = useTranslation();
  const { startCall } = useCallStore();

  const text = message.text || "";
  const log = message.callLog;

  // Xác định loại cuộc gọi (audio hay video)
  const isVideo: boolean =
    log?.callType === "video" ||
    text.includes("video") ||
    text.includes("📹");
  const callType: CallType = isVideo ? "video" : "audio";

  // Xác định trạng thái cuộc gọi
  let status: "missed" | "declined" | "completed" | "busy" | "cancelled" =
    log?.status || "completed";

  if (!log) {
    if (text.includes("nhỡ")) {
      status = "missed";
    } else if (text.includes("từ chối")) {
      status = "declined";
    } else if (text.includes("máy bận")) {
      status = "busy";
    } else if (text.includes("đã hủy")) {
      status = "cancelled";
    } else {
      status = "completed";
    }
  }

  // Thời lượng cuộc gọi
  let duration = log?.duration || 0;
  if (!duration) {
    const match = text.match(/\((\d{1,2}):(\d{2})\)/);
    if (match) {
      duration = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
  }

  // Cuộc gọi nhỡ đối với người nhận
  const isMissedIncoming = !isMe && (status === "missed" || status === "declined");

  // Xử lý icon phù hợp
  const renderIcon = () => {
    if (isVideo) {
      if (status === "missed" || status === "declined") {
        return <VideoOff size={18} />;
      }
      return <Video size={18} />;
    }
    if (status === "missed") {
      return isMissedIncoming ? <PhoneMissed size={18} /> : <PhoneOff size={18} />;
    }
    if (status === "declined" || status === "cancelled") {
      return <PhoneOff size={18} />;
    }
    return <PhoneCall size={18} />;
  };

  // Tiêu đề cuộc gọi
  const getTitle = () => {
    if (isVideo) {
      if (status === "missed") {
        return isMissedIncoming
          ? tr("Cuộc gọi video nhỡ", "Missed video call")
          : tr("Cuộc gọi video không phản hồi", "Unanswered video call");
      }
      if (status === "declined") {
        return tr("Cuộc gọi video bị từ chối", "Declined video call");
      }
      if (status === "busy") {
        return tr("Cuộc gọi video — máy bận", "Video call — busy");
      }
      return tr("Cuộc gọi video", "Video call");
    }

    if (status === "missed") {
      return isMissedIncoming
        ? tr("Cuộc gọi thoại nhỡ", "Missed voice call")
        : tr("Cuộc gọi thoại không phản hồi", "Unanswered voice call");
    }
    if (status === "declined") {
      return tr("Cuộc gọi thoại bị từ chối", "Declined voice call");
    }
    if (status === "busy") {
      return tr("Cuộc gọi thoại — máy bận", "Voice call — busy");
    }
    return tr("Cuộc gọi thoại", "Voice call");
  };

  // Phụ đề mô tả thời lượng hoặc thao tác gọi lại
  const getSubtitle = () => {
    if (status === "completed") {
      return `${tr("Thời lượng", "Duration")}: ${formatDurationSec(duration)}`;
    }
    if (isMissedIncoming) {
      return tr("Nhấn để gọi lại", "Tap to call back");
    }
    if (isMe) {
      return tr("Bạn đã hủy cuộc gọi", "You cancelled the call");
    }
    return tr("Cuộc gọi đã kết thúc", "Call ended");
  };

  const handleCallBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (partner) {
      void startCall(
        {
          id: partner.id,
          name: partner.name,
          avatar: partner.avatar,
          conversationId,
        },
        callType
      );
    }
  };

  return (
    <ButtonBase
      component="div"
      onClick={partner ? handleCallBack : undefined}
      focusRipple
      aria-label={`${getTitle()} — ${getSubtitle()}`}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.25,
        px: 1.75,
        py: 1.1,
        borderRadius: "14px",
        minWidth: { xs: 200, sm: 220 },
        maxWidth: 280,
        textAlign: "left",
        cursor: partner ? "pointer" : "default",
        bgcolor: isMissedIncoming
          ? "rgba(239, 68, 68, 0.08)"
          : isMe
            ? "action.selected"
            : "action.hover",
        border: "1px solid",
        borderColor: isMissedIncoming ? "error.light" : "divider",
        transition: "all 0.15s ease",
        "&:hover": partner
          ? {
              bgcolor: isMissedIncoming
                ? "rgba(239, 68, 68, 0.14)"
                : "action.selected",
            }
          : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
        {/* Vòng tròn Icon */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            bgcolor: isMissedIncoming
              ? "error.main"
              : status === "completed"
                ? "primary.main"
                : "text.secondary",
            color: "common.white",
          }}
        >
          {renderIcon()}
        </Box>

        {/* Thông tin Text */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: "0.875rem",
              lineHeight: 1.25,
              color: isMissedIncoming ? "error.main" : "text.primary",
            }}
          >
            {getTitle()}
          </Typography>

          <Typography
            variant="caption"
            noWrap
            sx={{
              display: "block",
              fontSize: "0.75rem",
              color: isMissedIncoming ? "error.dark" : "text.secondary",
              mt: 0.25,
            }}
          >
            {getSubtitle()}
          </Typography>
        </Box>
      </Box>

      {/* Nút hành động Gọi lại nếu có đối tác */}
      {partner && (
        <Tooltip title={tr("Gọi lại", "Call back")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.65,
              borderRadius: "50%",
              bgcolor: "background.paper",
              color: isMissedIncoming ? "error.main" : "primary.main",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flexShrink: 0,
              ml: 0.5,
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            {isVideo ? <Video size={15} /> : <Phone size={15} />}
          </Box>
        </Tooltip>
      )}
    </ButtonBase>
  );
}
