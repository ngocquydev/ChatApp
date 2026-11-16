"use client";

import { useState, useSyncExternalStore } from "react";
import type { MouseEvent } from "react";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n/types";

interface LanguageToggleProps {
  sx?: SxProps<Theme>;
  size?: "small" | "medium";
}

const subscribe = () => () => {};

/**
 * Bộ chọn đa ngôn ngữ:
 * - 🇻🇳 Tiếng Việt
 * - 🇺🇸 English
 * - 🇨🇳 简体中文 (Trung Quốc)
 * - 🇹🇼 繁體中文 (Đài Loan)
 * - 🇰🇷 한국어 (Hàn Quốc)
 * - 🇹🇭 ไทย (Thái Lan)
 */
export default function LanguageToggle({ sx, size = "medium" }: LanguageToggleProps) {
  const { language, setLanguage, t } = useTranslation();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleOpen = (e: MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (lang: SupportedLanguage) => {
    setLanguage(lang);
    handleClose();
  };

  const currentOption = SUPPORTED_LANGUAGES.find((opt) => opt.code === language) || SUPPORTED_LANGUAGES[0];
  const currentBadge = mounted ? currentOption.shortLabel : "VI";
  const currentFlag = mounted ? currentOption.flag : "🇻🇳";
  const tooltipTitle = mounted ? `${t("common.selectLanguage")}: ${currentOption.label}` : "Chọn ngôn ngữ";

  return (
    <>
      <Tooltip title={tooltipTitle}>
        <span>
          <Button
            id="language-select-button"
            aria-controls={open ? "language-select-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            aria-label={tooltipTitle}
            disabled={!mounted}
            onClick={handleOpen}
            size={size === "small" ? "small" : "medium"}
            color="inherit"
            startIcon={<Globe size={18} aria-hidden />}
            endIcon={<ChevronDown size={14} aria-hidden />}
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
              gap: 0.5,
              ...sx,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: "0.875rem",
                lineHeight: 1,
                mr: 0.25,
              }}
              aria-hidden
            >
              {currentFlag}
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {currentBadge}
            </Typography>
          </Button>
        </span>
      </Tooltip>

      <Menu
        id="language-select-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        disableScrollLock
        autoFocus={false}
        slotProps={{
          list: {
            "aria-labelledby": "language-select-button",
            role: "menu",
            dense: size === "small",
            sx: { py: 0.5, minWidth: 220 },
          },
          paper: {
            sx: {
              mt: 1,
              borderRadius: "12px",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            },
          },
        }}
      >
        {SUPPORTED_LANGUAGES.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <MenuItem
              key={opt.code}
              selected={isSelected}
              onClick={() => handleSelect(opt.code)}
              sx={{
                py: 1,
                px: 1.5,
                gap: 1.25,
                borderRadius: "6px",
                mx: 0.5,
                my: 0.25,
                "&.Mui-selected": {
                  bgcolor: "action.selected",
                  fontWeight: 600,
                },
              }}
            >
              <Typography component="span" sx={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden>
                {opt.flag}
              </Typography>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "primary.main" : "text.primary",
                    }}
                  >
                    {opt.label}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{ color: "text.secondary", display: "block" }}
                  >
                    {opt.region}
                  </Typography>
                }
              />
              {isSelected && (
                <ListItemIcon sx={{ minWidth: "auto", color: "primary.main", ml: "auto" }}>
                  <Check size={16} aria-hidden />
                </ListItemIcon>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
