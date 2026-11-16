"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";
import { Box, ButtonBase, Typography, Popper } from "@mui/material";
import { Smile } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { REACTION_MAP, ReactionType, getReactionLabel } from "./reactionConstants";
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeDef = myReaction ? REACTION_MAP[myReaction] : null;

  const handleMouseEnter = (e?: MouseEvent<HTMLElement>) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (e?.currentTarget) {
      setAnchorEl(e.currentTarget);
    } else if (buttonRef.current && !anchorEl) {
      setAnchorEl(buttonRef.current);
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
      setAnchorEl(e.currentTarget);
      setShowPicker((prev) => !prev);
    }
  };

  const label = activeDef
    ? getReactionLabel(activeDef.type, language)
    : getReactionLabel("like", language);

  const color = activeDef ? activeDef.color : "text.secondary";

  const popperPlacement =
    pickerPlacement === "bottom"
      ? pickerAlign === "right"
        ? "bottom-end"
        : "bottom-start"
      : pickerAlign === "right"
        ? "top-end"
        : "top-start";

  return (
    <>
      <Box
        component="span"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ display: "inline-flex", alignItems: "center" }}
      >
        {variant === "icon" ? (
          <ButtonBase
            ref={buttonRef}
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
            ref={buttonRef}
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

      <Popper
        open={showPicker}
        anchorEl={anchorEl || buttonRef.current}
        placement={popperPlacement}
        modifiers={[
          {
            name: "preventOverflow",
            enabled: true,
            options: {
              boundary: "viewport",
              padding: 8,
            },
          },
          {
            name: "offset",
            options: {
              offset: [0, 6],
            },
          },
          {
            name: "flip",
            enabled: true,
            options: {
              fallbackPlacements: ["bottom", "top"],
            },
          },
        ]}
        sx={{ zIndex: 1400 }}
      >
        <Box
          onMouseEnter={() => handleMouseEnter()}
          onMouseLeave={handleMouseLeave}
          sx={{ py: "6px" }}
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
      </Popper>
    </>
  );
}
