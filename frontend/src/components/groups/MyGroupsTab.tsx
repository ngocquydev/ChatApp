"use client";

import { useMemo, useState } from "react";
import NextLink from "next/link";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Compass, Globe, Lock, Search, Settings, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";
import { useAuthStore } from "@/store/useAuthStore";
import EmptyState from "@/components/common/EmptyState";

interface MyGroupsTabProps {
  myGroups: CommunityGroupItem[];
  onDiscoverClick: () => void;
  onCreateGroup: () => void;
}

export default function MyGroupsTab({
  myGroups,
  onDiscoverClick,
  onCreateGroup,
}: MyGroupsTabProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string | undefined;
  const [filterText, setFilterText] = useState("");

  const filtered = useMemo(() => {
    if (!filterText.trim()) return myGroups;
    const q = filterText.toLowerCase();
    return myGroups.filter((g) => g.name.toLowerCase().includes(q) || (g.description || "").toLowerCase().includes(q));
  }, [myGroups, filterText]);

  if (myGroups.length === 0) {
    return (
      <EmptyState
        icon={<Users size={52} />}
        title={t("groups.noGroupsFound")}
        description={t("groups.feedEmptyDesc")}
        action={
          <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<Compass size={18} />}
              onClick={onDiscoverClick}
              sx={{ borderRadius: "12px", fontWeight: 700 }}
            >
              {t("groups.discoverTab")}
            </Button>
            <Button
              variant="outlined"
              onClick={onCreateGroup}
              sx={{ borderRadius: "12px", fontWeight: 700 }}
            >
              {t("groups.createGroup")}
            </Button>
          </Box>
        }
      />
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t("groups.yourGroups")} ({filtered.length})
        </Typography>

        <TextField
          size="small"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={t("groups.searchPlaceholder")}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="var(--mui-palette-text-secondary)" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            minWidth: { xs: "100%", sm: 260 },
            "& .MuiOutlinedInput-root": {
              borderRadius: "14px",
              bgcolor: "background.paper",
            },
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {filtered.map((group) => {
          const creator = typeof group.creatorId === "object" ? group.creatorId?._id : group.creatorId;
          const isAdmin = creator === currentUserId || (group.adminIds || []).includes(currentUserId || "");

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group._id}>
              <Card
                sx={{
                  borderRadius: "16px",
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  height: "100%",
                  transition: "transform 0.15s ease",
                  "&:hover": { transform: "translateY(-2px)" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    src={group.avatar || undefined}
                    sx={{ width: 48, height: 48, borderRadius: "12px", bgcolor: "primary.main", fontWeight: 800 }}
                  >
                    {group.name.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      component={NextLink}
                      href={`/groups/${group.slug}`}
                      variant="subtitle2"
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

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        icon={group.privacy === "public" ? <Globe size={10} /> : <Lock size={10} />}
                        label={group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
                        sx={{ height: 18, fontSize: "0.65rem", borderRadius: "6px" }}
                      />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ whiteSpace: "nowrap" }}>
                        • {t("groups.membersCount", { count: group.memberCount || 1 })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mt: "auto", pt: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    component={NextLink}
                    href={`/groups/${group.slug}`}
                    sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none" }}
                  >
                    {t("groups.viewGroup")}
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<Settings size={14} />}
                      component={NextLink}
                      href={`/groups/${group.slug}/manage`}
                      sx={{ borderRadius: "10px", fontWeight: 700, textTransform: "none", flexShrink: 0 }}
                    >
                      {t("groups.manageGroup")}
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

