"use client";

import { Box, Card, Tab, Tabs } from "@mui/material";
import { FileText, Image as ImageIcon, Info, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface GroupNavTabsProps {
  currentTab: number;
  onChange: (tabIndex: number) => void;
  memberCount?: number;
}

export default function GroupNavTabs({ currentTab, onChange, memberCount }: GroupNavTabsProps) {
  const { t } = useTranslation();
  const membersLabel = typeof memberCount === "number" && memberCount > 0
    ? `${t("groups.tabMembers")} (${memberCount})`
    : t("groups.tabMembers");

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        mb: 2.5,
        position: "sticky",
        top: { xs: 56, sm: 64 },
        zIndex: 10,
      }}
    >
      <Tabs
        value={currentTab}
        onChange={(_, val) => onChange(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 48,
          px: 1,
          "& .MuiTab-root": {
            minHeight: 48,
            fontWeight: 700,
            fontSize: "0.9rem",
            textTransform: "none",
            gap: 1,
            borderRadius: "10px",
            my: 0.5,
          },
        }}
      >
        <Tab icon={<FileText size={18} />} iconPosition="start" label={t("groups.tabPosts")} />
        <Tab icon={<Info size={18} />} iconPosition="start" label={t("groups.tabAbout")} />
        <Tab icon={<Users size={18} />} iconPosition="start" label={membersLabel} />
        <Tab icon={<ImageIcon size={18} />} iconPosition="start" label={t("groups.tabMedia")} />
      </Tabs>
    </Card>
  );
}

