"use client";

import { Box, Chip, Paper, Typography, Avatar } from "@mui/material";
import { Sparkles, MessageSquareQuote } from "lucide-react";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { useTranslation } from "@/i18n/useTranslation";

interface AuraWelcomeCardProps {
  onSelectPrompt: (promptText: string) => void;
}

const DEFAULT_ICEBREAKERS = [
  { icon: "✨", labelVi: "Có gì vui không nè?", labelEn: "What's sparkling today?" },
  { icon: "👋", labelVi: "Chào Aura AI!", labelEn: "Hello Aura AI!" },
  { icon: "💡", labelVi: "Bạn có thể giúp gì cho tôi?", labelEn: "What can you help me with?" },
  { icon: "📝", labelVi: "Giúp tôi tóm tắt bài viết", labelEn: "Help me summarize a post" },
  { icon: "🎯", labelVi: "Lên kế hoạch một ngày hiệu quả", labelEn: "Plan a productive day" },
];

export default function AuraWelcomeCard({ onSelectPrompt }: AuraWelcomeCardProps) {
  const { tr } = useTranslation();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 3 },
        my: "auto",
        textAlign: "center",
        maxWidth: 420,
        mx: "auto",
      }}
    >
      <Box
        sx={{
          position: "relative",
          mb: 2,
          display: "inline-flex",
          p: 0.5,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--mui-palette-brand-500) 0%, var(--mui-palette-tone-a855f7) 50%, var(--mui-palette-tone-ec4899) 100%)",
          boxShadow: "0 0 24px rgba(139, 92, 246, 0.35)",
        }}
      >
        <Avatar
          src="/assets/avatars/aura-bot.svg"
          alt="Aura AI"
          sx={{ width: 68, height: 68, bgcolor: "background.paper" }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            right: 0,
            bgcolor: "background.paper",
            borderRadius: "50%",
            p: 0.3,
            boxShadow: 2,
          }}
        >
          <Sparkles size={16} color="var(--mui-palette-brand-600)" />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
          Aura AI
        </Typography>
        <VerifiedBadge size={18} />
      </Box>

      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          lineHeight: 1.5,
          mb: 2.5,
          px: 1,
        }}
      >
        {tr(
          "Trợ lý AI thông minh trên ChatApp. Tích hợp mô hình Llama 3.3 (Groq) & RAG. Hãy nhắn tin để hỏi đáp, tóm tắt và trò chuyện!",
          "Smart AI assistant on ChatApp powered by Llama 3.3 (Groq) & RAG. Send a message to ask, summarize, and chat!"
        )}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          p: 1.5,
          borderRadius: "16px",
          bgcolor: "action.hover",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.6,
            color: "text.secondary",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: "0.7rem",
          }}
        >
          <MessageSquareQuote size={13} />
          {tr("Gợi ý bắt đầu", "Suggested prompts")}
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, justifyContent: "center" }}>
          {DEFAULT_ICEBREAKERS.map((item, idx) => (
            <Chip
              key={idx}
              clickable
              onClick={() => onSelectPrompt(tr(item.labelVi, item.labelEn))}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <span>{item.icon}</span>
                  <span>{tr(item.labelVi, item.labelEn)}</span>
                </Box>
              }
              size="small"
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                fontWeight: 600,
                fontSize: "0.8rem",
                py: 1.5,
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "action.selected",
                  borderColor: "primary.main",
                  color: "primary.main",
                  transform: "translateY(-1px)",
                },
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

