"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { BellOff, EyeOff, MessageSquareOff, ShieldAlert } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { ChatUser } from "@/store/useChatStore";

interface RestrictInfoDialogProps {
  open: boolean;
  partner: ChatUser | null;
  isRestricted: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function RestrictInfoDialog({
  open,
  partner,
  isRestricted,
  onConfirm,
  onClose,
}: RestrictInfoDialogProps) {
  const partnerName = partner?.name || "Người dùng này";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            p: 1,
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pt: 2, pb: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <PresenceAvatar name={partner?.name} src={partner?.avatar} online={false} size={56} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {isRestricted ? `Bỏ hạn chế ${partnerName}?` : `Hạn chế ${partnerName}?`}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 1.5 }}>
        {!isRestricted ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75, mt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <MessageSquareOff size={20} color="var(--mui-palette-text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Cuộc trò chuyện này sẽ được chuyển vào mục <strong>Đoạn chat bị hạn chế</strong> và không hiện ở danh sách chính.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <EyeOff size={20} color="var(--mui-palette-text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                {partnerName} sẽ <strong>không biết</strong> khi nào bạn đang online hoặc khi bạn đã đọc tin nhắn của họ.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <BellOff size={20} color="var(--mui-palette-text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Tắt toàn bộ chuông và thông báo khi người này gửi tin nhắn đến.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <ShieldAlert size={20} color="var(--mui-palette-text-secondary)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Họ sẽ không được thông báo rằng bạn đã hạn chế họ. Bạn có thể bỏ hạn chế bất cứ lúc nào.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 1 }}>
            Khi bỏ hạn chế, cuộc trò chuyện với <strong>{partnerName}</strong> sẽ trở lại danh sách chính và bạn sẽ nhận lại thông báo bình thường.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: 1, display: "flex", gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 600 }}
        >
          Hủy
        </Button>
        <Button
          fullWidth
          variant="contained"
          color={isRestricted ? "primary" : "warning"}
          onClick={async () => {
            await onConfirm();
            onClose();
          }}
          sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
        >
          {isRestricted ? "Bỏ hạn chế" : "Hạn chế"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
