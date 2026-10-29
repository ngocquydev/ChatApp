"use client";

import { useSyncExternalStore } from "react";
import { IconButton, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useColorScheme } from "@mui/material/styles";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ColorModeToggleProps {
  sx?: SxProps<Theme>;
  size?: "small" | "medium";
}

const subscribe = () => () => {};

/**
 * Chuyển giao diện sáng ↔ tối. Lựa chọn được MUI lưu vào localStorage;
 * lần đầu theo cài đặt hệ điều hành (defaultMode="system").
 */
export default function ColorModeToggle({ sx, size = "medium" }: ColorModeToggleProps) {
  const { mode, systemMode, setMode } = useColorScheme();
  const { tr } = useTranslation();
  // false khi SSR/hydrate, true sau đó → tránh lệch markup vì server không biết mode thật
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const resolved = mode === "system" ? systemMode : mode;
  const isDark = mounted && resolved === "dark";
  const label = isDark
    ? tr("Chuyển sang giao diện sáng", "Switch to light mode")
    : tr("Chuyển sang giao diện tối", "Switch to dark mode");

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size={size}
          color="inherit"
          aria-label={label}
          aria-pressed={isDark}
          disabled={!mounted}
          onClick={() => setMode(isDark ? "light" : "dark")}
          sx={sx}
        >
          {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
        </IconButton>
      </span>
    </Tooltip>
  );
}
