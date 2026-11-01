"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { Bot, Copy, Check, RefreshCw, Sparkles, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { summarizeChat } from "@/services/geminiApi";

interface AiChatSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  partnerName?: string;
}

export function AiChatSummaryDialog({
  open,
  onClose,
  conversationId,
  partnerName,
}: AiChatSummaryDialogProps) {
  const { tr } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await summarizeChat(conversationId, 35);
      setSummary(res.summary);
      setMessageCount(res.messageCount);
    } catch {
      setSummary(
        tr(
          "Không thể tạo tóm tắt lúc này. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.",
          "Unable to generate summary at this moment. Please check network or try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, tr]);

  useEffect(() => {
    if (open) {
      void fetchSummary();
    } else {
      setSummary(null);
      setCopied(false);
    }
  }, [open, fetchSummary]);

  const handleCopy = () => {
    if (!summary) return;
    void navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            bgcolor: "background.paper",
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "10px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Sparkles size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {tr("Tóm tắt hội thoại", "Conversation Summary")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {partnerName
                ? tr(`Cuộc trò chuyện với ${partnerName}`, `Conversation with ${partnerName}`)
                : tr("Đoạn chat gần nhất", "Recent chat messages")}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" aria-label={tr("Đóng", "Close")} onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.35,
            borderRadius: "6px",
            bgcolor: "action.hover",
            color: "primary.main",
            fontSize: "0.75rem",
            fontWeight: 700,
            mb: 2,
          }}
        >
          <Bot size={14} />
          <span>Google Gemini 1.5 Flash ({messageCount} {tr("tin nhắn", "messages")})</span>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              {tr("Gemini 1.5 Flash đang phân tích cuộc hội thoại…", "Gemini 1.5 Flash is analyzing the conversation…")}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
              whiteSpace: "pre-line",
              lineHeight: 1.65,
              fontSize: "0.9375rem",
            }}
          >
            <Typography variant="body2" component="div">
              {summary}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: "space-between" }}>
        <Button
          size="small"
          startIcon={<RefreshCw size={14} className={loading ? "animate-spin" : undefined} />}
          onClick={() => void fetchSummary()}
          disabled={loading}
          sx={{ color: "text.secondary" }}
        >
          {tr("Tạo lại", "Regenerate")}
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={handleCopy}
            disabled={loading || !summary}
          >
            {copied ? tr("Đã sao chép", "Copied") : tr("Sao chép", "Copy")}
          </Button>
          <Button size="small" variant="contained" onClick={onClose}>
            {tr("Đóng", "Close")}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default AiChatSummaryDialog;

