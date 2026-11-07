"use client";

import { Box, Card, Typography } from "@mui/material";
import { Clock, Flag, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ManageOverviewMetricsProps {
  memberCount: number;
  pendingCount: number;
  deputiesCount: number;
  reportsCount: number;
}

export default function ManageOverviewMetrics({
  memberCount,
  pendingCount,
  deputiesCount,
  reportsCount,
}: ManageOverviewMetricsProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr 1fr",
          sm: "repeat(4, 1fr)",
        },
        gap: 2,
        mb: 3,
      }}
    >
      <Card variant="outlined" sx={{ borderRadius: "12px", p: 2, bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Users size={20} color="var(--mui-palette-primary-main)" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("groups.totalMembers")}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {memberCount}
        </Typography>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: "12px", p: 2, bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Clock size={20} color="var(--mui-palette-warning-main)" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("groups.pendingRequests")}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {pendingCount}
        </Typography>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: "12px", p: 2, bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <ShieldCheck size={20} color="var(--mui-palette-info-main)" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("groups.deputiesCount")}
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {deputiesCount}
        </Typography>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: "12px", p: 2, bgcolor: "background.paper" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Flag size={20} color="var(--mui-palette-error-main)" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Báo cáo vi phạm
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {reportsCount}
        </Typography>
      </Card>
    </Box>
  );
}

