"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { GroupCommentReportItem } from "@/services/communityGroupsApi";

interface ReportActionDialogProps {
  open: boolean;
  selectedReport: GroupCommentReportItem | null;
  actionType: "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user" | null;
  resolutionNote: string;
  isSubmitting: boolean;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  getActionTitle: (type: string | null) => string;
}

export default function ReportActionDialog({
  open,
  selectedReport,
  actionType,
  resolutionNote,
  isSubmitting,
  onNoteChange,
  onClose,
  onConfirm,
  getActionTitle,
}: ReportActionDialogProps) {
  const { t } = useTranslation();

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
          sx: { borderRadius: "16px", bgcolor: "background.paper", border: "1px solid", borderColor: "divider" },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AlertTriangle size={20} color="var(--mui-palette-warning-main)" />
        {getActionTitle(actionType)}
      </DialogTitle>

      <DialogContent sx={{ pt: "16px !important" }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Bạn đang xử lý báo cáo bình luận của <strong>{selectedReport?.commentAuthorId?.name || "thành viên"}</strong>.
        </Typography>

        <TextField
          label={t("reports.resolutionNote")}
          value={resolutionNote}
          onChange={(e) => onNoteChange(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="Nhập lý do hoặc phản hồi cho quyết định xử lý này..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          color={actionType === "dismiss" ? "primary" : "error"}
          onClick={onConfirm}
          disabled={isSubmitting}
          sx={{ borderRadius: "10px", fontWeight: 700 }}
        >
          {isSubmitting ? t("common.loading") : t("reports.confirmAction")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

