"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { Flag } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  GroupCommentReportItem,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import ReportCardItem from "./reports/ReportCardItem";
import ReportActionDialog from "./reports/ReportActionDialog";

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
    try {
      setIsSubmitting(true);
      await communityGroupsApi.resolveCommentReport(groupId, selectedReport._id, {
        action: actionType,
        note: resolutionNote.trim() || undefined,
      });
      setActionSuccessMessage(t("reports.actionSuccess"));
      handleCloseActionDialog();
      await fetchReports();
    } catch (err: unknown) {
      console.error("Lỗi xử lý báo cáo:", err);
      setError(t("reports.actionError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "spam": return t("reports.reasonSpam");
      case "harassment": return t("reports.reasonHarassment");
      case "hate_speech": return t("reports.reasonHateSpeech");
      case "inappropriate": return t("reports.reasonInappropriate");
      default: return t("reports.reasonOther");
    }
  };

  const getActionTitle = (type: string | null) => {
    switch (type) {
      case "dismiss": return t("reports.actionDismissTitle");
      case "delete_comment": return "Xóa bình luận vi phạm";
      case "mute_user": return "Khóa quyền bình luận thành viên";
      case "banned_posting": return "Khóa quyền đăng bài thành viên";
      case "banned_user": return "Xóa thành viên khỏi hội nhóm";
      default: return "Xử lý báo cáo";
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Filter Bar */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Báo cáo bình luận ({reports.length})
        </Typography>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="report-filter-label">{t("reports.filterByStatus")}</InputLabel>
          <Select
            labelId="report-filter-label"
            value={filterStatus}
            label={t("reports.filterByStatus")}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">{t("reports.statusAll")}</MenuItem>
            <MenuItem value="pending">{t("reports.statusPending")}</MenuItem>
            <MenuItem value="resolved">{t("reports.statusResolved")}</MenuItem>
            <MenuItem value="dismissed">{t("reports.statusDismissed")}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {actionSuccessMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionSuccessMessage(null)}>
          {actionSuccessMessage}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            <ReportCardItem
              key={report._id}
              report={report}
              onOpenAction={handleOpenActionDialog}
              getReasonLabel={getReasonLabel}
            />
          ))}
        </Stack>
      )}

      <ReportActionDialog
        open={Boolean(selectedReport && actionType)}
        selectedReport={selectedReport}
        actionType={actionType}
        resolutionNote={resolutionNote}
        isSubmitting={isSubmitting}
        onNoteChange={setResolutionNote}
        onClose={handleCloseActionDialog}
        onConfirm={handleConfirmAction}
        getActionTitle={getActionTitle}
      />
    </Box>
  );
}
