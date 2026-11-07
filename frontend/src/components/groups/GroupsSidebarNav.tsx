"use client";

import NextLink from "next/link";
import {
  Box,
  Button,
  ButtonBase,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  Compass,
  Newspaper,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";
import { useAuthStore } from "@/store/useAuthStore";
import GroupNavRow from "./GroupNavRow";

interface GroupsSidebarNavProps {
  activeTab: "feed" | "discover" | "my-groups";
  onTabChange: (tab: "feed" | "discover" | "my-groups") => void;
  myGroups: CommunityGroupItem[];
  onCreateGroup: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function GroupsSidebarNav({
  activeTab,
  onTabChange,
  myGroups,
  onCreateGroup,
  searchQuery,
  onSearchChange,
}: GroupsSidebarNavProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string | undefined;

  const managedGroups = myGroups.filter((g) => {
    const creator = typeof g.creatorId === "object" ? g.creatorId?._id : g.creatorId;
    return creator === currentUserId || (g.adminIds || []).includes(currentUserId || "");
  });

  const joinedGroups = myGroups.filter((g) => !managedGroups.some((mg) => mg._id === g._id));

  const navItems = [
    { id: "feed" as const, label: t("groups.feedTab"), icon: Newspaper },
    { id: "discover" as const, label: t("groups.discoverTab"), icon: Compass },
    { id: "my-groups" as const, label: t("groups.myGroupsTab"), icon: Users },
  ];

  return (
    <Box
      component="aside"
      aria-label={t("groups.title")}
      sx={{
        width: { md: "320px", lg: "360px" },
        height: "calc(100dvh - 64px)",
        position: "fixed",
        top: "64px",
        left: 0,
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        zIndex: 10,
        overflowY: "auto",
        px: 2,
        py: 2.5,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <ButtonBase
          component={NextLink}
          href="/"
          aria-label="Về trang chủ"
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={18} />
        </ButtonBase>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
          {t("groups.title")}
        </Typography>
      </Box>

      {/* Search Input */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              bgcolor: "action.hover",
              fieldset: { border: "none" },
            },
          }}
        />
      </Box>

      {/* Primary Nav Menu */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <ButtonBase
              key={item.id}
              onClick={() => onTabChange(item.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.25,
                borderRadius: "12px",
                textAlign: "left",
                justifyContent: "flex-start",
                bgcolor: isActive ? "action.selected" : "transparent",
                color: isActive ? "primary.main" : "text.primary",
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s ease",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: isActive ? "primary.main" : "action.hover",
                  color: isActive ? "primary.contrastText" : "text.primary",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: "inherit" }}>
                {item.label}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Create Group Button */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<Plus size={18} />}
        onClick={onCreateGroup}
        sx={{
          borderRadius: "12px",
          py: 1.2,
          fontWeight: 700,
          mb: 2.5,
          textTransform: "none",
        }}
      >
        {t("groups.createGroup")}
      </Button>

      <Divider sx={{ mb: 2 }} />

      {/* Managed Groups Section */}
      {managedGroups.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", px: 1, textTransform: "uppercase" }}>
            {t("groups.managedGroupsSection")}
          </Typography>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {managedGroups.map((g) => (
              <GroupNavRow key={g._id} group={g} />
            ))}
          </Box>
        </Box>
      )}

      {/* Joined Groups Section */}
      {joinedGroups.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", px: 1, textTransform: "uppercase" }}>
            {t("groups.joinedGroupsSection")}
          </Typography>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {joinedGroups.map((g) => (
              <GroupNavRow key={g._id} group={g} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
