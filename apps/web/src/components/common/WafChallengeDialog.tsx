"use client";

import { useRef, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { ShieldCheck } from "lucide-react";
import TurnstileWidget, { type TurnstileRef } from "@/components/common/TurnstileWidget";
import { useWafChallengeStore } from "@/store/useWafChallengeStore";
import { wafApi, apiErrorMessage } from "@/services/wafApi";
import { useTranslation } from "@/i18n/useTranslation";

/**
 * Hộp thoại xác minh khi tường lửa ứng dụng yêu cầu (Under Attack Mode / IP nước ngoài vào luồng xác thực).
 * Xác minh xong, backend cấp cookie clearance 30 phút và request ban đầu được gửi lại tự động.
 */
export default function WafChallengeDialog() {
  const { tr } = useTranslation();
  const open = useWafChallengeStore((s) => s.open);
  const complete = useWafChallengeStore((s) => s.complete);
  const cancel = useWafChallengeStore((s) => s.cancel);
  const turnstileRef = useRef<TurnstileRef>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToken = async (token: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await wafApi.requestClearance(token);
      complete();
    } catch (err) {
      // Không tự reset widget: Turnstile có thể giải lại ngay và tạo vòng lặp gửi request.
      // Người dùng chủ động bấm "Thử lại".
      setError(apiErrorMessage(err, tr("Xác minh không thành công. Vui lòng thử lại.", "Verification failed. Please try again.")));
    } finally {
      setPending(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    turnstileRef.current?.reset();
  };

  const handleCancel = () => {
    setError(null);
    cancel();
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : handleCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="waf-challenge-title"
      aria-describedby="waf-challenge-description"
    >
      <DialogTitle id="waf-challenge-title" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
        <ShieldCheck size={22} aria-hidden />
        {tr("Xác minh bảo mật", "Security check")}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="waf-challenge-description" sx={{ mb: 2 }}>
          {tr(
            "Hệ thống đang bật chế độ bảo vệ. Vui lòng xác minh bạn không phải bot để tiếp tục thao tác.",
            "Protection mode is on. Please confirm you are not a bot to continue.",
          )}
        </DialogContentText>
        {open && (
          <Box sx={{ display: "flex", justifyContent: "center", minHeight: 70 }}>
            <TurnstileWidget ref={turnstileRef} action="waf_clearance" onSuccess={handleToken} />
          </Box>
        )}
        {pending && (
          <Alert severity="info" sx={{ mt: 2 }} role="status">
            {tr("Đang xác minh…", "Verifying…")}
          </Alert>
        )}
        {error && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRetry}>
                {tr("Thử lại", "Retry")}
              </Button>
            }
          >
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} disabled={pending} color="inherit">
          {tr("Hủy", "Cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

