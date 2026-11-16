"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { Flag, Shield, Globe } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { reportComment, type CommentView } from "@/services/postsApi";

interface ReportCommentDialogProps {
  open: boolean;
  comment: CommentView | null;
  groupId?: string | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError?: (msg: string) => void;
}

export default function ReportCommentDialog({
  open,
  comment,
  groupId,
  onClose,
  onSuccess,
  onError,
}: ReportCommentDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<"group_admin" | "web_admin">("group_admin");
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment) return;
    setSubmitting(true);
    try {
      const res = await reportComment(comment._id, {
        target: groupId ? target : "web_admin",
        reason,
        details: details.trim() || undefined,
      });
      onSuccess(res.message || t("reports.reportSuccess"));
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Đã xảy ra lỗi khi gửi báo cáo";
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setDetails("");
    setReason("spam");
    setTarget("group_admin");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <Flag size={20} color="var(--mui-palette-error-main)" />
        {t("reports.reportComment")}
      </DialogTitle>

      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t("reports.reportCommentDesc")}
        </Typography>

        {comment && (
          <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: "12px" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              {comment.author.name}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", wordBreak: "break-word" }}>
              &ldquo;{comment.content || (comment.mediaUrl ? "[Ảnh/Video]" : "")}&rdquo;
            </Typography>
          </Box>
        )}

        {/* Lựa chọn gửi báo cáo cho Quản trị viên nhóm hay Admin Web (chỉ khi bài viết nằm trong nhóm) */}
        {Boolean(groupId) && (
          <FormControl component="fieldset">
            <FormLabel sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 1, color: "text.primary" }}>
              {t("reports.chooseDestination")}
            </FormLabel>
            <RadioGroup
              value={target}
              onChange={(e) => setTarget(e.target.value as "group_admin" | "web_admin")}
              sx={{ display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: target === "group_admin" ? "primary.main" : "divider",
                  borderRadius: "12px",
                  p: 1.5,
                  bgcolor: target === "group_admin" ? "action.selected" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setTarget("group_admin")}
              >
                <FormControlLabel
                  value="group_admin"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Shield size={16} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t("reports.reportToGroupAdmin")}
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 4 }}>
                  {t("reports.reportToGroupAdminDesc")}
                </Typography>
              </Box>

              <Box
                sx={{
                  border: "1px solid",
                  borderColor: target === "web_admin" ? "primary.main" : "divider",
                  borderRadius: "12px",
                  p: 1.5,
                  bgcolor: target === "web_admin" ? "action.selected" : "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setTarget("web_admin")}
              >
                <FormControlLabel
                  value="web_admin"
                  control={<Radio size="small" />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Globe size={16} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t("reports.reportToWebAdmin")}
                      </Typography>
                    </Box>
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 4 }}>
                  {t("reports.reportToWebAdminDesc")}
                </Typography>
              </Box>
            </RadioGroup>
          </FormControl>
        )}

        {/* Lựa chọn lý do báo cáo */}
        <FormControl component="fieldset">
          <FormLabel sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 1, color: "text.primary" }}>
            {t("reports.reasonTitle")}
          </FormLabel>
          <RadioGroup
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
          >
            {[
              { id: "spam", label: t("reports.reasonSpam") },
              { id: "harassment", label: t("reports.reasonHarassment") },
              { id: "hate_speech", label: t("reports.reasonHateSpeech") },
              { id: "inappropriate", label: t("reports.reasonInappropriate") },
              { id: "other", label: t("reports.reasonOther") },
            ].map((r) => (
              <FormControlLabel
                key={r.id}
                value={r.id}
                control={<Radio size="small" />}
                label={<Typography variant="body2">{r.label}</Typography>}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {/* Chi tiết bổ sung */}
        <TextField
          multiline
          minRows={2}
          maxRows={4}
          placeholder={t("reports.detailsPlaceholder")}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          size="small"
          slotProps={{
            htmlInput: {
              maxLength: 1000,
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={handleClose} disabled={submitting} sx={{ borderRadius: "10px" }}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Flag size={16} />}
          sx={{ borderRadius: "10px", fontWeight: 700, px: 2.5 }}
        >
          {submitting ? t("reports.sendingReport") : t("reports.sendReport")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
