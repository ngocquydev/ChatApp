"use client";

import {
  Avatar,
  Box,
  Card,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Crown,
  MessageSquareOff,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { GroupMemberItem, GroupViewerPermissions } from "@/services/communityGroupsApi";

interface MemberRowProps {
  member: GroupMemberItem;
  viewerPermissions: GroupViewerPermissions;
  onOpenMenu: (e: React.MouseEvent<HTMLElement>, member: GroupMemberItem) => void;
}

export default function MemberRow({ member: m, viewerPermissions, onOpenMenu }: MemberRowProps) {
  const { t } = useTranslation();

  const canManageThisMember =
    m.role !== "creator" &&
    (viewerPermissions.isAdmin || (viewerPermissions.isDeputy && m.role === "member"));

  return (
    <Card
      sx={{
        p: 2,
        borderRadius: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Avatar src={m.avatar || undefined} sx={{ width: 44, height: 44, bgcolor: "primary.main", fontWeight: 700 }}>
          {m.name.charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
              {m.name}
            </Typography>

            {m.role === "creator" && (
              <Chip
                size="small"
                icon={<Crown size={12} />}
                label={t("groups.adminBadge")}
                color="primary"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
              />
            )}

            {m.role === "admin" && (
              <Chip
                size="small"
                icon={<Shield size={12} />}
                label={t("groups.adminBadge")}
                variant="outlined"
                color="primary"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
              />
            )}

            {m.role === "deputy" && (
              <Chip
                size="small"
                icon={<ShieldCheck size={12} />}
                label={t("groups.deputyBadge")}
                color="info"
                variant="outlined"
                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
              />
            )}

            {m.isMutedComments && (
              <Tooltip title={t("groups.mutedCommentsBanner")}>
                <Chip
                  size="small"
                  icon={<MessageSquareOff size={12} />}
                  label="Bị khóa bình luận"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600 }}
                />
              </Tooltip>
            )}

            {m.isBannedPosting && (
              <Tooltip title={t("groups.bannedPostingBanner")}>
                <Chip
                  size="small"
                  icon={<ShieldAlert size={12} />}
                  label="Bị chặn đăng bài"
                  color="error"
                  variant="outlined"
                  sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600 }}
                />
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {canManageThisMember && (
        <IconButton
          size="small"
          onClick={(e) => onOpenMenu(e, m)}
          aria-label={t("common.moreOptions")}
        >
          <MoreVertical size={18} />
        </IconButton>
      )}
    </Card>
  );
}
