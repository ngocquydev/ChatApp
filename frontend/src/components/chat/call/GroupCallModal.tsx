"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Dialog,
  IconButton,
  Tooltip,
  Typography,
  Chip,
  Slide,
} from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import { forwardRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import { useGroupCallStore, GroupCallPeer } from "@/store/useGroupCallStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/i18n/useTranslation";
import { v } from "@/theme/tokens";

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Component hiển thị video của từng peer từ xa
function RemotePeerVideo({
  peer,
  isActiveSpeaker,
}: {
  peer: GroupCallPeer;
  isActiveSpeaker: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        bgcolor: "background.paper",
        border: isActiveSpeaker ? "2.5px solid" : "1px solid",
        borderColor: isActiveSpeaker ? "success.main" : "divider",
        transition: "border-color 0.25s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {peer.isVideoEnabled && peer.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Box sx={{ textAlign: "center" }}>
          <Avatar
            src={peer.avatar}
            sx={{
              width: 72,
              height: 72,
              mx: "auto",
              mb: 1,
              bgcolor: "primary.main",
              fontSize: "1.75rem",
              fontWeight: 700,
            }}
          >
            {peer.name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {peer.name}
          </Typography>
        </Box>
      )}

      {/* Tên thành viên và trạng thái mic góc dưới */}
      <Box
        sx={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
          px: 1.25,
          py: 0.5,
          borderRadius: "8px",
        }}
      >
        <Typography variant="caption" sx={{ color: v.white, fontWeight: 600 }}>
          {peer.name}
        </Typography>
        {peer.isMuted && <MicOff size={14} color="var(--mui-palette-error-main)" />}
      </Box>
    </Box>
  );
}

