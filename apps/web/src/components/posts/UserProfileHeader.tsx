"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { Check, Clock, MessageCircle, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useTranslation } from "@/i18n/useTranslation";
import type { PublicProfile } from "@/services/postsApi";

interface UserProfileHeaderProps {
  profile: PublicProfile;
  /** Đang gọi API đổi quan hệ bạn bè */
  pending: boolean;
  onSendRequest: () => void;
  onCancelRequest: () => void;
  onRespond: (action: "accept" | "reject") => void;
  onUnfriend: () => void;
  onMessage: () => void;
}

/** Đầu trang hồ sơ của người khác: ảnh bìa, ảnh đại diện, tên, tiểu sử và nút theo quan hệ bạn bè. */
export default function UserProfileHeader({
  profile,
  pending,
  onSendRequest,
  onCancelRequest,
  onRespond,
  onUnfriend,
  onMessage,
}: UserProfileHeaderProps) {
  const { tr } = useTranslation();
  const { user, relationStatus } = profile;

  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", overflow: "hidden", bgcolor: "background.paper" }}
    >
      {/* Ảnh bìa: ảnh bìa người dùng hoặc màu thương hiệu mặc định */}
      <Box
        aria-hidden
        sx={{
          height: { xs: 150, sm: 220, md: 240 },
          bgcolor: "primary.main",
          ...(user.cover
            ? {
                backgroundImage: `url(${user.cover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      />

      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          pb: 3,
        }}
      >
        {/* Hàng 1: Avatar nhô lên trên ảnh bìa & Nút bấm hành động bên phải */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "flex-end" },
            justifyContent: "space-between",
            mt: { xs: -7, sm: -8 },
            mb: 2,
            gap: 2,
          }}
        >
          {/* Avatar with Border */}
          <Box
            sx={{
              borderRadius: "50%",
              p: "4px",
              bgcolor: "background.paper",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              display: "flex",
            }}
          >
            <PresenceAvatar name={user.name} src={user.avatar} size={128} hidePresence />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-end" } }}>
            {relationStatus === "none" && (
              <Button variant="contained" disabled={pending} startIcon={<UserPlus size={18} aria-hidden />} onClick={onSendRequest}>
                {tr("Kết bạn", "Add friend")}
              </Button>
            )}
            {relationStatus === "pending_sent" && (
              <Button variant="outlined" color="inherit" disabled={pending} startIcon={<Clock size={18} aria-hidden />} onClick={onCancelRequest}>
                {tr("Đã gửi lời mời (Hủy)", "Request sent (Cancel)")}
              </Button>
            )}
            {relationStatus === "pending_received" && (
              <>
                <Button variant="contained" disabled={pending} startIcon={<Check size={18} aria-hidden />} onClick={() => onRespond("accept")}>
                  {tr("Chấp nhận", "Accept")}
                </Button>
                <Button variant="outlined" color="error" disabled={pending} startIcon={<X size={18} aria-hidden />} onClick={() => onRespond("reject")}>
                  {tr("Từ chối", "Decline")}
                </Button>
              </>
            )}
            {relationStatus === "friends" && (
              <>
                <Button variant="contained" startIcon={<MessageCircle size={18} aria-hidden />} onClick={onMessage}>
                  {tr("Nhắn tin", "Message")}
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={pending}
                  startIcon={<UserCheck size={18} aria-hidden />}
                  endIcon={<UserMinus size={16} aria-hidden />}
                  onClick={onUnfriend}
                  aria-label={tr("Bạn bè — bấm để hủy kết bạn", "Friends — click to unfriend")}
                >
                  {tr("Bạn bè", "Friends")}
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Hàng 2: Tên, Số lượng bạn bè, Tiểu sử - Nằm 100% trên nền thân Card */}
        <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              letterSpacing: "-0.02em",
              fontSize: { xs: "1.65rem", sm: "2rem" },
              overflowWrap: "anywhere",
            }}
          >
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            {profile.friendCount} {tr("bạn bè", "friends")}
          </Typography>
          {user.bio && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 640 }}>
              {user.bio}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
