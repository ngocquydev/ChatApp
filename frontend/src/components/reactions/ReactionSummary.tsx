"use client";

import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";
import { REACTION_MAP, ReactionType } from "./reactionConstants";

interface ReactionSummaryProps {
  totalCount: number;
  reactionsCount?: Record<string, number>;
  onClick?: () => void;
  size?: "small" | "medium";
}

export default function ReactionSummary({
  totalCount,
  reactionsCount,
  onClick,
  size = "medium",
}: ReactionSummaryProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  if (totalCount <= 0) return null;

  // Sắp xếp các loại cảm xúc theo số lượng giảm dần để hiển thị các emoji nhiều nhất
  const topReactions: { type: ReactionType; count: number; emoji: string }[] = [];
  if (reactionsCount) {
    const sorted = Object.entries(reactionsCount)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    for (const [type, count] of sorted) {
      if (type in REACTION_MAP) {
        topReactions.push({
          type: type as ReactionType,
          count,
          emoji: REACTION_MAP[type as ReactionType].emoji,
        });
      }
    }
  }

  // Fallback nếu không có breakdown reactionsCount: mặc định là Like 👍
  if (topReactions.length === 0) {
    topReactions.push({
      type: "like",
      count: totalCount,
      emoji: "👍",
    });
  }

  const visibleTop = topReactions.slice(0, 3);
  const tooltipText = topReactions
    .map((r) => {
      const def = REACTION_MAP[r.type];
      const label = def ? (isEn ? def.labelEn : def.labelVi) : r.type;
      return `${r.emoji} ${r.count} ${label}`;
    })
    .join(" · ");

  const iconSize = size === "small" ? 18 : 20;
  const fontSize = size === "small" ? "0.75rem" : "0.8125rem";

  return (
    <Tooltip title={tooltipText} placement="top" arrow enterDelay={200}>
      <ButtonBase
        onClick={onClick}
        aria-label={isEn ? `${totalCount} reactions: ${tooltipText}` : `${totalCount} lượt bày tỏ cảm xúc: ${tooltipText}`}
        sx={{
          borderRadius: "999px",
          px: 0.75,
          py: 0.25,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          transition: "background-color 0.15s ease",
          "&:hover": {
            bgcolor: "action.hover",
            textDecoration: "underline",
          },
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
          {visibleTop.map((r, idx) => (
            <Box
              key={r.type}
              sx={{
                width: iconSize,
                height: iconSize,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size === "small" ? "0.75rem" : "0.875rem",
                bgcolor: "background.paper",
                boxShadow: "0 0 0 1.5px var(--mui-palette-background-paper)",
                ml: idx > 0 ? -0.5 : 0,
                zIndex: visibleTop.length - idx,
                lineHeight: 1,
              }}
            >
              <span role="img" aria-label={r.type}>
                {r.emoji}
              </span>
            </Box>
          ))}
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontWeight: 600,
            fontSize,
            lineHeight: 1,
          }}
        >
          {totalCount}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
}

