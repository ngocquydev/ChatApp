"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
} from "@mui/material";
import {
  Ban,
  CheckCircle,
  Flag,
  MessageSquare,
  Trash2,
  UserX,
  VolumeX,
} from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { adminApi, AdminCommentReport } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";

export default function ReportedCommentsTab() {
  const [items, setItems] = useState<AdminCommentReport[]>([]);
  const [status, setStatus] = useState("all");
  const [target, setTarget] = useState("all");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Dialog action state
  const [selectedReport, setSelectedReport] = useState<AdminCommentReport | null>(null);
  const [actionType, setActionType] = useState<
    "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user" | null
  >(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const { isEnglish: isEn } = useTranslation();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCommentReports({
        status: status === "all" ? undefined : status,
        target: target === "all" ? undefined : (target as "web_admin" | "group_admin"),
      });
      setItems(res || []);
    } catch {
      setFeedback(isEn ? "Failed to load comment reports" : "Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  }, [status, target, isEn]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleOpenAction = (
    report: AdminCommentReport,
    action: "dismiss" | "delete_comment" | "mute_user" | "banned_posting" | "banned_user",
  ) => {
    setSelectedReport(report);
    setActionType(action);
    setResolutionNote("");
  };

  const handleConfirmAction = async () => {
    if (!selectedReport || !actionType) return;
    try {
      setResolving(true);
      await adminApi.resolveCommentReport(selectedReport._id, {
        action: actionType,
        note: resolutionNote.trim() || undefined,
      });

      setFeedback(isEn ? "Report resolved successfully" : "Đã xử lý báo cáo thành công");
      setSelectedReport(null);
      setActionType(null);
      void fetchReports();
    } catch {
      setFeedback(isEn ? "Failed to resolve report" : "Lỗi khi xử lý báo cáo");
    } finally {
      setResolving(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "spam":
        return isEn ? "Spam" : "Spam / Quảng cáo";
      case "harassment":
        return isEn ? "Harassment" : "Quấy rối / Công kích";
      case "hate_speech":
        return isEn ? "Hate Speech" : "Ngôn từ thù ghét";
      case "violence":
      case "inappropriate":
        return isEn ? "Inappropriate Content" : "Nội dung phản cảm";
      default:
        return isEn ? "Other" : "Lý do khác";
    }
  };

  const getStatusChip = (s: string) => {
    switch (s) {
      case "pending":
        return (
          <Chip
            size="small"
            label={isEn ? "Pending" : "Chờ xử lý"}
            color="warning"
            sx={{ fontWeight: 600 }}
          />
        );
      case "resolved":
        return (
          <Chip
            size="small"
            label={isEn ? "Resolved" : "Đã xử lý"}
            color="success"
            sx={{ fontWeight: 600 }}
          />
        );
      case "dismissed":
        return (
          <Chip
            size="small"
            label={isEn ? "Dismissed" : "Đã bỏ qua"}
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
        return isEn ? "Dismiss Report" : "Bỏ qua báo cáo";
      case "delete_comment":
        return isEn ? "Delete Comment" : "Xóa bình luận vi phạm";
      case "mute_user":
        return isEn ? "Mute User" : "Khóa quyền bình luận";
      case "banned_posting":
        return isEn ? "Block Posting" : "Chặn đăng bài viết";
      case "banned_user":
        return isEn ? "Remove User / Ban" : "Khóa / Đuổi khỏi hội nhóm";
      default:
        return "";
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Bộ lọc */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{isEn ? "Status" : "Trạng thái"}</InputLabel>
          <Select
            value={status}
            label={isEn ? "Status" : "Trạng thái"}
            onChange={(e) => setStatus(e.target.value)}
          >
            <MenuItem value="all">{isEn ? "All" : "Tất cả trạng thái"}</MenuItem>
            <MenuItem value="pending">{isEn ? "Pending" : "Chờ xử lý"}</MenuItem>
            <MenuItem value="resolved">{isEn ? "Resolved" : "Đã xử lý"}</MenuItem>
            <MenuItem value="dismissed">{isEn ? "Dismissed" : "Đã bỏ qua"}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{isEn ? "Destination" : "Nơi tiếp nhận"}</InputLabel>
          <Select
            value={target}
            label={isEn ? "Destination" : "Nơi tiếp nhận"}
            onChange={(e) => setTarget(e.target.value)}
          >
            <MenuItem value="all">{isEn ? "All" : "Tất cả điểm đến"}</MenuItem>
            <MenuItem value="web_admin">{isEn ? "Web Admin" : "Admin Web"}</MenuItem>
            <MenuItem value="group_admin">{isEn ? "Group Admin" : "BQT Nhóm"}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Danh sách */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Flag size={28} />}
          title={isEn ? "No comment reports" : "Không có báo cáo bình luận nào"}
          description={
            isEn
              ? "All reported comments have been reviewed and resolved."
              : "Tất cả các bình luận bị báo cáo đã được kiểm duyệt và xử lý sạch sẽ."
          }
        />
      ) : (
        <Stack spacing={2}>
          {items.map((report) => (
            <Card key={report._id} variant="outlined" sx={{ borderRadius: "16px", p: 2.5 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {/* Badges */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {getStatusChip(report.status)}
                  <Chip
                    size="small"
                    label={
                      report.target === "group_admin"
                        ? (isEn ? "To Group Admin" : "Gửi BQT Nhóm")
                        : (isEn ? "To Web Admin" : "Gửi Admin Web")
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
                  {report.groupId && (
                    <Chip
                      size="small"
                      label={isEn ? "Community Group" : "Trong hội nhóm"}
                      color="secondary"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>

                {/* Reporter & Author */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    src={report.reporterId?.avatar}
                    alt={report.reporterId?.name || "Reporter"}
                    sx={{ width: 32, height: 32 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary">
                      {isEn ? "Reporter" : "Người báo cáo"}: {report.reporterId?.name || "User"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isEn ? "Comment author" : "Tác giả bình luận"}:{" "}
                      {report.commentAuthorId?.name || "Member"}{" "}
                      {report.commentAuthorId?.email && `(${report.commentAuthorId.email})`}
                    </Typography>
                  </Box>
                </Box>

                {/* Quoted comment */}
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
                      {isEn ? "Reported comment content:" : "Nội dung bình luận bị báo cáo:"}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.primary" sx={{ fontStyle: "italic" }}>
                    &ldquo;{report.commentContent}&rdquo;
                  </Typography>
                </Box>

                {/* Details */}
                {report.details && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>{isEn ? "Details:" : "Chi tiết:"}</strong> {report.details}
                  </Typography>
                )}

                {/* Resolved info */}
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
                    <Typography variant="caption" color="text.secondary">
                      <strong>{isEn ? "Action taken:" : "Hành động đã thực hiện:"}</strong>{" "}
                      {report.actionTaken}
                      {report.resolutionNote &&
                        ` — ${isEn ? "Note:" : "Ghi chú:"} ${report.resolutionNote}`}
                      {report.resolvedBy &&
                        ` (${isEn ? "By" : "Bởi"}: ${report.resolvedBy.name})`}
                    </Typography>
                  </Box>
                )}

                {/* Actions */}
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
                      onClick={() => handleOpenAction(report, "dismiss")}
                      startIcon={<CheckCircle size={16} />}
                    >
                      {isEn ? "Dismiss" : "Bỏ qua"}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleOpenAction(report, "delete_comment")}
                      startIcon={<Trash2 size={16} />}
                    >
                      {isEn ? "Delete Comment" : "Xóa bình luận"}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleOpenAction(report, "mute_user")}
                      startIcon={<VolumeX size={16} />}
                    >
                      {isEn ? "Mute User" : "Khóa bình luận"}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleOpenAction(report, "banned_posting")}
                      startIcon={<Ban size={16} />}
                    >
                      {isEn ? "Block Posting" : "Chặn đăng bài"}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleOpenAction(report, "banned_user")}
                      startIcon={<UserX size={16} />}
                    >
                      {isEn ? "Ban / Remove User" : "Xóa / Khóa tài khoản"}
                    </Button>
                  </Box>
                )}
              </Box>
            </Card>
          ))}
        </Stack>
      )}

      {/* Dialog xác nhận */}
      <Dialog
        open={Boolean(selectedReport && actionType)}
        onClose={() => {
          setSelectedReport(null);
          setActionType(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{getActionTitle()}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isEn
              ? "Are you sure you want to execute this moderation action on the reported comment/author?"
              : "Bạn có chắc chắn muốn thực hiện hành động này đối với bình luận hoặc người dùng bị báo cáo?"}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={isEn ? "Resolution note (optional)" : "Ghi chú xử lý (tùy chọn)"}
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedReport(null);
              setActionType(null);
            }}
            color="inherit"
            disabled={resolving}
          >
            {isEn ? "Cancel" : "Hủy"}
          </Button>
          <Button
            onClick={() => void handleConfirmAction()}
            variant="contained"
            color={actionType === "dismiss" ? "primary" : "error"}
            disabled={resolving}
          >
            {resolving
              ? (isEn ? "Processing..." : "Đang xử lý...")
              : (isEn ? "Confirm" : "Xác nhận")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        message={feedback}
      />
    </Box>
  );
}
