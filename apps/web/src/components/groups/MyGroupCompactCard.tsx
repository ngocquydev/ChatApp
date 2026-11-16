"use client";

import { Avatar, Box, Card, Typography } from "@mui/material";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface MyGroupCompactCardProps {
  group: CommunityGroupItem;
}

export default function MyGroupCompactCard({ group }: MyGroupCompactCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      component={Link}
      href={`/groups/${group.slug}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "16px",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
        },
      }}
    >
      <Avatar
        src={group.avatar || undefined}
        sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}
      >
        {group.name.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {group.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("groups.membersCount", { count: group.memberCount })}
        </Typography>
      </Box>
    </Card>
  );
}

