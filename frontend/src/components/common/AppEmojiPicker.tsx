"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress, useTheme } from "@mui/material";
import type { EmojiClickData } from "emoji-picker-react";
import { Theme as EmojiTheme } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 4 }}>
      <CircularProgress size={24} />
    </Box>
  ),
});

interface AppEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  width?: number | string;
  height?: number | string;
}

export default function AppEmojiPicker({
  onEmojiSelect,
  width = 320,
  height = 380,
}: AppEmojiPickerProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        width,
        height,
        "& .EmojiPickerReact": {
          border: "none",
          "--epr-bg-color": isDark ? "var(--mui-palette-background-paper)" : "var(--mui-palette-background-paper)",
          "--epr-category-label-bg-color": isDark ? "var(--mui-palette-background-paper)" : "var(--mui-palette-background-paper)",
        },
      }}
    >
      <EmojiPicker
        theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
        onEmojiClick={(data: EmojiClickData) => {
          if (data?.emoji) {
            onEmojiSelect(data.emoji);
          }
        }}
        width="100%"
        height="100%"
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        searchDisabled={false}
      />
    </Box>
  );
}

