"use client";

import { Box, CircularProgress, Paper, Typography } from "@mui/material";
import BrandLogo from "@/components/common/BrandLogo";
import { useTranslation } from "@/i18n/useTranslation";

export default function SessionLoadingScreen({ redirecting = false }: { redirecting?: boolean }) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 320,
          px: 4,
          py: 5,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          gap: 2,
          textAlign: "center",
        }}
      >
        <BrandLogo href="" size={64} />
        <Typography variant="h6" component="p" sx={{ fontWeight: 700 }}>ChatApp</Typography>
        <CircularProgress size={24} aria-hidden="true" />
        <Typography role="status" aria-live="polite" variant="body2" color="text.secondary">
          {redirecting ? t("auth.redirectingToLogin") : t("auth.checkingSession")}
        </Typography>
      </Paper>
    </Box>
  );
}
