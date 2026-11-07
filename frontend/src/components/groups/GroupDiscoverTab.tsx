"use client";

import { useState } from "react";
import {
  Box,
  Chip,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { LayoutGrid, List, Sparkles, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import GroupCoverCard from "./GroupCoverCard";
import GroupListItem from "./GroupListItem";

interface GroupDiscoverTabProps {
  groups: CommunityGroupItem[];
  isLoading: boolean;
  onJoinGroup: (group: CommunityGroupItem) => void;
  joiningGroupId?: string | null;
}

export default function GroupDiscoverTab({
  groups,
  isLoading,
  onJoinGroup,
  joiningGroupId,
}: GroupDiscoverTabProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const categories = [
    { id: "all", label: t("groups.catAll") },
    { id: "tech", label: t("groups.catTech") },
    { id: "lifestyle", label: t("groups.catLifestyle") },
    { id: "entertainment", label: t("groups.catEntertainment") },
    { id: "education", label: t("groups.catEducation") },
    { id: "gaming", label: t("groups.catGaming") },
    { id: "sports", label: t("groups.catSports") },
  ];

  // Client-side category filtering
  const filteredGroups = selectedCategory === "all"
    ? groups
    : groups.filter((g) => {
        const cat = ((g as unknown as { category?: string }).category || "").toLowerCase();
        const text = `${g.name} ${g.description}`.toLowerCase();
        return cat === selectedCategory || text.includes(selectedCategory);
      });

  return (
    <Box>
      {/* Category Pills & View Switcher Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        {/* Horizontal Category Chips */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            overflowX: "auto",
            py: 0.5,
            maxWidth: { xs: "100%", sm: "calc(100% - 100px)" },
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Chip
                key={cat.id}
                label={cat.label}
                clickable
                onClick={() => setSelectedCategory(cat.id)}
                color={isSelected ? "primary" : "default"}
                variant={isSelected ? "filled" : "outlined"}
                sx={{
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: "20px",
                  px: 0.5,
                  fontSize: "0.85rem",
                }}
              />
            );
          })}
        </Box>

        {/* View Mode Toggle (Grid / List) */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "action.hover",
            borderRadius: "10px",
            p: 0.5,
          }}
        >
          <Tooltip title={t("groups.viewGrid")}>
            <IconButton
              size="small"
              onClick={() => setViewMode("grid")}
              sx={{
                borderRadius: "8px",
                bgcolor: viewMode === "grid" ? "background.paper" : "transparent",
                color: viewMode === "grid" ? "primary.main" : "text.secondary",
                boxShadow: viewMode === "grid" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <LayoutGrid size={17} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("groups.viewList")}>
            <IconButton
              size="small"
              onClick={() => setViewMode("list")}
              sx={{
                borderRadius: "8px",
                bgcolor: viewMode === "list" ? "background.paper" : "transparent",
                color: viewMode === "list" ? "primary.main" : "text.secondary",
                boxShadow: viewMode === "list" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <List size={17} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Group Cards Grid / List */}
      {isLoading ? (
        viewMode === "grid" ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rounded" height={280} sx={{ borderRadius: "16px" }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack spacing={1.5}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={76} sx={{ borderRadius: "14px" }} />
            ))}
          </Stack>
        )
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title={t("groups.noGroupsFound")}
          description={t("groups.noGroupsDesc")}
        />
      ) : viewMode === "grid" ? (
        <Grid container spacing={2.5}>
          {filteredGroups.map((g) => (
            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 4 }} key={g._id}>
              <GroupCoverCard
                group={g}
                onJoin={(e) => {
                  e.preventDefault();
                  onJoinGroup(g);
                }}
                isActionPending={joiningGroupId === g._id}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Stack spacing={1.5}>
          {filteredGroups.map((g) => (
            <GroupListItem
              key={g._id}
              group={g}
              onJoin={(e) => {
                e.preventDefault();
                onJoinGroup(g);
              }}
              isActionPending={joiningGroupId === g._id}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

