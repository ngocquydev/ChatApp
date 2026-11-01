"use client";

import { Box, Button, CircularProgress, IconButton, Paper, Typography } from "@mui/material";
import { Sparkles, X, RefreshCw, Bot } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface AiCommentSummaryBoxProps {
  summary: string | null;
  loading: boolean;
  commentCount: number;
  onRefresh: () => void;
  onClose: () => void;
}

export function AiCommentSummaryBox({
  summary,
  loading,
  commentCount,
  onRefresh,
  onClose,
}: AiCommentSummaryBoxProps) {
  const { tr } = useTranslation();

  if (!loading && !summary) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1.5,
        mb: 2,
        p: 2,
        borderRadius: "14px",
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "primary.main",
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "8px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Sparkles size={16} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
              {tr("Tóm tắt bình luận bằng AI", "AI Comment Summary")}
              <Box
                component="span"
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  px: 0.6,
                  py: 0.1,
                  borderRadius: "4px",
                }}
              >
                Gemini Flash
              </Box>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {tr(`Dựa trên ${commentCount} bình luận thảo luận`, `Based on ${commentCount} discussion comments`)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            aria-label={tr("Làm mới tóm tắt", "Refresh summary")}
            onClick={onRefresh}
            disabled={loading}
            sx={{ color: "text.secondary" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
          </IconButton>
          <IconButton
            size="small"
            aria-label={tr("Đóng tóm tắt", "Close summary")}
            onClick={onClose}
            sx={{ color: "text.secondary" }}
          >
            <X size={16} />
          </IconButton>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
          <CircularProgress size={18} color="primary" />
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
            {tr("Gemini Flash đang đọc và tổng hợp các ý kiến…", "Gemini Flash is reading and synthesizing comments…")}
          </Typography>
        </Box>
      ) : (
        <Typography
          variant="body2"
          component="div"
          sx={{
            color: "text.primary",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            "& strong": { color: "primary.main" },
          }}
        >
          {summary}
        </Typography>
      )}
    </Paper>
  );
}

export default AiCommentSummaryBox;

