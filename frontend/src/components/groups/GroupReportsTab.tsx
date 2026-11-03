"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Flag,
  MessageSquare,
  Shield,
  Trash2,
  UserX,
  VolumeX,
  XCircle,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  GroupCommentReportItem,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import { formatRelativeTime } from "@/utils/formatTime";

interface GroupReportsTabProps {
  groupId: string;
  onReportCountChange?: (count: number) => void;
}

export default function GroupReportsTab({
  groupId,
  onReportCountChange,
}: GroupReportsTabProps) {
  const { t } = useTranslation();
  const [reports, setReports] = useState<GroupCommentReportItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog action state
  const [selectedReport, setSelectedReport] = useState<GroupCommentReportItem | null>(null);
  const [actionType, setActionType] = useState<
    "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user" | null
  >(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statusParam = filterStatus === "all" ? undefined : filterStatus;
      const data = await communityGroupsApi.getCommentReports(groupId, statusParam);
      setReports(data || []);
      if (onReportCountChange) {
        const pending = (data || []).filter((r) => r.status === "pending").length;
        onReportCountChange(pending);
      }
    } catch (e: unknown) {
      console.error("Lỗi lấy danh sách báo cáo bình luận:", e);
      setError(t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [groupId, filterStatus, onReportCountChange, t]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleOpenActionDialog = (
    report: GroupCommentReportItem,
    type: "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user"
  ) => {
    setSelectedReport(report);
    setActionType(type);
    setResolutionNote("");
  };

  const handleCloseActionDialog = () => {
    setSelectedReport(null);
    setActionType(null);
    setResolutionNote("");
  };

  const handleConfirmAction = async () => {
    if (!selectedReport || !actionType) return;
    setIsSubmitting(true);
    try {
      await communityGroupsApi.resolveCommentReport(groupId, selectedReport._id, {
        action: actionType,
        note: resolutionNote.trim() || undefined,
      });

      // Update local state
      setReports((prev) =>
        prev.map((r) =>
          r._id === selectedReport._id
            ? {
                ...r,
                status: actionType === "dismiss" ? "dismissed" : "resolved",
                actionTaken: actionType,
                resolutionNote: resolutionNote.trim() || undefined,
              }
            : r
        )
      );

      handleCloseActionDialog();
      setActionSuccessMessage(t("reports.reportSuccess"));
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (e: unknown) {
      console.error("Lỗi xử lý báo cáo bình luận:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "spam":
        return t("reports.reasonSpam");
      case "harassment":
        return t("reports.reasonHarassment");
      case "hate_speech":
        return t("reports.reasonHateSpeech");
      case "violence":
      case "inappropriate":
        return t("reports.reasonInappropriate");
      default:
        return t("reports.reasonOther");
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Chip
            size="small"
            label={t("reports.statusPending")}
            color="warning"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      case "resolved":
        return (
          <Chip
            size="small"
            label={t("reports.statusResolved")}
            color="success"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
        );
      case "dismissed":
        return (
          <Chip
            size="small"
            label={t("reports.statusDismissed")}
            color="default"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        );
      default:
        return null;
    }
  };

  const getActionTitle = () => {
    switch (actionType) {
      case "dismiss":
        return t("reports.dismiss");
      case "delete_comment":
        return t("reports.deleteComment");
      case "mute_user":
        return t("reports.muteUser");
      case "banned_posting":
        return t("reports.blockPosting");
      case "banned_user":
        return t("reports.removeMember");
      default:
        return "";
    }
  };

  return (
    <Box>
      {/* Header & Filter Controls */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }} color="text.primary">
            {t("reports.tabReports")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("reports.reportCommentDesc")}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("common.all")}</InputLabel>
          <Select
            value={filterStatus}
            label={t("common.all")}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">{t("common.all")}</MenuItem>
            <MenuItem value="pending">{t("reports.statusPending")}</MenuItem>
            <MenuItem value="resolved">{t("reports.statusResolved")}</MenuItem>
            <MenuItem value="dismissed">{t("reports.statusDismissed")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {actionSuccessMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {actionSuccessMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<Flag size={28} />}
          title={t("reports.noReports")}
          description={t("reports.noReportsDesc")}
        />
      ) : (
        <Stack spacing={2}>
          {reports.map((report) => (
            <Card
              key={report._id}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* Row 1: Badges & Time */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {getStatusChip(report.status)}
                  <Chip
                    size="small"
                    label={
                      report.target === "group_admin"
                        ? t("reports.targetGroupAdmin")
                        : t("reports.targetWebAdmin")
                    }
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Chip
                    size="small"
                    label={getReasonLabel(report.reason)}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>

              {/* Row 2: Reporter & Author Info */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  src={report.reporterId?.avatar}
                  alt={report.reporterId?.name || "Reporter"}
                  sx={{ width: 36, height: 36 }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary">
                    {t("reports.reportedBy")}: {report.reporterId?.name || "User"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tác giả bình luận: {report.commentAuthorId?.name || "Member"}
                  </Typography>
                </Box>
              </Box>

              {/* Row 3: Reported Comment Quote */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "12px",
                  bgcolor: "action.hover",
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <MessageSquare size={16} color="var(--mui-palette-primary-main)" />
                  <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">
                    Nội dung bình luận bị báo cáo:
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.primary" sx={{ fontStyle: "italic" }}>
                  &ldquo;{report.commentContent}&rdquo;
                </Typography>
              </Box>

              {/* Row 4: Reporter Note/Details */}
              {report.details && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Chi tiết:</strong> {report.details}
                </Typography>
              )}

              {/* Row 5: Resolved information if already processed */}
              {report.status !== "pending" && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    <strong>Hành động đã thực hiện:</strong> {report.actionTaken}
                    {report.resolutionNote && ` — Ghi chú: ${report.resolutionNote}`}
                  </Typography>
                </Box>
              )}

              {/* Row 6: Management Action Buttons (for pending reports) */}
              {report.status === "pending" && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    pt: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleOpenActionDialog(report, "dismiss")}
                    startIcon={<CheckCircle size={16} />}
                  >
                    {t("reports.dismiss")}
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleOpenActionDialog(report, "delete_comment")}
                    startIcon={<Trash2 size={16} />}
                  >
                    {t("reports.deleteComment")}
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => handleOpenActionDialog(report, "mute_user")}
                    startIcon={<VolumeX size={16} />}
                  >
                    {t("reports.muteUser")}
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => handleOpenActionDialog(report, "banned_posting")}
                    startIcon={<Ban size={16} />}
                  >
                    {t("reports.blockPosting")}
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleOpenActionDialog(report, "banned_user")}
                    startIcon={<UserX size={16} />}
                  >
                    {t("reports.removeMember")}
                  </Button>
                </Box>
              )}
            </Card>
          ))}
        </Stack>
      )}

      {/* Confirmation & Note Dialog */}
      <Dialog
        open={Boolean(selectedReport && actionType)}
        onClose={handleCloseActionDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{getActionTitle()}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bạn có chắc chắn muốn thực hiện hành động này đối với bình luận hoặc thành viên bị báo cáo?
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Ghi chú xử lý (tùy chọn)"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog} color="inherit" disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void handleConfirmAction()}
            variant="contained"
            color={actionType === "dismiss" ? "primary" : "error"}
            disabled={isSubmitting}
          >
            {isSubmitting ? t("common.loading") : t("common.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
