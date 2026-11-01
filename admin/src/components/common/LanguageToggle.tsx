"use client";

import { useSyncExternalStore } from "react";
import { Button, Tooltip, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Globe } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface LanguageToggleProps {
  sx?: SxProps<Theme>;
  size?: "small" | "medium";
}

const subscribe = () => () => {};

/**
 * Nút chuyển đổi ngôn ngữ song ngữ Tiếng Việt (VI) ↔ English (EN).
 * Lưu lựa chọn vào localStorage.
 */
export default function LanguageToggle({ sx, size = "medium" }: LanguageToggleProps) {
  const { toggleLanguage, isVietnamese } = useTranslation();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const label = isVietnamese ? "Chuyển sang Tiếng Anh (English)" : "Switch to Vietnamese (Tiếng Việt)";
  const currentText = mounted ? (isVietnamese ? "VI" : "EN") : "VI";

  return (
    <Tooltip title={label}>
      <span>
        <Button
          size={size === "small" ? "small" : "medium"}
          color="inherit"
          aria-label={label}
          disabled={!mounted}
          onClick={toggleLanguage}
          startIcon={<Globe size={18} aria-hidden />}
          sx={{
            minWidth: 0,
            px: 1.25,
            py: 0.5,
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "0.8125rem",
            textTransform: "none",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            ...sx,
          }}
        >
          <Typography component="span" sx={{ fontSize: "0.8125rem", fontWeight: 700, lineHeight: 1 }}>
            {currentText}
          </Typography>
        </Button>
      </span>
    </Tooltip>
  );
}

