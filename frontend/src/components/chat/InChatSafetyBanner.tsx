"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  IconButton,
  Typography,
  Collapse,
} from "@mui/material";
import { ShieldAlert, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface InChatSafetyBannerProps {
  /** Danh sách tin nhắn gần đây để quét dấu hiệu rủi ro */
  messages: Array<{
    content?: string;
    senderId?: any;
    sender?: any;
  }>;
  /** ID người đang đăng nhập để chỉ cảnh báo khi người khác gửi yêu cầu tài chính */
  currentUserId?: string;
  /** ID cuộc trò chuyện hiện tại (để reset dismiss khi đổi chat) */
  conversationId?: string;
}

// Mẫu nhận diện tài chính / chuyển tiền / OTP / lừa đảo
const FINANCIAL_PATTERNS = [
  /\bstk\b/i,
  /số\s*tài\s*khoản/i,
  /ngân\s*hàng|vietcombank|techcombank|mbbank|mb\s*bank|acb|vpbank|momo|tpbank|bidv|vietinbank/i,
  /chuyển\s*(khoản|tiền)|bắn\s*tiền|nạp\s*tiền|gửi\s*tiền/i,
  /mã\s*otp|mật\s*khẩu|password|passcode|mã\s*xác\s*nhận|gửi\s*mã/i,
  /trúng\s*thưởng|hoa\s*hồng|nhiệm\s*vụ\s*kiếm\s*tiền|nhận\s*tiền\s*miễn\s*phí/i,
  /bank\s*account|wire\s*transfer|send\s*money|crypto|airdrop/i,
];

export default function InChatSafetyBanner({
  messages,
  currentUserId,
  conversationId,
}: InChatSafetyBannerProps) {
  const [dismissedMap, setDismissedMap] = useState<Record<string, boolean>>({});
  const { isEnglish: isEn } = useTranslation();

  const isDismissed = conversationId ? Boolean(dismissedMap[conversationId]) : false;

  // Quét 15 tin nhắn gần nhất
  const hasFinancialRisk = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const recent = messages.slice(-15);

    return recent.some((msg) => {
      const text = msg.content || "";
      if (!text.trim()) return false;

      // Nếu biết người gửi và người gửi là chính mình thì không cảnh báo
      const rawSender = msg.senderId || msg.sender;
      const sender = typeof rawSender === "object" ? rawSender?._id : rawSender;
      if (currentUserId && sender && String(sender) === String(currentUserId)) {
        return false;
      }

      return FINANCIAL_PATTERNS.some((pattern) => pattern.test(text));
    });
  }, [messages, currentUserId]);

  if (!hasFinancialRisk || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (conversationId) {
      setDismissedMap((prev) => ({ ...prev, [conversationId]: true }));
    }
  };

  return (
    <Collapse in={!isDismissed}>
      <Box sx={{ px: 1.5, py: 0.75 }}>
        <Alert
          severity="warning"
          icon={<ShieldAlert size={18} />}
          action={
            <IconButton
              size="small"
              onClick={handleDismiss}
              aria-label={isEn ? "Dismiss alert" : "Đóng cảnh báo"}
              sx={{ color: "text.secondary" }}
            >
              <X size={15} />
            </IconButton>
          }
          sx={{
            py: 0.5,
            px: 1.5,
            borderRadius: "10px",
            alignItems: "center",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "warning.main",
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "warning.main" }}>
              {isEn ? "Safety Alert: Financial or Sensitive Request" : "Cảnh báo an toàn: Nhận diện yêu cầu tài chính"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.75rem" }}>
              {isEn
                ? "Never send money, OTP codes, or passwords to unverified accounts."
                : "Tuyệt đối không chuyển tiền, gửi mã OTP hoặc mật khẩu cho người khác qua tin nhắn."}
            </Typography>
          </Box>
        </Alert>
      </Box>
    </Collapse>
  );
}
