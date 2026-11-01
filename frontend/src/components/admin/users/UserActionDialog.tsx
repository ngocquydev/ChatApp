"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  CircularProgress,
} from "@mui/material";
import { AdminUser } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";

export type UserActionType = "ban" | "unban" | "role" | "delete" | null;

interface UserActionDialogProps {
  user: AdminUser | null;
  action: UserActionType;
  open: boolean;
  onClose: () => void;
  onConfirm: (user: AdminUser, action: UserActionType, reason?: string) => Promise<void>;
}

export default function UserActionDialog({
  user,
  action,
  open,
  onClose,
  onConfirm,
}: UserActionDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isEnglish: isEn } = useTranslation();

  if (!user || !action) return null;

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm(user, action, reason.trim() || undefined);
      setReason("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (action === "ban") return isEn ? `Ban user: ${user.name}` : `Khóa tài khoản: ${user.name}`;
    if (action === "unban") return isEn ? `Unban user: ${user.name}` : `Mở khóa tài khoản: ${user.name}`;
    if (action === "role") {
      const nextRole = user.role === "admin" ? "user" : "admin";
      return isEn ? `Change role to ${nextRole}` : `Đổi vai trò thành ${nextRole}`;
    }
    return isEn ? `Delete user: ${user.name}` : `Xóa tài khoản: ${user.name}`;
  };

  const getDescription = () => {
    if (action === "ban") {
      return isEn
        ? "Banning this user will immediately revoke their session and block access to the application."
        : "Khóa tài khoản sẽ thu hồi phiên đăng nhập ngay lập tức và chặn người dùng truy cập ứng dụng.";
    }
    if (action === "unban") {
      return isEn
        ? "This will restore normal account access for this user."
        : "Hành động này sẽ khôi phục quyền truy cập bình thường cho người dùng.";
    }
    if (action === "role") {
      const nextRole = user.role === "admin" ? "user" : "admin";
      return isEn
        ? `Are you sure you want to change this user's role from ${user.role} to ${nextRole}?`
        : `Bạn có chắc chắn muốn đổi vai trò của người dùng từ ${user.role} sang ${nextRole}?`;
    }
    return isEn
      ? "Soft deleting this user will hide their profile and disable login. This action can be audited."
      : "Xóa tài khoản sẽ ẩn hồ sơ và ngăn người dùng đăng nhập. Thao tác này được lưu vết quản trị.";
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{getTitle()}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {getDescription()}
        </Typography>

        <Box sx={{ p: 1.5, mb: 2, borderRadius: "8px", bgcolor: "action.hover" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.name}</Typography>
          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
        </Box>

        {action === "ban" && (
          <TextField
            fullWidth
            size="small"
            label={isEn ? "Reason for ban (optional)" : "Lý do khóa tài khoản (tùy chọn)"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: "8px" }}>
          {isEn ? "Cancel" : "Hủy bỏ"}
        </Button>
        <Button
          variant="contained"
          color={action === "ban" || action === "delete" ? "error" : "primary"}
          onClick={handleConfirm}
          disabled={submitting}
          sx={{ borderRadius: "8px" }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : isEn ? "Confirm" : "Xác nhận"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