export default function GroupCallModal() {
  const { tr } = useTranslation();
  const { user } = useAuthStore();
  const {
    isOpen,
    callType,
    groupName,
    localStream,
    peers,
    activeSpeakerId,
    isMuted,
    isVideoEnabled,
    incomingCall,
    initSocketListeners,
    leaveGroupCall,
    toggleMute,
    toggleVideo,
    acceptIncomingCall,
    rejectIncomingCall,
  } = useGroupCallStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    initSocketListeners();
  }, [initSocketListeners]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const peerList = Object.values(peers);
  const totalCount = peerList.length + 1;

  // Tính grid layout tối ưu: 1 người (1x1), 2 người (2x1), 3-4 người (2x2), 5-9 người (3x3)
  const getGridTemplate = () => {
    if (totalCount <= 1) return { xs: "1fr", sm: "1fr" };
    if (totalCount === 2) return { xs: "1fr 1fr", sm: "1fr 1fr" };
    if (totalCount <= 4) return { xs: "repeat(2, 1fr)", sm: "repeat(2, 1fr)" };
    return { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" };
  };

  return (
    <>
      {/* Dialog nhận cuộc gọi nhóm đến */}
      {incomingCall && !isOpen && (
        <Dialog
          open={Boolean(incomingCall)}
          disableScrollLock
          autoFocus={false}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "20px",
                p: 2.5,
                width: "100%",
                maxWidth: 360,
                textAlign: "center",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              },
            },
          }}
        >
          <Avatar
            src={incomingCall.groupAvatar || incomingCall.callerAvatar}
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 2,
              bgcolor: "primary.main",
              fontSize: "2rem",
              fontWeight: 800,
            }}
          >
            {incomingCall.groupName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            {incomingCall.groupName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tr(
              `${incomingCall.callerName} đang gọi nhóm...`,
              `${incomingCall.callerName} is starting a group call...`
            )}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 1 }}>
            <Tooltip title={tr("Từ chối", "Decline")}>
              <IconButton
                onClick={rejectIncomingCall}
                aria-label={tr("Từ chối cuộc gọi nhóm", "Decline group call")}
                sx={{
                  bgcolor: "error.main",
                  color: v.white,
                  width: 56,
                  height: 56,
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                <PhoneOff size={24} />
              </IconButton>
            </Tooltip>
            <Tooltip title={tr("Tham gia", "Join")}>
              <IconButton
                onClick={() => void acceptIncomingCall()}
                aria-label={tr("Tham gia cuộc gọi nhóm", "Join group call")}
                sx={{
                  bgcolor: "success.main",
                  color: v.white,
                  width: 56,
                  height: 56,
                  "&:hover": { bgcolor: "success.dark" },
                }}
              >
                <Phone size={24} />
              </IconButton>
            </Tooltip>
          </Box>
        </Dialog>
      )}

      {/* Màn hình chính của cuộc gọi nhóm WebRTC */}
      <Dialog
        fullScreen={isFullScreen}
        open={isOpen}
        slots={{ transition: Transition }}
        disableScrollLock
        autoFocus={false}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              height: isFullScreen ? "100dvh" : "85dvh",
              borderRadius: isFullScreen ? 0 : "24px",
              bgcolor: "background.default",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        {/* Header thông tin nhóm */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "primary.main",
                fontWeight: 700,
              }}
            >
              {groupName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {groupName}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Chip
                  icon={<Users size={12} />}
                  label={tr(
                    `${totalCount} người tham gia`,
                    `${totalCount} participants`
                  )}
                  size="small"
                  sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {callType === "video"
                    ? tr("Cuộc gọi video nhóm", "Group video call")
                    : tr("Cuộc gọi thoại nhóm", "Group audio call")}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip
              title={
                isFullScreen
                  ? tr("Thu nhỏ", "Exit fullscreen")
                  : tr("Toàn màn hình", "Fullscreen")
              }
            >
              <IconButton
                onClick={() => setIsFullScreen(!isFullScreen)}
                aria-label={
                  isFullScreen
                    ? tr("Thu nhỏ cửa sổ", "Exit fullscreen")
                    : tr("Phóng to toàn màn hình", "Fullscreen")
                }
              >
                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Lưới video / audio người tham gia */}
        <Box
          sx={{
            flex: 1,
            p: 2,
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: getGridTemplate(),
            gridAutoRows: "1fr",
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {/* Ô video của người dùng hiện tại (bản thân) */}
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "16px",
              overflow: "hidden",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)", // Mirror video cho bản thân
                }}
              />
            ) : (
              <Box sx={{ textAlign: "center" }}>
                <Avatar
                  src={user?.avatar}
                  sx={{
                    width: 72,
                    height: 72,
                    mx: "auto",
                    mb: 1,
                    bgcolor: "primary.main",
                    fontSize: "1.75rem",
                    fontWeight: 700,
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || "Y"}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {user?.name || tr("Bạn", "You")}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                left: 12,
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(6px)",
                px: 1.25,
                py: 0.5,
                borderRadius: "8px",
              }}
            >
              <Typography variant="caption" sx={{ color: v.white, fontWeight: 600 }}>
                {tr("Bạn (Tôi)", "You (Me)")}
              </Typography>
              {isMuted && <MicOff size={14} color="var(--mui-palette-error-main)" />}
            </Box>
          </Box>

          {/* Danh sách các peer từ xa trong nhóm */}
          {peerList.map((peer) => (
            <RemotePeerVideo
              key={peer.userId}
              peer={peer}
              isActiveSpeaker={activeSpeakerId === peer.userId}
            />
          ))}
        </Box>

        {/* Thanh công cụ điều khiển cuộc gọi dưới đáy */}
        <Box
          sx={{
            py: 2,
            px: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2.5,
          }}
        >
          <Tooltip title={isMuted ? tr("Bật micro", "Unmute") : tr("Tắt micro", "Mute")}>
            <IconButton
              onClick={toggleMute}
              aria-label={isMuted ? tr("Bật micro", "Unmute") : tr("Tắt micro", "Mute")}
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: isMuted ? "error.main" : "action.hover",
                color: isMuted ? v.white : "text.primary",
                "&:hover": {
                  bgcolor: isMuted ? "error.dark" : "action.selected",
                },
              }}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </IconButton>
          </Tooltip>

          {callType === "video" && (
            <Tooltip
              title={
                isVideoEnabled
                  ? tr("Tắt camera", "Turn off camera")
                  : tr("Bật camera", "Turn on camera")
              }
            >
              <IconButton
                onClick={toggleVideo}
                aria-label={
                  isVideoEnabled
                    ? tr("Tắt camera", "Turn off camera")
                    : tr("Bật camera", "Turn on camera")
                }
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  bgcolor: isVideoEnabled ? "action.hover" : "error.main",
                  color: isVideoEnabled ? "text.primary" : v.white,
                  "&:hover": {
                    bgcolor: isVideoEnabled ? "action.selected" : "error.dark",
                  },
                }}
              >
                {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={tr("Rời cuộc gọi", "Leave call")}>
            <IconButton
              onClick={leaveGroupCall}
              aria-label={tr("Rời cuộc gọi nhóm", "Leave group call")}
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: "error.main",
                color: v.white,
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <PhoneOff size={20} />
            </IconButton>
          </Tooltip>
        </Box>
      </Dialog>
    </>
  );
}
