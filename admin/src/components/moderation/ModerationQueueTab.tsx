"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Pagination,
  Alert,
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
} from "@mui/material";
import {
  CheckCircle2,
  EyeOff,
  AlertTriangle,
  ShieldAlert,
  Inbox,
  Filter,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { adminApi, ModerationQueueItem } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";
import { mediaUrl } from "@/services/postsApi";

export default function ModerationQueueTab() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("flagged");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal cảnh cáo
  const [warnDialogItem, setWarnDialogItem] = useState<ModerationQueueItem | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [resolving, setResolving] = useState(false);

  const { isEnglish: isEn } = useTranslation();

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getModerationQueue({
        page,
        limit: 10,
        status: status !== "all" ? status : undefined,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // lỗi tải hàng đợi
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleResolve = async (
    id: string,
    action: "approve" | "hide" | "warn",
    reason?: string,
  ) => {
    try {
      setResolving(true);
      await adminApi.resolveModerationQueueItem(id, action, reason);
      const actionMsg =
        action === "approve"
          ? isEn ? "Content marked as safe and approved" : "Đã duyệt nội dung an toàn"
          : action === "hide"
          ? isEn ? "Violating content removed" : "Đã gỡ bỏ nội dung vi phạm"
          : isEn ? "User warned and content handled" : "Đã gửi cảnh cáo và xử lý nội dung";
      setFeedback(actionMsg);
      setWarnDialogItem(null);
      setWarnReason("");
      fetchQueue();
    } catch {
      // lỗi xử lý
    } finally {
      setResolving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Thanh công cụ lọc trạng thái */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {isEn ? "Pending Moderation Items" : "Nội dung cần xem xét"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEn
              ? `Found ${total} item(s) flagged by AI safety engine`
              : `Có ${total} nội dung bị bộ máy AI gắn cờ vi phạm hoặc cảnh báo`}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>{isEn ? "Filter Status" : "Trạng thái"}</InputLabel>
          <Select
            value={status}
            label={isEn ? "Filter Status" : "Trạng thái"}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            startAdornment={<Filter size={16} style={{ marginRight: 8, opacity: 0.6 }} />}
          >
            <MenuItem value="flagged">{isEn ? "Flagged / Pending" : "Đang chờ duyệt"}</MenuItem>
            <MenuItem value="rejected">{isEn ? "Rejected / Hidden" : "Đã gỡ bỏ"}</MenuItem>
            <MenuItem value="approved">{isEn ? "Approved / Safe" : "Đã phê duyệt"}</MenuItem>
            <MenuItem value="all">{isEn ? "All Items" : "Tất cả"}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Danh sách mục cần duyệt */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={36} />
        </Box>
      ) : items.length === 0 ? (
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", py: 6 }}>
          <EmptyState
            icon={<Inbox size={36} />}
            title={isEn ? "Moderation Queue is Clean" : "Hàng đợi kiểm duyệt trống"}
            description={
              isEn
                ? "No flagged posts or messages require attention right now."
                : "Không có bài viết hoặc nội dung nào đang bị cảnh báo vi phạm."
            }
          />
        </Card>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => {
            const toxicPct = Math.round((item.toxicityScore || 0) * 100);
            return (
              <Card
                key={item._id}
                sx={{
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: item.moderationStatus === "flagged" ? "warning.main" : "divider",
                  bgcolor: item.moderationStatus === "flagged" ? "action.hover" : "background.paper",
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Header thẻ: Tác giả & Điểm rủi ro AI */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <PresenceAvatar
                        src={item.authorId?.avatar}
                        name={item.authorId?.name || "Người dùng"}
                        size={40}
                      />
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.authorId?.name || (isEn ? "Unknown user" : "Người dùng")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.authorId?.email} • {new Date(item.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.isSensitive && (
                        <Chip
                          icon={<ShieldAlert size={14} />}
                          label={isEn ? "Sensitive Media" : "Ảnh nhạy cảm"}
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={`${isEn ? "AI Risk" : "Rủi ro AI"}: ${toxicPct}%`}
                        size="small"
                        color={toxicPct > 70 ? "error" : toxicPct > 30 ? "warning" : "success"}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                  </Box>

                  {/* Lý do AI cảnh báo */}
                  {item.moderationReason && (
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0.5, borderRadius: "8px" }} icon={<AlertTriangle size={18} />}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {isEn ? "Detected violation:" : "Phát hiện vi phạm:"} {item.moderationReason}
                      </Typography>
                    </Alert>
                  )}

                  {/* Nội dung bài viết */}
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 1.5, wordBreak: "break-word" }}>
                    {item.content || <Typography variant="caption" color="text.secondary">{isEn ? "(No text content)" : "(Không có nội dung văn bản)"}</Typography>}
                  </Typography>

                  {/* Hình ảnh đính kèm (nếu có) */}
                  {item.images && item.images.length > 0 && (
                    <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                      {item.images.map((img, idx) => (
                        <Box
                          key={idx}
                          component="img"
                          src={mediaUrl(img)}
                          alt="Nội dung kiểm duyệt"
                          sx={{
                            width: 100,
                            height: 100,
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Thanh nút thao tác xử lý */}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<CheckCircle2 size={16} />}
                      onClick={() => handleResolve(item._id, "approve")}
                      disabled={resolving || item.moderationStatus === "approved"}
                      sx={{ borderRadius: "8px" }}
                    >
                      {isEn ? "Approve (Safe)" : "Duyệt an toàn"}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<AlertTriangle size={16} />}
                      onClick={() => setWarnDialogItem(item)}
                      disabled={resolving}
                      sx={{ borderRadius: "8px" }}
                    >
                      {isEn ? "Warn Author" : "Cảnh cáo"}
                    </Button>

                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<EyeOff size={16} />}
                      onClick={() => handleResolve(item._id, "hide")}
                      disabled={resolving || item.moderationStatus === "rejected"}
                      sx={{ borderRadius: "8px" }}
                    >
                      {isEn ? "Remove Content" : "Gỡ bỏ"}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      {/* Dialog cảnh cáo người dùng */}
      <Dialog open={Boolean(warnDialogItem)} onClose={() => setWarnDialogItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEn ? "Warn User & Remove Content" : "Cảnh cáo người dùng & Gỡ nội dung"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {isEn
              ? `A warning notification will be recorded for ${warnDialogItem?.authorId?.name || "this user"} and this post will be removed.`
              : `Một cảnh báo chính thức sẽ được gửi đến ${warnDialogItem?.authorId?.name || "người dùng này"} và bài viết sẽ bị gỡ bỏ.`}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={isEn ? "Violation reason" : "Lý do vi phạm"}
            placeholder={isEn ? "e.g. Hate speech or harassment" : "VD: Vi phạm ngôn từ thù ghét"}
            value={warnReason}
            onChange={(e) => setWarnReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWarnDialogItem(null)} disabled={resolving} sx={{ borderRadius: "8px" }}>
            {isEn ? "Cancel" : "Hủy bỏ"}
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => warnDialogItem && handleResolve(warnDialogItem._id, "warn", warnReason)}
            disabled={resolving}
            sx={{ borderRadius: "8px" }}
          >
            {resolving ? <CircularProgress size={18} color="inherit" /> : isEn ? "Send Warning" : "Gửi cảnh cáo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Thông báo phản hồi */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={3500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setFeedback(null)} sx={{ borderRadius: "10px" }}>
          {feedback}
        </Alert>
      </Snackbar>
    </Box>
  );
}

