"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Clock,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { backupApi, BackupFileInfo } from "@/services/backupApi";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface DatabaseBackupCardProps {
  isEn: boolean;
}

export function DatabaseBackupCard({ isEn }: DatabaseBackupCardProps) {
  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [nextScheduledAt, setNextScheduledAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dialog states
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      const data = await backupApi.getBackups();
      setBackups(data.backups);
      setNextScheduledAt(data.nextScheduledAt);
    } catch (err: unknown) {
      console.error("Fetch backups error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    setCreating(true);
    setStatusMessage(null);
    try {
      const newBackup = await backupApi.createBackup();
      setStatusMessage({
        type: "success",
        text: isEn
          ? `Backup created successfully: ${newBackup.filename} (${newBackup.sizeFormatted})`
          : `Đã tạo bản sao lưu thành công: ${newBackup.filename} (${newBackup.sizeFormatted})`,
      });
      await fetchBackups();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : isEn ? "Failed to create backup" : "Tạo bản sao lưu thất bại",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackup) return;
    setRestoring(true);
    setStatusMessage(null);
    try {
      const res = await backupApi.restoreBackup(selectedBackup);
      setStatusMessage({
        type: "success",
        text: res.message || (isEn ? "Database restored successfully!" : "Khôi phục cơ sở dữ liệu thành công!"),
      });
      setConfirmRestoreOpen(false);
      setSelectedBackup(null);
      await fetchBackups();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : isEn ? "Failed to restore backup" : "Khôi phục dữ liệu thất bại",
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBackup) return;
    setDeleting(true);
    setStatusMessage(null);
    try {
      await backupApi.deleteBackup(selectedBackup);
      setStatusMessage({
        type: "success",
        text: isEn ? `Deleted backup: ${selectedBackup}` : `Đã xóa bản sao lưu: ${selectedBackup}`,
      });
      setConfirmDeleteOpen(false);
      setSelectedBackup(null);
      await fetchBackups();
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : isEn ? "Failed to delete backup" : "Xóa bản sao lưu thất bại",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = (filename: string) => {
    const url = backupApi.getDownloadUrl(filename);
    window.open(url, "_blank");
  };

  const formatScheduledTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        background: "background.paper",
        boxShadow: "none",
        mt: 3,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                bgcolor: "action.hover",
                color: "var(--mui-palette-primary-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Database size={20} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {isEn ? "Database Backup & Disaster Recovery" : "Sao Lưu & Khôi Phục Cơ Sở Dữ Liệu"}
                </Typography>
                <Chip
                  icon={<ShieldCheck size={14} />}
                  label={isEn ? "Daily 17:00 Auto" : "Tự động 17h hàng ngày"}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <Clock size={12} />
                {isEn
                  ? `Next automated backup at: 17:00 (Asia/Ho_Chi_Minh) — ~${formatScheduledTime(nextScheduledAt)}`
                  : `Bản sao lưu tự động kế tiếp: 17:00 (Giờ VN) — dự kiến ${formatScheduledTime(nextScheduledAt)}`}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <PlusCircle size={18} />}
            disabled={creating}
            onClick={handleCreateBackup}
            sx={{
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              px: 2.5,
              py: 1,
            }}
          >
            {creating
              ? isEn
                ? "Creating Backup..."
                : "Đang tạo bản sao lưu..."
              : isEn
              ? "Create Backup Now"
              : "Sao lưu CSDL ngay"}
          </Button>
        </Box>

        {/* Status Alert */}
        {statusMessage && (
          <Alert
            severity={statusMessage.type}
            onClose={() => setStatusMessage(null)}
            sx={{ mb: 2, borderRadius: "10px" }}
          >
            {statusMessage.text}
          </Alert>
        )}

        {/* Backups List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : backups.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 5,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: "12px",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {isEn
                ? "No backup files available. Click 'Create Backup Now' or wait for the 17:00 automated schedule."
                : "Chưa có bản sao lưu nào. Hãy bấm 'Sao lưu CSDL ngay' hoặc chờ lịch tự động 17h hàng ngày."}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Filename" : "Tên tệp sao lưu"}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Trigger" : "Phân loại"}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Size" : "Dung lượng"}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isEn ? "Created At" : "Ngày giờ tạo"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{isEn ? "Actions" : "Thao tác"}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.filename} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 600 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CheckCircle2 size={16} color="var(--mui-palette-success-main)" />
                        {b.filename}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          b.trigger === "scheduled"
                            ? isEn
                              ? "Auto 17h"
                              : "Định kỳ 17h"
                            : isEn
                            ? "Manual"
                            : "Thủ công"
                        }
                        size="small"
                        color={b.trigger === "scheduled" ? "primary" : "default"}
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.7rem", fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{b.sizeFormatted}</TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
                      {new Date(b.createdAt).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={isEn ? "Download file" : "Tải về máy tính"}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownload(b.filename)}
                          aria-label={isEn ? "Download backup" : "Tải file sao lưu"}
                        >
                          <Download size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isEn ? "Restore this backup" : "Khôi phục dữ liệu từ bản này"}>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setSelectedBackup(b.filename);
                            setConfirmRestoreOpen(true);
                          }}
                          aria-label={isEn ? "Restore database" : "Khôi phục cơ sở dữ liệu"}
                        >
                          <RotateCcw size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isEn ? "Delete backup" : "Xóa bản sao lưu"}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setSelectedBackup(b.filename);
                            setConfirmDeleteOpen(true);
                          }}
                          aria-label={isEn ? "Delete backup" : "Xóa file sao lưu"}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        open={confirmRestoreOpen}
        title={isEn ? "Confirm Database Restore" : "Xác nhận Khôi phục Cơ sở Dữ liệu"}
        description={
          isEn
            ? `WARNING: Restoring from '${selectedBackup}' will OVERWRITE and replace current MongoDB collections with the snapshot. Are you sure you want to proceed?`
            : `CẢNH BÁO QUAN TRỌNG: Khôi phục từ bản sao lưu '${selectedBackup}' sẽ GHI ĐÈ và thay thế toàn bộ dữ liệu hiện tại bằng dữ liệu của bản sao lưu này. Bạn có chắc chắn muốn tiếp tục không?`
        }
        confirmLabel={isEn ? "Confirm Restore" : "Xác nhận Khôi phục"}
        cancelLabel={isEn ? "Cancel" : "Hủy bỏ"}
        pending={restoring}
        onConfirm={handleConfirmRestore}
        onClose={() => setConfirmRestoreOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={isEn ? "Delete Backup File" : "Xác nhận Xóa Bản Sao Lưu"}
        description={
          isEn
            ? `Are you sure you want to permanently delete backup '${selectedBackup}' from server storage?`
            : `Bạn có chắc chắn muốn xóa vĩnh viễn tệp sao lưu '${selectedBackup}' khỏi máy chủ không?`
        }
        confirmLabel={isEn ? "Delete" : "Xóa"}
        cancelLabel={isEn ? "Cancel" : "Hủy bỏ"}
        pending={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </Card>
  );
}

