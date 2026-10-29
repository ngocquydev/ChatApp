"use client";

import NextLink from "next/link";
import { Box, Button, ButtonBase, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { Check, Clock, MapPin, MessageSquare, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { v } from "@/theme/tokens";

export interface ExploreCardData {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  online?: boolean;
  hidePresence?: boolean;
  mutualFriendsCount?: number;
  distanceKm?: number;
  friendsCount?: number;
  relationStatus: "none" | "pending_sent" | "pending_received" | "friends";
  requestId?: string;
  subtitle?: string;
}

interface ExploreUserCardProps {
  user: ExploreCardData;
  onSendRequest: (userId: string) => void;
  onCancelRequest: (requestId?: string) => void;
  onRespondRequest: (requestId: string, action: "accept" | "reject") => void;
  onMessage: (user: ExploreCardData) => void;
}

export default function ExploreUserCard({
  user,
  onSendRequest,
  onCancelRequest,
  onRespondRequest,
  onMessage,
}: ExploreUserCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": {
          borderColor: v.brand[300],
          bgcolor: v.neutral[50],
        },
      }}
    >
      <ButtonBase
        component={NextLink}
        href={`/profile/${user.id}`}
        aria-label={`Xem trang cá nhân của ${user.name}`}
        sx={{ borderRadius: "50%", flexShrink: 0 }}
      >
        <PresenceAvatar
          name={user.name}
          src={user.avatar}
          online={user.online}
          hidePresence={user.hidePresence}
          size={52}
        />
      </ButtonBase>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component={NextLink}
          href={`/profile/${user.id}`}
          variant="subtitle1"
          noWrap
          sx={{
            display: "block",
            fontWeight: 700,
            color: "text.primary",
            textDecoration: "none",
            fontSize: "0.95rem",
            lineHeight: 1.3,
            "&:hover": { color: "primary.main", textDecoration: "underline" },
          }}
        >
          {user.name}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ display: "block", mt: 0.25 }}
        >
          {user.subtitle || user.bio || "Thành viên ChatApp"}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
          {(user.mutualFriendsCount ?? 0) > 0 && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: v.brand[50],
                color: v.brand[600],
                px: 1,
                py: 0.25,
                borderRadius: "8px",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              <Users size={12} aria-hidden />
              <span>{user.mutualFriendsCount} bạn chung</span>
            </Box>
          )}

          {user.distanceKm !== undefined && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                bgcolor: v.tone("ecfdf5"),
                color: v.tone("059669"),
                px: 1,
                py: 0.25,
                borderRadius: "8px",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              <MapPin size={12} aria-hidden />
              <span>
                {user.distanceKm < 1
                  ? `${Math.round(user.distanceKm * 1000)}m`
                  : `${user.distanceKm.toFixed(1)} km`}
              </span>
            </Box>
          )}

          {(user.mutualFriendsCount ?? 0) === 0 &&
            user.distanceKm === undefined &&
            (user.friendsCount ?? 0) >= 5 && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: v.neutral[100],
                  color: v.neutral[600],
                  px: 1,
                  py: 0.25,
                  borderRadius: "8px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={12} aria-hidden />
                <span>Tài khoản uy tín</span>
              </Box>
            )}
        </Box>
      </Box>

      <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75 }}>
        {user.relationStatus === "none" && (
          <Button
            size="small"
            variant="contained"
            onClick={() => onSendRequest(user.id)}
            startIcon={<UserPlus size={15} aria-hidden />}
            sx={{ borderRadius: "10px", px: 1.5, py: 0.75, whiteSpace: "nowrap" }}
          >
            Kết bạn
          </Button>
        )}

        {user.relationStatus === "pending_sent" && (
          <Tooltip title="Hủy lời mời đã gửi">
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => onCancelRequest(user.requestId)}
              startIcon={<Clock size={15} aria-hidden />}
              sx={{
                borderRadius: "10px",
                px: 1.25,
                py: 0.75,
                color: "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              Đã gửi
            </Button>
          </Tooltip>
        )}

        {user.relationStatus === "pending_received" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => user.requestId && onRespondRequest(user.requestId, "accept")}
              startIcon={<Check size={15} aria-hidden />}
              sx={{ borderRadius: "10px", px: 1.25, py: 0.65, whiteSpace: "nowrap" }}
            >
              Đồng ý
            </Button>
            <Tooltip title="Từ chối lời mời">
              <IconButton
                size="small"
                color="error"
                aria-label={`Từ chối lời mời của ${user.name}`}
                onClick={() => user.requestId && onRespondRequest(user.requestId, "reject")}
                sx={{ bgcolor: v.tone("fef2f2"), "&:hover": { bgcolor: v.tone("fee2e2") } }}
              >
                <X size={16} aria-hidden />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {user.relationStatus === "friends" && (
          <Button
            size="small"
            variant="outlined"
            color="primary"
            onClick={() => onMessage(user)}
            startIcon={<MessageSquare size={15} aria-hidden />}
            sx={{ borderRadius: "10px", px: 1.5, py: 0.75, whiteSpace: "nowrap" }}
          >
            Nhắn tin
          </Button>
        )}
      </Box>
    </Paper>
  );
}

