"use client";

import { Avatar, Box, Button, Card, CardContent, Typography } from "@mui/material";
import { Globe, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupCardProps {
  group: CommunityGroupItem;
}

export default function GroupCard({ group }: GroupCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={group.avatar || undefined}
            sx={{
              width: 52,
              height: 52,
              bgcolor: "primary.main",
              fontWeight: 700,
              fontSize: "1.25rem",
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
              {group.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {group.privacy === "public" ? (
                <Globe size={13} color="var(--mui-palette-text-secondary)" />
              ) : (
                <Lock size={13} color="var(--mui-palette-text-secondary)" />
              )}
              <Typography variant="caption" color="text.secondary">
                {group.privacy === "public"
                  ? t("groups.publicGroup")
                  : t("groups.privateGroup")}
              </Typography>
            </Box>
          </Box>
        </Box>

        {group.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              fontSize: "0.85rem",
            }}
          >
            {group.description}
          </Typography>
        )}

        <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("groups.membersCount", { count: group.memberCount })}
          </Typography>

          <Button
            component={Link}
            href={`/groups/${group.slug}`}
            variant="outlined"
            size="small"
            sx={{ borderRadius: "10px", fontWeight: 700 }}
          >
            {t("groups.viewGroup")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

