"use client";

import { useState } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";
import { REACTIONS, REACTION_MAP, ReactionType, getReactionLabel } from "./reactionConstants";

interface ReactionPickerProps {
  onSelect: (type: ReactionType) => void;
  currentReaction?: ReactionType | null;
  size?: "small" | "medium";
  onClose?: () => void;
}

export default function ReactionPicker({
  onSelect,
  currentReaction,
  size = "medium",
  onClose,
}: ReactionPickerProps) {
  const { language } = useTranslation();
  const isEn = language === "en";
  const [hoveredType, setHoveredType] = useState<ReactionType | null>(null);

  const btnSize = size === "small" ? 30 : 42;
  const fontSize = size === "small" ? "1.25rem" : "1.65rem";

  const activeHoveredDef = hoveredType ? REACTION_MAP[hoveredType] : null;

  return (
    <Box
      role="toolbar"
      aria-label={isEn ? "Select reaction" : "Chọn cảm xúc"}
      onMouseLeave={() => setHoveredType(null)}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: size === "small" ? 0.35 : { xs: 0.5, sm: 0.75 },
        px: size === "small" ? 0.6 : 1,
        py: size === "small" ? 0.35 : 0.5,
        bgcolor: "background.paper",
        borderRadius: "999px",
        boxShadow: "0 3px 12px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08)",
        border: "1px solid",
        borderColor: "divider",
        zIndex: 1300,
        transform: "translateZ(0)",
        animation: "reactionPickerPop 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "@keyframes reactionPickerPop": {
          "0%": {
            opacity: 0,
            transform: "translateY(6px) scale(0.9)",
          },
          "100%": {
            opacity: 1,
            transform: "translateY(0) scale(1)",
          },
        },
      }}
    >
      {/* Nhãn cảm xúc hiển thị sắc nét phía trên emoji đang hover (kiểu chuẩn Facebook) */}
      {activeHoveredDef && (
        <Box
          sx={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            bgcolor: "text.primary",
            color: "background.paper",
            px: 1.2,
            py: 0.35,
            borderRadius: "999px",
            boxShadow: 2,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 1310,
            animation: "reactionLabelFade 0.12s ease-out",
            "@keyframes reactionLabelFade": {
              "0%": { opacity: 0, transform: "translateX(-50%) translateY(4px)" },
              "100%": { opacity: 1, transform: "translateX(-50%) translateY(0)" },
            },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              lineHeight: 1.2,
              display: "block",
            }}
          >
            {getReactionLabel(activeHoveredDef.type, language)}
          </Typography>
        </Box>
      )}

      {REACTIONS.map((r) => {
        const isSelected = currentReaction === r.type;
        const isHovered = hoveredType === r.type;
        const label = getReactionLabel(r.type, language);

        return (
          <ButtonBase
            key={r.type}
            aria-label={label}
            aria-pressed={isSelected}
            onMouseEnter={() => setHoveredType(r.type)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r.type);
              onClose?.();
            }}
            sx={{
              width: btnSize,
              height: btnSize,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize,
              lineHeight: 1,
              userSelect: "none",
              bgcolor: isSelected ? "action.selected" : "transparent",
              transition: "transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              transform: isHovered
                ? "scale(1.42) translateY(-6px)"
                : isSelected
                  ? "scale(1.1)"
                  : "scale(1)",
              "&:active": {
                transform: "scale(1.15) translateY(-2px)",
              },
            }}
          >
            <span
              role="img"
              aria-label={label}
              style={{
                display: "block",
                lineHeight: 1,
                filter: "none",
                textShadow: "none",
              }}
            >
              {r.emoji}
            </span>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
