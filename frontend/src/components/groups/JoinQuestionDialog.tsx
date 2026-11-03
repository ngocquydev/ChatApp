"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { HelpCircle, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface JoinQuestionDialogProps {
  open: boolean;
  question?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export default function JoinQuestionDialog({
  open,
  question,
  isSubmitting = false,
  onClose,
  onSubmit,
}: JoinQuestionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const displayQuestion = question?.trim() || t("groups.joinQuestionPlaceholder");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("groups.joinReasonPlaceholder"));
      return;
    }
    setError(null);
    try {
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Có lỗi xảy ra, vui lòng thử lại";
      setError(msg);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <HelpCircle size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {t("groups.joinModalTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("groups.joinModalDesc")}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "20px !important",
            px: 3,
            pb: 2,
          }}
        >
          {error && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: "error.main",
                color: "error.contrastText",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {error}
            </Box>
          )}

          <Box
            sx={{
              p: 2,
              borderRadius: "14px",
              bgcolor: "var(--mui-palette-neutral-100)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: "uppercase" }}>
              {t("groups.joinQuestionInputLabel")}
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5, color: "text.primary" }}>
              {displayQuestion}
            </Typography>
          </Box>

          <TextField
            label={t("groups.requestAnswerLabel")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            rows={4}
            required
            fullWidth
            placeholder={t("groups.joinReasonPlaceholder")}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!reason.trim() || isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting ? t("common.loading") : t("groups.submitJoinRequest")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

