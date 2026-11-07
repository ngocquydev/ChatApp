"use client";

import NextLink from "next/link";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Typography,
} from "@mui/material";
import { Check, Clock, Globe, Lock, Plus, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupCoverCardProps {
  group: CommunityGroupItem;
  onJoin?: (e: React.MouseEvent) => void;
  isActionPending?: boolean;
}

export default function GroupCoverCard({
  group,
  onJoin,
  isActionPending,
}: GroupCoverCardProps) {
  const { t } = useTranslation();
  const isMember = !!group.isMember;
  const isPending = !!group.isPending;

  return (
    <Card
      sx={{
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 10px 24px var(--mui-palette-action-hover)",
        },
      }}
    >
      <CardActionArea
        component={NextLink}
        href={`/groups/${group.slug}`}
        sx={{ display: "flex", flexDirection: "column", alignItems: "stretch", flex: 1 }}
      >
        {/* Cover Photo 16:9 Banner */}
        <Box
          sx={{
            width: "100%",
            aspectRatio: "16 / 9",
            bgcolor: "primary.main",
            backgroundImage: group.coverImage
              ? `url(${group.coverImage})`
              : "linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-tone-fx-4f46e5) 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {/* Privacy badge top right */}
          <Chip
            size="small"
            icon={
              group.privacy === "public" ? (
                <Globe size={12} color="var(--mui-palette-text-secondary)" />
              ) : (
                <Lock size={12} color="var(--mui-palette-text-secondary)" />
              )
            }
            label={group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              bgcolor: "background.paper",
              fontWeight: 700,
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          />

          {/* Group Avatar overlapping bottom left */}
          <Avatar
            src={group.avatar || undefined}
            sx={{
              position: "absolute",
              bottom: -18,
              left: 16,
              width: 54,
              height: 54,
              borderRadius: "14px",
              border: "3px solid",
              borderColor: "background.paper",
              bgcolor: "primary.main",
              fontWeight: 800,
              fontSize: "1.25rem",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {/* Content area */}
        <Box sx={{ pt: 3, px: 2, pb: 1.5, flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography
            variant="h6"
            component="h2"
            noWrap
            sx={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.01em", mb: 0.5 }}
          >
            {group.name}
          </Typography>

          {/* Member count */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5, color: "text.secondary" }}>
            <Users size={16} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t("groups.membersCount", { count: group.memberCount || 1 })}
            </Typography>
          </Box>

          {/* Description snippet */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              lineHeight: 1.45,
              flex: 1,
            }}
          >
            {group.description || t("groups.aboutGroup")}
          </Typography>
        </Box>
      </CardActionArea>

      {/* Action Footer */}
      <Box sx={{ px: 2, pb: 2, pt: 0 }}>
        {isMember ? (
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<Check size={16} />}
            component={NextLink}
            href={`/groups/${group.slug}`}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.joined")}
          </Button>
        ) : isPending ? (
          <Button
            fullWidth
            variant="outlined"
            size="small"
            disabled
            startIcon={<Clock size={16} />}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.requested")}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={onJoin}
            disabled={isActionPending}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.joinGroup")}
          </Button>
        )}
      </Box>
    </Card>
  );
}

