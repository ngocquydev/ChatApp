"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Box, Button, IconButton } from "@mui/material";
import { Heart, ThumbsUp } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  REACTION_MAP,
  ReactionType,
  getReactionLabel,
} from "./reactionConstants";
import ReactionPicker from "./ReactionPicker";

interface PostReactionButtonProps {
  myReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  onToggleDefault: () => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export default function PostReactionButton({
  myReaction,
  onReact,
  onToggleDefault,
  disabled = false,
  iconOnly = false,
}: PostReactionButtonProps) {
  const { language } = useTranslation();
  const isEn = language === "en";
  const [showPicker, setShowPicker] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeDef = myReaction ? REACTION_MAP[myReaction] : null;

  const handleMouseEnter = () => {
    if (disabled) return;
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
    if (disabled) return;
    if (showPicker) {
      setShowPicker(false);
    }
    onToggleDefault();
  };

  const currentLabel = activeDef
    ? getReactionLabel(activeDef.type, language)
    : getReactionLabel("like", language);

  const currentColor = activeDef ? activeDef.color : "text.secondary";

  return (
    <Box
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      sx={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        display: "inline-flex",
      }}
    >
      {showPicker && (
        <Box
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            pb: "10px",
            zIndex: 1300,
          }}
        >
          <ReactionPicker
            currentReaction={myReaction}
            onSelect={(type) => {
              onReact(type);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        </Box>
      )}

      {iconOnly ? (
        <IconButton
          disabled={disabled}
          aria-pressed={Boolean(myReaction)}
          aria-label={currentLabel}
          onClick={handleClick}
          sx={{ color: activeDef ? activeDef.color : "common.white", p: 0.75 }}
        >
          {activeDef ? (
            <span
              role="img"
              aria-hidden
              style={{ fontSize: "1.6rem", lineHeight: 1 }}
            >
              {activeDef.emoji}
            </span>
          ) : (
            <Heart size={30} aria-hidden />
          )}
        </IconButton>
      ) : (
        <Button
          fullWidth
          color="inherit"
          disabled={disabled}
          aria-pressed={Boolean(myReaction)}
          aria-label={currentLabel}
          onClick={handleClick}
          startIcon={
            activeDef ? (
              <span
                role="img"
                aria-hidden
                style={{ fontSize: "1.15rem", lineHeight: 1 }}
              >
                {activeDef.emoji}
              </span>
            ) : (
              <ThumbsUp size={18} aria-hidden />
            )
          }
          sx={{
            fontWeight: 600,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
            color: currentColor,
            py: 0.8,
            px: { xs: 0.5, sm: 1.5 },
            borderRadius: "8px",
            transition: "all 0.15s ease",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {currentLabel}
        </Button>
      )}
    </Box>
  );
}
