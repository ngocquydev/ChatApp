"use client";

import { ReactNode } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Nhãn nút an toàn (mặc định chọn khi nghi ngờ) */
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Hộp xác nhận cho hành động phá hủy: nút an toàn trước, nút xác nhận màu lỗi, khóa cả hai khi đang xử lý. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { tr } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 700 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending} color="inherit">
          {cancelLabel ?? tr("Giữ lại", "Cancel")}
        </Button>
        <Button onClick={onConfirm} disabled={pending} color="error" variant="contained">
          {pending ? tr("Đang xử lý…", "Processing…") : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
