"use client";

import React, { ReactNode } from "react";
import { Box, Tooltip } from "@mui/material";
import { Bot, Sparkles } from "lucide-react";

interface MentionTextProps {
  text: string;
  onMentionClick?: (name: string, userId?: string) => void;
}

/**
 * Hiển thị văn bản có tô màu nổi bật các thẻ nhắc đến (@aura và @bạn_bè)
 */
export function MentionText({ text, onMentionClick }: MentionTextProps) {
  if (!text) return null;

  // Regex phát hiện @[Name](userId), @aura, và @Name thông thường
  const pattern = /(@\[([^\]]+)\]\(([a-f0-9]{24})\)|@aura\b|@([a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+(?:\s[a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]+)?))/gi;

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
        <Tooltip key={`aura-${matchIndex}`} title="Trợ lý ảo Aura AI (Gemini Flash)" arrow>
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
            onClick={() => onMentionClick?.("Aura AI", "666666666666666666666666")}
          >
            <Sparkles size={11} style={{ flexShrink: 0 }} />
            <span>@aura</span>
          </Box>
        </Tooltip>
      );
    }
    // 2. Tag có định dạng chuẩn: @[Name](userId)
    else if (match[2] && match[3]) {
      const name = match[2];
      const userId = match[3];
      elements.push(
        <Box
          key={`tag-${userId}-${matchIndex}`}
          component="span"
          sx={{
            display: "inline",
            color: "primary.main",
            fontWeight: 700,
            bgcolor: "action.hover",
            px: 0.45,
            py: 0.1,
            borderRadius: "4px",
            mx: 0.15,
            cursor: onMentionClick ? "pointer" : "default",
            "&:hover": onMentionClick ? { textDecoration: "underline" } : undefined,
          }}
          onClick={() => onMentionClick?.(name, userId)}
        >
          @{name}
        </Box>
      );
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
            fontWeight: 700,
            bgcolor: "action.hover",
            px: 0.45,
            py: 0.1,
            borderRadius: "4px",
            mx: 0.15,
            cursor: onMentionClick ? "pointer" : "default",
            "&:hover": onMentionClick ? { textDecoration: "underline" } : undefined,
          }}
          onClick={() => onMentionClick?.(rawName)}
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

