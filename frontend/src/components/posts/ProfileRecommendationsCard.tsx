"use client";

import { useEffect } from "react";
import NextLink from "next/link";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Link,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Clock, Sparkles, UserPlus, Users } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useTranslation } from "@/i18n/useTranslation";
import { useFriendStore } from "@/store/useFriendStore";
import { v } from "@/theme/tokens";

interface ProfileRecommendationsCardProps {
  cardSx: Record<string, unknown>;
}

export default function ProfileRecommendationsCard({ cardSx }: ProfileRecommendationsCardProps) {
  const { tr } = useTranslation();
  const {
    recommendations,
    isLoadingRecommendations,
    fetchRecommendations,
    sendFriendRequest,
    cancelRequest,
  } = useFriendStore();

  useEffect(() => {
    if (recommendations.length === 0 && !isLoadingRecommendations) {
      void fetchRecommendations();
    }
  }, [recommendations.length, isLoadingRecommendations, fetchRecommendations]);

  const displayList = recommendations.slice(0, 4);

  return (
    <Paper elevation={0} component="section" aria-labelledby="profile-recommendations-title" sx={cardSx}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ color: "primary.main", display: "flex" }} aria-hidden>
            <Sparkles size={18} />
          </Box>
          <Typography id="profile-recommendations-title" variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: "1rem" }}>
            {tr("Gợi ý kết bạn", "People you may know")}
          </Typography>
        </Box>
        <Link
          component={NextLink}
          href="/explore"
          variant="caption"
          underline="hover"
          sx={{ fontWeight: 600, color: "primary.main" }}
        >
          {tr("Xem tất cả", "See all")}
        </Link>
      </Box>

      {isLoadingRecommendations && displayList.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }} aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={12} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : displayList.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {tr("Không có gợi ý mới lúc này.", "No new suggestions right now.")}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {displayList.map((rec) => {
            const hasMutual = rec.mutualFriendsCount > 0;
            return (
              <Box
                key={rec._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.25,
                }}
              >
                <Box
                  component={NextLink}
                  href={`/profile/${rec._id}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    minWidth: 0,
                    flex: 1,
                    textDecoration: "none",
                    color: "inherit",
                    "&:hover .rec-name": { color: "primary.main" },
                  }}
                >
                  <PresenceAvatar name={rec.name} src={rec.avatar} size={40} hidePresence />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      className="rec-name"
                      variant="body2"
                      noWrap
                      sx={{ fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.3 }}
                    >
                      {rec.name}
                    </Typography>
                    {hasMutual ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                        <Users size={12} aria-hidden />
                        <Typography variant="caption" noWrap sx={{ fontSize: "0.72rem" }}>
                          {tr(`${rec.mutualFriendsCount} bạn chung`, `${rec.mutualFriendsCount} mutual friends`)}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.72rem" }}>
                        {rec.recommendationReason || tr("Gợi ý cho bạn", "Suggested for you")}
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box sx={{ flexShrink: 0 }}>
                  {rec.relationStatus === "none" && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => void sendFriendRequest(rec._id)}
                      startIcon={<UserPlus size={14} aria-hidden />}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        px: 1.2,
                        py: 0.4,
                        borderRadius: "8px",
                      }}
                    >
                      {tr("Kết bạn", "Add")}
                    </Button>
                  )}

                  {rec.relationStatus === "pending_sent" && (
                    <Tooltip title={tr("Hủy lời mời kết bạn", "Cancel friend request")}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void cancelRequest(rec.requestId || "")}
                        startIcon={<Clock size={14} aria-hidden />}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          px: 1,
                          py: 0.4,
                          borderRadius: "8px",
                          color: "text.secondary",
                          borderColor: "divider",
                        }}
                      >
                        {tr("Đã gửi", "Sent")}
                      </Button>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
}
