"use client";

import { useState, useEffect } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface AuraFeedbackButtonsProps {
  messageId: string;
  initialFeedback?: "up" | "down" | null;
  onFeedback?: (messageId: string, type: "up" | "down") => void;
}

export default function AuraFeedbackButtons({
  messageId,
  initialFeedback = null,
  onFeedback,
}: AuraFeedbackButtonsProps) {
  const { tr } = useTranslation();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(initialFeedback);

  useEffect(() => {
    if (!initialFeedback && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`aura_feedback_${messageId}`);
        if (stored === "up" || stored === "down") {
          setFeedback(stored);
        }
      } catch {
        // Bỏ qua lỗi localStorage
      }
    }
  }, [initialFeedback, messageId]);

  const handleRate = (type: "up" | "down") => {
    const next = feedback === type ? null : type;
    setFeedback(next);
    if (typeof window !== "undefined") {
      if (next) {
        localStorage.setItem(`aura_feedback_${messageId}`, next);
      } else {
        localStorage.removeItem(`aura_feedback_${messageId}`);
      }
    }
    if (next && onFeedback) {
      onFeedback(messageId, next);
    }
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        ml: 0.75,
        alignSelf: "center",
      }}
    >
      <Tooltip
        title={
          feedback === "up"
            ? tr("Bạn thấy câu trả lời này hữu ích", "You marked this as helpful")
            : tr("Hữu ích", "Good response")
        }
        arrow
        disableInteractive
      >
        <IconButton
          size="small"
          aria-label={tr("Đánh giá hữu ích", "Rate helpful")}
          aria-pressed={feedback === "up"}
          onClick={() => handleRate("up")}
          sx={{
            width: 28,
            height: 28,
            bgcolor:
              feedback === "up"
                ? "var(--mui-palette-brand-50)"
                : "action.hover",
            color:
              feedback === "up"
                ? "primary.main"
                : "text.secondary",
            border: "1px solid",
            borderColor:
              feedback === "up"
                ? "primary.main"
                : "divider",
            transition: "all 0.15s ease",
            "&:hover": {
              bgcolor: "action.selected",
              color: "primary.main",
              transform: "scale(1.08)",
            },
          }}
        >
          <ThumbsUp size={14} fill={feedback === "up" ? "currentColor" : "none"} />
        </IconButton>
      </Tooltip>

      <Tooltip
        title={
          feedback === "down"
            ? tr("Bạn thấy câu trả lời chưa tốt", "You marked this as unhelpful")
            : tr("Chưa hài lòng", "Poor response")
        }
        arrow
        disableInteractive
      >
        <IconButton
          size="small"
          aria-label={tr("Đánh giá chưa hài lòng", "Rate unhelpful")}
          aria-pressed={feedback === "down"}
          onClick={() => handleRate("down")}
          sx={{
            width: 28,
            height: 28,
            bgcolor:
              feedback === "down"
                ? "var(--mui-palette-tone-fef2f2)"
                : "action.hover",
            color:
              feedback === "down"
                ? "error.main"
                : "text.secondary",
            border: "1px solid",
            borderColor:
              feedback === "down"
                ? "error.main"
                : "divider",
            transition: "all 0.15s ease",
            "&:hover": {
              bgcolor: "action.selected",
              color: "error.main",
              transform: "scale(1.08)",
            },
          }}
        >
          <ThumbsDown size={14} fill={feedback === "down" ? "currentColor" : "none"} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

