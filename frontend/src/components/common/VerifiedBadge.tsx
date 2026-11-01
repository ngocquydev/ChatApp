"use client";

import { Box, Tooltip } from "@mui/material";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface VerifiedBadgeProps {
  size?: number;
  title?: string;
}

export default function VerifiedBadge({ size = 16, title }: VerifiedBadgeProps) {
  const { tr } = useTranslation();
  const tooltipTitle = title || tr("Tài khoản chính thức đã xác thực", "Official verified account");

  return (
    <Tooltip title={tooltipTitle} arrow disableInteractive>
      <Box
        component="span"
        aria-label={tooltipTitle}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "primary.main",
          flexShrink: 0,
          verticalAlign: "middle",
        }}
      >
        <CheckCircle2
          size={size}
          fill="var(--mui-palette-primary-main)"
          color="var(--mui-palette-common-white)"
        />
      </Box>
    </Tooltip>
  );
}

