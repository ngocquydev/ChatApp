"use client";

import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";

export default function NotFound() {
  const { tr } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "var(--mui-palette-neutral-50)",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontWeight: 800,
          color: "var(--mui-palette-brand-600)",
          fontSize: { xs: "3.5rem", md: "5rem" },
        }}
      >
        404
      </Typography>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: "var(--mui-palette-neutral-900)",
        }}
      >
        {tr("Trang không tồn tại", "Page Not Found")}
      </Typography>
      <Typography variant="body1" sx={{ color: "var(--mui-palette-neutral-500)", maxWidth: 460 }}>
        {tr(
          "Địa chỉ bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang đường dẫn khác.",
          "The page you are looking for does not exist or has been moved to another URL."
        )}
      </Typography>
      <Link href="/" style={{ textDecoration: "none" }}>
        <Button
          variant="contained"
          sx={{
            mt: 2,
            borderRadius: "10px",
            px: 3,
            py: 1.2,
            bgcolor: "var(--mui-palette-brand-600)",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {tr("Về trang chủ", "Back to Home")}
        </Button>
      </Link>
    </Box>
  );
}
