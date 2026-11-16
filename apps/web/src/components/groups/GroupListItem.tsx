"use client";

import NextLink from "next/link";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Typography,
} from "@mui/material";
import { Check, Clock, Globe, Lock, Plus, Settings, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuthStore } from "@/store/useAuthStore";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupListItemProps {
  group: CommunityGroupItem;
  onJoin?: (e: React.MouseEvent) => void;
  isActionPending?: boolean;
}

export default function GroupListItem({
  group,
  onJoin,
  isActionPending,
}: GroupListItemProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string | undefined;

  const creatorId = typeof group.creatorId === "object" ? group.creatorId?._id : group.creatorId;
  const isAdmin =
    Boolean(group.isAdmin) ||
    Boolean(
      currentUserId &&
        (creatorId === currentUserId ||
          (group.adminIds || []).some((a) => (typeof a === "object" ? a._id : a) === currentUserId))
    );
  const isMember = isAdmin || Boolean(group.isMember);
  const isPending = !isMember && Boolean(group.isPending);

  return (
    <Card
      sx={{
        borderRadius: "14px",
        p: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        gap: 2,
        transition: "background-color 0.15s ease",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
      {/* Thumbnail */}
      <Avatar
        src={group.avatar || group.coverImage || undefined}
        component={NextLink}
        href={`/groups/${group.slug}`}
        sx={{
          width: 58,
          height: 58,
          borderRadius: "12px",
          bgcolor: "primary.main",
          fontWeight: 800,
          fontSize: "1.4rem",
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        {group.name.charAt(0).toUpperCase()}
      </Avatar>

      {/* Information */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
          <Typography
            component={NextLink}
            href={`/groups/${group.slug}`}
            variant="subtitle1"
            noWrap
            sx={{
              fontWeight: 800,
              color: "text.primary",
              textDecoration: "none",
              "&:hover": { color: "primary.main", textDecoration: "underline" },
            }}
          >
            {group.name}
          </Typography>

          <Chip
            size="small"
            icon={
              group.privacy === "public" ? (
                <Globe size={11} color="var(--mui-palette-text-secondary)" />
              ) : (
                <Lock size={11} color="var(--mui-palette-text-secondary)" />
              )
            }
            label={group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
            sx={{ height: 20, fontSize: "0.7rem", borderRadius: "6px", fontWeight: 600 }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Users size={12} />
            {t("groups.membersCount", { count: group.memberCount || 1 })}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ fontSize: "0.85rem", maxWidth: "90%" }}
        >
          {group.description || t("groups.aboutGroup")}
        </Typography>
      </Box>

      {/* Action Button */}
      <Box sx={{ flexShrink: 0 }}>
        {isAdmin ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Settings size={15} />}
            component={NextLink}
            href={`/groups/${group.slug}/manage`}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.manageGroup")}
          </Button>
        ) : isMember ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Check size={15} />}
            component={NextLink}
            href={`/groups/${group.slug}`}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.viewGroup")}
          </Button>
        ) : isPending ? (
          <Button
            variant="outlined"
            size="small"
            disabled
            startIcon={<Clock size={15} />}
            sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
          >
            {t("groups.requested")}
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
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

