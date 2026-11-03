"use client";

import React, { ReactNode } from "react";
import NextLink from "next/link";
import { Box, Tooltip } from "@mui/material";
import { Sparkles } from "lucide-react";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { AURA_BOT_USER, AURA_BOT_ID, isAuraBot } from "@/constants/auraBot";

interface MentionTextProps {
  text: string;
  onMentionClick?: (name: string, userId?: string) => void;
}

/**
 * Hiển thị văn bản có tô màu xanh link đến trang bạn bè chuẩn Facebook (@bạn_bè)
 * và kết nối nhanh với Aura AI (@aura)
 */
export function MentionText({ text, onMentionClick }: MentionTextProps) {
  if (!text) return null;

  // Regex phát hiện @[Name](userId), @aura, và @Name thông thường
  const pattern = /(@\[([^\]]+)\]\(([^)]+)\)|@aura\b|@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+(?:\s[a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+)?))/gi;

  const elements: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0];

    // Thêm đoạn văn bản thường trước mention
    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    // 1. Tag Aura Bot: @aura
    if (/^@aura$/i.test(fullMatch)) {
      elements.push(
        <Tooltip key={`aura-${matchIndex}`} title="Trợ lý ảo Aura AI (Llama 3.3 (Groq))" arrow>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.3,
              px: 0.65,
              py: 0.05,
              borderRadius: "6px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 700,
              fontSize: "0.85em",
              lineHeight: 1.4,
              verticalAlign: "baseline",
              cursor: "pointer",
              mx: 0.2,
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              "&:hover": { opacity: 0.9 },
            }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              useChatBoxStore.getState().openChat(AURA_BOT_USER);
              onMentionClick?.("Aura AI", AURA_BOT_ID);
            }}
          >
            <Sparkles size={11} style={{ flexShrink: 0 }} />
            <span>@aura</span>
          </Box>
        </Tooltip>
      );
    }
    // 2. Tag có định dạng chuẩn: @[Name](userId) -> Link xanh vào trang bạn bè chuẩn Facebook
    else if (match[2] && match[3]) {
      const name = match[2];
      const userId = match[3];
      const displayName = name.startsWith("@") ? name : `@${name}`;

      if (isAuraBot(userId, name)) {
        elements.push(
          <Tooltip key={`aura-${userId}-${matchIndex}`} title="Trợ lý ảo Aura AI" arrow>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.3,
                color: "primary.main",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                "&:hover": { textDecoration: "underline", color: "primary.dark" },
              }}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                useChatBoxStore.getState().openChat(AURA_BOT_USER);
                onMentionClick?.("Aura AI", AURA_BOT_ID);
              }}
            >
              <Sparkles size={12} style={{ flexShrink: 0 }} />
              <span>{displayName}</span>
            </Box>
          </Tooltip>
        );
      } else {
        elements.push(
          <Box
            key={`tag-${userId}-${matchIndex}`}
            component={NextLink}
            href={`/profile/${userId}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onMentionClick?.(name, userId);
            }}
            sx={{
              display: "inline",
              color: "primary.main",
              fontWeight: 600,
              textDecoration: "none",
              cursor: "pointer",
              transition: "color 0.15s ease",
              "&:hover": {
                textDecoration: "underline",
                color: "primary.dark",
              },
            }}
          >
            {displayName}
          </Box>
        );
      }
    }
    // 3. Tag thông thường: @Tên
    else {
      const rawName = fullMatch.slice(1);
      elements.push(
        <Box
          key={`raw-${matchIndex}`}
          component="span"
          sx={{
            display: "inline",
            color: "primary.main",
            fontWeight: 600,
            textDecoration: "none",
            cursor: onMentionClick ? "pointer" : "default",
            "&:hover": onMentionClick ? { textDecoration: "underline", color: "primary.dark" } : undefined,
          }}
          onClick={(e: React.MouseEvent) => {
            if (onMentionClick) {
              e.stopPropagation();
              onMentionClick(rawName);
            }
          }}
        >
          {fullMatch}
        </Box>
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Thêm phần còn lại của văn bản
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return <>{elements}</>;
}

export default MentionText;

