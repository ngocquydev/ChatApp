"use client";

import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import { Check, Palette, X } from "lucide-react";
import { CHAT_THEMES } from "./chatThemes";

interface ThemeSelectDialogProps {
  open: boolean;
  currentTheme?: string;
  onSelectTheme: (themeId: string) => Promise<void> | void;
  onClose: () => void;
}

export default function ThemeSelectDialog({
  open,
  currentTheme = "default",
  onSelectTheme,
  onClose,
}: ThemeSelectDialogProps) {
  const themesList = Object.values(CHAT_THEMES);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            bgcolor: "background.paper",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          pt: 1.5,
          px: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Palette size={20} color="var(--mui-palette-primary-main)" />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            Chủ đề cuộc trò chuyện
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Đóng bảng chọn chủ đề">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 2, pt: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>
          Chọn hình nền và màu sắc hiển thị cho cuộc trò chuyện này.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {themesList.map((theme) => {
            const isSelected = (currentTheme || "default") === theme.id;

            return (
              <Box
                key={theme.id}
                component="button"
                type="button"
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  borderRadius: "14px",
                  border: "2px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  bgcolor: isSelected ? "action.selected" : "background.paper",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  fontFamily: "inherit",
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: isSelected ? "primary.main" : "neutral.400",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
                  {/* Theme Preview Dot / Ring */}
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: theme.bubbleMe,
                      border: "2px solid var(--mui-palette-common-white)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      flexShrink: 0,
                    }}
                  />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {theme.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                      {theme.description}
                    </Typography>
                  </Box>
                </Box>

                {isSelected && (
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
