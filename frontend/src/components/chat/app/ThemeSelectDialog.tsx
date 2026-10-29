"use client";

import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
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
      maxWidth="sm"
      fullWidth
      aria-labelledby="theme-select-dialog-title"
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
        id="theme-select-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          pt: 1.5,
          px: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Palette size={20} color="var(--mui-palette-primary-main)" aria-hidden />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            Chủ đề cuộc trò chuyện
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Đóng bảng chọn chủ đề">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>
          Chọn hình nền và bảng màu bong bóng tin nhắn cho cả hai người trong cuộc trò chuyện.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 1.5,
          }}
        >
          {themesList.map((theme) => {
            const isSelected = (currentTheme || "default") === theme.id;

            return (
              <ButtonBase
                key={theme.id}
                component="button"
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  void onSelectTheme(theme.id);
                  onClose();
                }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                  p: 1.25,
                  borderRadius: "16px",
                  border: "2px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  bgcolor: isSelected ? "action.selected" : "background.paper",
                  textAlign: "left",
                  transition: "border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease",
                  "&:hover": {
                    bgcolor: isSelected ? "action.selected" : "action.hover",
                    borderColor: isSelected ? "primary.main" : "neutral.400",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                {/* Mini Chat Preview */}
                <Box
                  aria-hidden
                  sx={{
                    height: 68,
                    borderRadius: "12px",
                    background: theme.background,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 1,
                    mb: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {/* Partner mini bubble */}
                  <Box
                    sx={{
                      alignSelf: "flex-start",
                      width: "54%",
                      height: 18,
                      borderRadius: "10px 10px 10px 3px",
                      background: theme.bubblePartner,
                      border: "1px solid",
                      borderColor: theme.partnerBorder,
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: "70%",
                        height: 5,
                        borderRadius: 999,
                        bgcolor: theme.bubblePartnerColor,
                        opacity: 0.45,
                      }}
                    />
                  </Box>

                  {/* My mini bubble */}
                  <Box
                    sx={{
                      alignSelf: "flex-end",
                      width: "62%",
                      height: 20,
                      borderRadius: "10px 10px 3px 10px",
                      background: theme.bubbleMe,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      px: 1,
                    }}
                  >
                    <Box
                      sx={{
                        width: "75%",
                        height: 5,
                        borderRadius: 999,
                        bgcolor: theme.bubbleMeColor,
                        opacity: 0.85,
                      }}
                    />
                  </Box>
                </Box>

                {/* Label & Checkmark */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 0.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {theme.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: "0.75rem" }}>
                      {theme.description}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: isSelected ? "primary.main" : "transparent",
                      border: isSelected ? "none" : "1.5px solid",
                      borderColor: "divider",
                      color: "primary.contrastText",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </Box>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
