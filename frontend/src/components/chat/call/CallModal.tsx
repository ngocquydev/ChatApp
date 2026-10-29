// src/components/chat/call/CallModal.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Avatar,
  Paper,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Sparkles,
} from "lucide-react";
import { useCallStore } from "@/store/useCallStore";
import { useTranslation } from "@/i18n/useTranslation";
import { mediaUrl } from "@/services/postsApi";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CallModal() {
  const { tr } = useTranslation();
  const {
    callStatus,
    callType,
    partner,
    isCaller,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    duration,
    error,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    initSocketListeners,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo socket listeners cho call
  useEffect(() => {
    initSocketListeners();
  }, [initSocketListeners]);

  // Gắn stream vào các thẻ video / audio
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  if (callStatus === "idle") return null;

  const isVideo = callType === "video";
  const partnerAvatar = partner?.avatar ? mediaUrl(partner.avatar) : "";

  return (
    <Dialog
      open
      maxWidth={isVideo && callStatus === "connected" ? "md" : "xs"}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            overflow: "hidden",
            bgcolor: "var(--mui-palette-background-paper)",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.25)",
            position: "relative",
          },
        },
      }}
    >
      {/* ───────────────────────── 1. CUỘC GỌI ĐẾN (INCOMING) ───────────────────────── */}
      {callStatus === "incoming" && (
        <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Animated Avatar Rings */}
          <Box sx={{ position: "relative", mb: 3 }}>
            <Box
              sx={{
                position: "absolute",
                inset: -12,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: "primary.main",
                animation: "ripple 2s infinite ease-in-out",
                "@keyframes ripple": {
                  "0%": { transform: "scale(0.8)", opacity: 1 },
                  "100%": { transform: "scale(1.4)", opacity: 0 },
                },
              }}
            />
            <Avatar
              src={partnerAvatar}
              alt={partner?.name}
              sx={{ width: 96, height: 96, border: "3px solid", borderColor: "primary.main", boxShadow: 3 }}
            >
              {partner?.name?.charAt(0) || "U"}
            </Avatar>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            {partner?.name}
          </Typography>

          <Chip
            size="small"
            icon={isVideo ? <Video size={14} /> : <Phone size={14} />}
            label={isVideo ? tr("Cuộc gọi video đến…", "Incoming video call…") : tr("Cuộc gọi thoại đến…", "Incoming voice call…")}
            sx={{ mb: 4, fontWeight: 600, bgcolor: "action.selected" }}
          />

          {/* Action Buttons: Accept / Decline */}
          <Box sx={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", width: "100%" }}>
            <Box sx={{ textAlign: "center" }}>
              <IconButton
                aria-label={tr("Từ chối cuộc gọi", "Decline call")}
                onClick={rejectCall}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "var(--mui-palette-tone-ef4444)",
                  color: "var(--mui-palette-common-white)",
                  "&:hover": { bgcolor: "var(--mui-palette-tone-dc2626)" },
                  boxShadow: "0 8px 16px -4px rgba(239,68,68,0.4)",
                }}
              >
                <PhoneOff size={24} />
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600, color: "text.secondary" }}>
                {tr("Từ chối", "Decline")}
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center" }}>
              <IconButton
                aria-label={tr("Trả lời cuộc gọi", "Answer call")}
                onClick={() => void acceptCall()}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "var(--mui-palette-tone-10b981)",
                  color: "var(--mui-palette-common-white)",
                  "&:hover": { bgcolor: "var(--mui-palette-tone-059669)" },
                  boxShadow: "0 8px 16px -4px rgba(16,185,129,0.4)",
                  animation: "bounce 1.5s infinite",
                  "@keyframes bounce": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-4px)" },
                  },
                }}
              >
                {isVideo ? <Video size={24} /> : <Phone size={24} />}
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600, color: "text.secondary" }}>
                {tr("Trả lời", "Answer")}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ───────────────────────── 2. ĐANG GỌI ĐI (CALLING) ───────────────────────── */}
      {callStatus === "calling" && (
        <Box sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box sx={{ position: "relative", mb: 3 }}>
            <Box
              sx={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                border: "2px dashed",
                borderColor: "primary.main",
                animation: "spin 6s linear infinite",
                "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
              }}
            />
            <Avatar
              src={partnerAvatar}
              alt={partner?.name}
              sx={{ width: 96, height: 96, border: "3px solid", borderColor: "primary.main", boxShadow: 3 }}
            >
              {partner?.name?.charAt(0) || "U"}
            </Avatar>
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            {partner?.name}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
            {isVideo ? tr("Đang gọi video…", "Calling video…") : tr("Đang gọi thoại…", "Calling…")}
          </Typography>

          <Typography variant="caption" color="text.disabled" sx={{ mb: 4, display: "block" }}>
            {tr("Đang chờ đối phương nhấc máy…", "Waiting for response…")}
          </Typography>

          <Box sx={{ textAlign: "center" }}>
            <IconButton
              aria-label={tr("Hủy cuộc gọi", "Cancel call")}
              onClick={endCall}
              sx={{
                width: 56,
                height: 56,
                bgcolor: "var(--mui-palette-tone-ef4444)",
                color: "var(--mui-palette-common-white)",
                "&:hover": { bgcolor: "var(--mui-palette-tone-dc2626)" },
                boxShadow: "0 8px 16px -4px rgba(239,68,68,0.4)",
              }}
            >
              <PhoneOff size={24} />
            </IconButton>
            <Typography variant="caption" sx={{ display: "block", mt: 1, fontWeight: 600, color: "text.secondary" }}>
              {tr("Hủy", "Cancel")}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ───────────────────────── 3. ĐÃ KẾT NỐI (CONNECTED) ───────────────────────── */}
      {callStatus === "connected" && (
        <Box sx={{ position: "relative", width: "100%", height: isVideo ? { xs: 450, sm: 520 } : 360, bgcolor: "var(--mui-palette-neutral-900)", display: "flex", flexDirection: "column" }}>
          {/* Audio receiver element (luôn phát âm thanh đối phương) */}
          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

          {/* Header Thông Tin Cuộc Gọi */}
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              p: 1,
              px: 2,
              borderRadius: "16px",
              bgcolor: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              color: "var(--mui-palette-common-white)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={partnerAvatar} sx={{ width: 34, height: 34 }}>
                {partner?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "inherit", lineHeight: 1.2 }}>
                  {partner?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                  {isVideo ? tr("Cuộc gọi video", "Video call") : tr("Cuộc gọi thoại", "Voice call")}
                </Typography>
              </Box>
            </Box>

            <Chip
              size="small"
              label={formatDuration(duration)}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "var(--mui-palette-common-white)",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            />
          </Box>

          {/* Vùng hiển thị nội dung cuộc gọi */}
          <Box sx={{ flex: 1, position: "relative", width: "100%", height: "100%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isVideo ? (
              <>
                {/* Remote Video (toàn màn hình modal) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    backgroundColor: "transparent",
                  }}
                />

                {/* Local Video Picture-in-Picture */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 84,
                    right: 16,
                    width: { xs: 96, sm: 128 },
                    height: { xs: 128, sm: 170 },
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    zIndex: 5,
                    bgcolor: "var(--mui-palette-neutral-800)",
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)", // Gương soi tự nhiên
                    }}
                  />
                </Box>
              </>
            ) : (
              /* Giao diện Thoại (Audio Call) với hiệu ứng sóng âm nhạc sống động */
              <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", color: "var(--mui-palette-common-white)" }}>
                <Box sx={{ position: "relative", mb: 2 }}>
                  <Box
                    sx={{
                      position: "absolute",
                      inset: -14,
                      borderRadius: "50%",
                      bgcolor: "rgba(37,99,235,0.25)",
                      animation: "pulse 2s infinite",
                      "@keyframes pulse": {
                        "0%": { transform: "scale(0.9)", opacity: 0.8 },
                        "50%": { transform: "scale(1.25)", opacity: 0.3 },
                        "100%": { transform: "scale(0.9)", opacity: 0.8 },
                      },
                    }}
                  />
                  <Avatar src={partnerAvatar} sx={{ width: 104, height: 104, border: "3px solid rgba(255,255,255,0.4)" }}>
                    {partner?.name?.charAt(0)}
                  </Avatar>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: "var(--mui-palette-common-white)" }}>
                  {partner?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  {tr("Đang đàm thoại chất lượng cao (WebRTC)", "HD Voice connected (WebRTC)")}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Thanh công cụ điều khiển (Controls Bar) */}
          <Box
            sx={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 2.5,
              bgcolor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(12px)",
              p: 1.25,
              px: 3,
              borderRadius: "32px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            {/* Toggle Mic */}
            <Tooltip title={isMuted ? tr("Bật micro", "Unmute mic") : tr("Tắt micro", "Mute mic")}>
              <IconButton
                aria-label={isMuted ? tr("Bật micro", "Unmute mic") : tr("Tắt micro", "Mute mic")}
                onClick={toggleMute}
                sx={{
                  bgcolor: isMuted ? "var(--mui-palette-tone-ef4444)" : "rgba(255,255,255,0.2)",
                  color: "var(--mui-palette-common-white)",
                  "&:hover": { bgcolor: isMuted ? "var(--mui-palette-tone-dc2626)" : "rgba(255,255,255,0.3)" },
                }}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </IconButton>
            </Tooltip>

            {/* End Call */}
            <Tooltip title={tr("Kết thúc cuộc gọi", "End call")}>
              <IconButton
                aria-label={tr("Kết thúc cuộc gọi", "End call")}
                onClick={endCall}
                sx={{
                  width: 52,
                  height: 52,
                  bgcolor: "var(--mui-palette-tone-ef4444)",
                  color: "var(--mui-palette-common-white)",
                  "&:hover": { bgcolor: "var(--mui-palette-tone-dc2626)" },
                  boxShadow: "0 4px 16px rgba(239,68,68,0.5)",
                }}
              >
                <PhoneOff size={24} />
              </IconButton>
            </Tooltip>

            {/* Toggle Video (cho cuộc gọi video) */}
            {isVideo && (
              <Tooltip title={isVideoEnabled ? tr("Tắt camera", "Turn off camera") : tr("Bật camera", "Turn on camera")}>
                <IconButton
                  aria-label={isVideoEnabled ? tr("Tắt camera", "Turn off camera") : tr("Bật camera", "Turn on camera")}
                  onClick={toggleVideo}
                  sx={{
                    bgcolor: !isVideoEnabled ? "var(--mui-palette-tone-ef4444)" : "rgba(255,255,255,0.2)",
                    color: "var(--mui-palette-common-white)",
                    "&:hover": { bgcolor: !isVideoEnabled ? "var(--mui-palette-tone-dc2626)" : "rgba(255,255,255,0.3)" },
                  }}
                >
                  {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      )}

      {/* ───────────────────────── 4. KẾT THÚC / BẬN (ENDED) ───────────────────────── */}
      {callStatus === "ended" && (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {error || tr("Cuộc gọi đã kết thúc", "Call ended")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tr("Thời lượng: ", "Duration: ")} {formatDuration(duration)}
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
