"use client";

import { Box, Chip, Typography } from "@mui/material";
import { Sparkles, BarChart2, HeartHandshake, Utensils, Feather, Lightbulb, Zap } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

export interface AuraPromptOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

interface AuraPromptSuggestionsProps {
  onSelectPrompt: (promptText: string) => void;
  onClose?: () => void;
}

export default function AuraPromptSuggestions({ onSelectPrompt }: AuraPromptSuggestionsProps) {
  const { tr } = useTranslation();

  const prompts: AuraPromptOption[] = [
    {
      id: "stats",
      icon: <BarChart2 size={14} />,
      label: tr("Ai nhắn nhiều hơn?", "Who chats more?"),
      prompt: "@aura bóc phốt xem trong đoạn chat này ai là người nhắn nhiều hơn và nói nhiều hơn? 😜",
    },
    {
      id: "relationship",
      icon: <HeartHandshake size={14} />,
      label: tr("Chấm điểm cạ cứng", "Friendship score"),
      prompt: "@aura chấm điểm độ thân thiết và ăn ý của hai đứa tụi mình qua đoạn chat này xem nào! 💯",
    },
    {
      id: "food",
      icon: <Utensils size={14} />,
      label: tr("Chọn kèo ăn uống", "Food arbitration"),
      prompt: "@aura hôm nọ tụi mình bàn đi ăn gì ấy nhỉ, gợi ý giúp tụi tui một kèo ăn ngon hôm nay đi! 🍜",
    },
    {
      id: "poem",
      icon: <Feather size={14} />,
      label: tr("Làm thơ con cóc", "Fun poem"),
      prompt: "@aura làm một bài thơ 4 câu hài hước về tình bạn của hai đứa tụi tui dựa trên lịch sử chat 📝",
    },
    {
      id: "icebreaker",
      icon: <Lightbulb size={14} />,
      label: tr("Chủ đề chém gió", "Icebreaker"),
      prompt: "@aura gợi ý một chủ đề cực cuốn để hai đứa tiếp tục tán gẫu hôm nay đi! 🔥",
    },
    {
      id: "help",
      icon: <Zap size={14} />,
      label: tr("Mẹo xịn ChatApp", "ChatApp tips"),
      prompt: "@aura chỉ cho tui các tính năng xịn xò nhất của ChatApp mà tui nên thử ngay! 🚀",
    },
  ];

  return (
    <Box
      sx={{
        px: 1.5,
        py: 0.85,
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "action.hover",
        borderTop: "1px dashed",
        borderColor: "divider",
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        <Sparkles size={14} color="var(--mui-palette-primary-main)" />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "primary.main",
            whiteSpace: "nowrap",
            letterSpacing: "0.2px",
            fontSize: "0.72rem",
          }}
        >
          {tr("Hỏi vui Aura AI:", "Ask Aura AI:")}
        </Typography>
      </Box>

      {prompts.map((item) => (
        <Chip
          key={item.id}
          icon={
            <Box component="span" sx={{ display: "inline-flex", color: "primary.main", ml: 0.5 }}>
              {item.icon}
            </Box>
          }
          label={item.label}
          size="small"
          clickable
          onClick={() => onSelectPrompt(item.prompt)}
          aria-label={item.label}
          sx={{
            flexShrink: 0,
            fontSize: "0.75rem",
            fontWeight: 600,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "action.hover",
              transform: "translateY(-1px)",
            },
          }}
        />
      ))}
    </Box>
  );
}

