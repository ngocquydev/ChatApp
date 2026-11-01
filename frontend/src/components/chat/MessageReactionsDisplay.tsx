"use client";

import { useMemo } from "react";
import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";
import { REACTION_MAP, ReactionType } from "@/components/reactions/reactionConstants";
import type { MessageReactionItem } from "@/store/useChatStore";

interface MessageReactionsDisplayProps {
  reactions?: MessageReactionItem[];
  currentUserId?: string;
  onToggleReaction?: (type: ReactionType) => void;
  isMe?: boolean;
}

export default function MessageReactionsDisplay({
  reactions = [],
  currentUserId,
  onToggleReaction,
  isMe = false,
}: MessageReactionsDisplayProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const grouped = useMemo(() => {
    if (!reactions || reactions.length === 0) return [];
    const map = new Map<
      string,
      { type: ReactionType; count: number; userIds: string[]; reactedByMe: boolean }
    >();

    for (const r of reactions) {
      if (!r.type) continue;
      const type = r.type as ReactionType;
      const existing = map.get(type);
      const isMine = Boolean(currentUserId && String(r.userId) === String(currentUserId));

      if (existing) {
        existing.count += 1;
        existing.userIds.push(String(r.userId));
        if (isMine) existing.reactedByMe = true;
      } else {
        map.set(type, {
          type,
          count: 1,
          userIds: [String(r.userId)],
          reactedByMe: isMine,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [reactions, currentUserId]);

  if (grouped.length === 0) return null;

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: 0.5,
        mt: 0.35,
        alignSelf: isMe ? "flex-end" : "flex-start",
      }}
    >
      {grouped.map((g) => {
        const def = REACTION_MAP[g.type];
        const emoji = def ? def.emoji : "👍";
        const label = def ? (isEn ? def.labelEn : def.labelVi) : g.type;
        const tooltipText = g.reactedByMe
          ? isEn
            ? `You and ${g.count - 1} other(s) reacted ${label}`
            : g.count > 1
              ? `Bạn và ${g.count - 1} người khác đã bày tỏ ${label}`
              : `Bạn đã bày tỏ ${label}`
          : isEn
            ? `${g.count} reacted ${label}`
            : `${g.count} người đã bày tỏ ${label}`;

        return (
          <Tooltip key={g.type} title={tooltipText} placement="top" arrow enterDelay={150}>
            <ButtonBase
              onClick={(e) => {
                e.stopPropagation();
                onToggleReaction?.(g.type);
              }}
              aria-label={tooltipText}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.75,
                py: 0.15,
                borderRadius: "999px",
                bgcolor: g.reactedByMe ? "action.selected" : "background.paper",
                border: "1px solid",
                borderColor: g.reactedByMe ? "primary.main" : "divider",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
                cursor: onToggleReaction ? "pointer" : "default",
                transition: "all 0.15s ease",
                "&:hover": onToggleReaction
                  ? {
                      transform: "scale(1.08)",
                      bgcolor: "action.hover",
                    }
                  : {},
              }}
            >
              <span role="img" aria-hidden style={{ fontSize: "0.85rem", lineHeight: 1 }}>
                {emoji}
              </span>
              {g.count > 1 && (
                <Typography
                  variant="caption"
                  color={g.reactedByMe ? "primary.main" : "text.secondary"}
                  sx={{ fontWeight: 700, fontSize: "0.7rem", lineHeight: 1 }}
                >
                  {g.count}
                </Typography>
              )}
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
}

