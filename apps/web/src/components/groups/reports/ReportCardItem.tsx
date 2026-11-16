"use client";

import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Typography,
} from "@mui/material";
import {
  Ban,
  CheckCircle,
  MessageSquare,
  Trash2,
  UserX,
  VolumeX,
  XCircle,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { GroupCommentReportItem } from "@/services/communityGroupsApi";

interface ReportCardItemProps {
  report: GroupCommentReportItem;
  onOpenAction: (
    report: GroupCommentReportItem,
    type: "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user"
  ) => void;
  getReasonLabel: (reason: string) => string;
}

export default function ReportCardItem({ report, onOpenAction, getReasonLabel }: ReportCardItemProps) {
  const { t } = useTranslation();

  const getStatusChip = (status: string) => {
    switch (status) {
      case "pending":
        return <Chip size="small" label={t("reports.statusPending")} color="warning" sx={{ fontWeight: 600 }} />;
      case "resolved":
        return <Chip size="small" icon={<CheckCircle size={14} />} label={t("reports.statusResolved")} color="success" sx={{ fontWeight: 600 }} />;
      case "dismissed":
        return <Chip size="small" icon={<XCircle size={14} />} label={t("reports.statusDismissed")} color="default" sx={{ fontWeight: 600 }} />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          {getStatusChip(report.status)}
          <Chip
            size="small"
            label={report.target === "group_admin" ? t("reports.targetGroupAdmin") : t("reports.targetWebAdmin")}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip size="small" label={getReasonLabel(report.reason)} variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar src={report.reporterId?.avatar || undefined} sx={{ width: 36, height: 36 }}>
          {(report.reporterId?.name || "U").charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary" noWrap>
            {t("reports.reportedBy")}: {report.reporterId?.name || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tác giả bình luận: {report.commentAuthorId?.name || "Member"}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover", borderLeft: "4px solid", borderColor: "primary.main" }}>
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

      {report.details && (
        <Typography variant="body2" color="text.secondary">
          <strong>Chi tiết:</strong> {report.details}
        </Typography>
      )}

      {report.status !== "pending" && (
        <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            <strong>Hành động đã thực hiện:</strong> {report.actionTaken}
            {report.resolutionNote && ` — Ghi chú: ${report.resolutionNote}`}
          </Typography>
        </Box>
      )}

      {report.status === "pending" && (
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Button size="small" variant="outlined" color="inherit" onClick={() => onOpenAction(report, "dismiss")} startIcon={<CheckCircle size={16} />}>
            {t("reports.dismiss")}
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => onOpenAction(report, "delete_comment")} startIcon={<Trash2 size={16} />}>
            Xóa bình luận
          </Button>
          <Button size="small" variant="outlined" color="warning" onClick={() => onOpenAction(report, "mute_user")} startIcon={<VolumeX size={16} />}>
            Khóa bình luận
          </Button>
          <Button size="small" variant="outlined" color="warning" onClick={() => onOpenAction(report, "banned_posting")} startIcon={<Ban size={16} />}>
            Cấm đăng bài
          </Button>
          <Button size="small" variant="outlined" color="error" onClick={() => onOpenAction(report, "banned_user")} startIcon={<UserX size={16} />}>
            Xóa khỏi nhóm
          </Button>
        </Box>
      )}
    </Card>
  );
}

