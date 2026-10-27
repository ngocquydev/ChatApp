"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import { Check, Clock, MessageCircle, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
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
          height: { xs: 130, sm: 200 },
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
          px: { xs: 2, sm: 3 },
          pb: 2.5,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "flex-end" },
          gap: 2,
          mt: { xs: -7, sm: -6 },
        }}
      >
        <Box sx={{ borderRadius: "50%", border: "4px solid", borderColor: "background.paper", display: "flex", bgcolor: "background.paper" }}>
          <PresenceAvatar name={user.name} src={user.avatar} size={112} hidePresence />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" }, pb: { sm: 0.5 } }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>
            {user.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.friendCount} bạn bè
          </Typography>
          {user.bio && (
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {user.bio}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          {relationStatus === "none" && (
            <Button variant="contained" disabled={pending} startIcon={<UserPlus size={18} aria-hidden />} onClick={onSendRequest}>
              Kết bạn
            </Button>
          )}
          {relationStatus === "pending_sent" && (
            <Button variant="outlined" color="inherit" disabled={pending} startIcon={<Clock size={18} aria-hidden />} onClick={onCancelRequest}>
              Đã gửi lời mời (Hủy)
            </Button>
          )}
          {relationStatus === "pending_received" && (
            <>
              <Button variant="contained" disabled={pending} startIcon={<Check size={18} aria-hidden />} onClick={() => onRespond("accept")}>
                Chấp nhận
              </Button>
              <Button variant="outlined" color="error" disabled={pending} startIcon={<X size={18} aria-hidden />} onClick={() => onRespond("reject")}>
                Từ chối
              </Button>
            </>
          )}
          {relationStatus === "friends" && (
            <>
              <Button variant="contained" startIcon={<MessageCircle size={18} aria-hidden />} onClick={onMessage}>
                Nhắn tin
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                disabled={pending}
                startIcon={<UserCheck size={18} aria-hidden />}
                endIcon={<UserMinus size={16} aria-hidden />}
                onClick={onUnfriend}
                aria-label="Bạn bè — bấm để hủy kết bạn"
              >
                Bạn bè
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
