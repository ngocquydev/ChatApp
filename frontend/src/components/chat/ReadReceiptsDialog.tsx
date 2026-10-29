"use client";

import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import { Eye, X } from "lucide-react";
import { v } from "@/theme/tokens";

interface ReadReceiptsDialogProps {
  open: boolean;
  enabled: boolean;
  partnerName?: string;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
}

export default function ReadReceiptsDialog({
  open,
  enabled,
  partnerName,
  onClose,
  onToggle,
}: ReadReceiptsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            p: 1,
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          pt: 1.5,
          px: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              bgcolor: v.brand[50],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
            }}
          >
            <Eye size={20} aria-hidden />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            Thông báo đã đọc
          </Typography>
        </Box>
        <IconButton size="small" aria-label="Đóng hộp thoại" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pt: 1, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.55 }}>
          {partnerName
            ? `Cho phép ${partnerName} biết khi bạn đã đọc tin nhắn của họ. Nếu tắt tính năng này, bạn cũng sẽ không biết khi nào người khác đọc tin nhắn của bạn.`
            : "Cho phép mọi người biết khi bạn đã đọc tin nhắn của họ. Nếu tắt tính năng này, bạn cũng sẽ không biết khi nào người khác đọc tin nhắn của bạn."}
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.75,
            borderRadius: "12px",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ pr: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.92rem" }}>
              Hiển thị thông báo đã đọc
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {enabled ? "Người khác sẽ thấy khi bạn đã xem tin nhắn" : "Trạng thái đã xem của bạn đang được ẩn"}
            </Typography>
          </Box>
          <Switch
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            color="primary"
            slotProps={{ input: { "aria-label": "Bật hoặc tắt thông báo đã đọc" } }}
          />
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              borderRadius: "10px",
              px: 3,
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            Xong
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
