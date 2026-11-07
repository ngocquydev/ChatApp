"use client";

import NextLink from "next/link";
import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
import { Globe, Lock } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupNavRowProps {
  group: CommunityGroupItem;
}

export default function GroupNavRow({ group }: GroupNavRowProps) {
  const { t } = useTranslation();

  return (
    <ButtonBase
      component={NextLink}
      href={`/groups/${group.slug}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderRadius: "10px",
        justifyContent: "flex-start",
        textAlign: "left",
        width: "100%",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Avatar
        src={group.avatar || undefined}
        sx={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          bgcolor: "primary.main",
          fontWeight: 700,
          fontSize: "0.95rem",
        }}
      >
        {group.name.charAt(0).toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {group.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          {group.privacy === "public" ? <Globe size={11} /> : <Lock size={11} />}
          {t("groups.membersCount", { count: group.memberCount || 1 })}
        </Typography>
      </Box>
    </ButtonBase>
  );
}

