import { Box, Typography } from "@mui/material";
import ReportedCommentsTab from "./ReportedCommentsTab";
import { ADMIN_REPORTS_COPY } from "@/i18n/adminReports";
import { useTranslation } from "@/i18n/useTranslation";

export default function ReportsView() {
  const { tr } = useTranslation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {tr(ADMIN_REPORTS_COPY.title)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tr(ADMIN_REPORTS_COPY.description)}
        </Typography>
      </Box>
      <ReportedCommentsTab />
    </Box>
  );
}
