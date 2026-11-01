"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { Smile } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { REACTION_MAP, ReactionType } from "./reactionConstants";
import ReactionPicker from "./ReactionPicker";

interface InlineReactionButtonProps {
  myReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  onToggleDefault?: () => void;
  variant?: "text" | "icon";
  pickerPlacement?: "top" | "bottom";
  pickerAlign?: "left" | "right";
}

export default function InlineReactionButton({
  myReaction,
  onReact,
  onToggleDefault,
  variant = "text",
  pickerPlacement = "top",
  pickerAlign = "left",
}: InlineReactionButtonProps) {
  const { language } = useTranslation();
  const isEn = language === "en";
  const [showPicker, setShowPicker] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeDef = myReaction ? REACTION_MAP[myReaction] : null;

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!showPicker) {
      hoverTimerRef.current = setTimeout(() => {
        setShowPicker(true);
      }, 160);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    closeTimerRef.current = setTimeout(() => {
      setShowPicker(false);
    }, 320);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onToggleDefault) {
      if (showPicker) setShowPicker(false);
      onToggleDefault();
    } else {
      setShowPicker((prev) => !prev);
    }
  };

  const label = activeDef
    ? isEn
      ? activeDef.labelEn
      : activeDef.labelVi
    : isEn
      ? "Like"
      : "Thích";

  const color = activeDef ? activeDef.color : "text.secondary";

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      {showPicker && (
        <Box
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            position: "absolute",
            [pickerPlacement === "top" ? "bottom" : "top"]: "100%",
            [pickerPlacement === "top" ? "pb" : "pt"]: "8px", // Cầu nối vô hình (hover bridge)
            [pickerAlign === "left" ? "left" : "right"]: 0,
            zIndex: 1300,
          }}
        >
          <ReactionPicker
            size="small"
            currentReaction={myReaction}
            onSelect={(type) => {
              onReact(type);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        </Box>
      )}

      {variant === "icon" ? (
        <ButtonBase
          onClick={handleClick}
          aria-label={isEn ? "React to message" : "Bày tỏ cảm xúc"}
          sx={{
            p: 0.5,
            borderRadius: "50%",
            color: "text.secondary",
            transition: "all 0.15s ease",
            "&:hover": {
              color: "primary.main",
              bgcolor: "action.hover",
              transform: "scale(1.15)",
            },
          }}
        >
          <Smile size={16} aria-hidden />
        </ButtonBase>
      ) : (
        <ButtonBase
          onClick={handleClick}
          aria-label={label}
          sx={{
            borderRadius: "4px",
            px: 0.5,
            py: 0.1,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              color,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            {activeDef && (
              <span role="img" aria-hidden style={{ fontSize: "0.85rem", lineHeight: 1 }}>
                {activeDef.emoji}
              </span>
            )}
            {label}
          </Typography>
        </ButtonBase>
      )}
    </Box>
  );
}
