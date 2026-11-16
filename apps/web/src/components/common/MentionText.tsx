"use client";

import React, { ReactNode, useMemo } from "react";
import NextLink from "next/link";
import { Box, Tooltip } from "@mui/material";
import { Sparkles } from "lucide-react";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { useFriendStore } from "@/store/useFriendStore";
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
  const friends = useFriendStore((state) => state.friends);

  // Tạo map tên bạn bè -> ID để giải quyết link trang cá nhân ngay cả khi không có ID trong text
  const friendMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of friends) {
      if (f.friend?.name && f.friend?._id) {
        map.set(f.friend.name.toLowerCase().trim(), f.friend._id);
      }
    }
    return map;
  }, [friends]);

  // Regex phát hiện các định dạng mention:
  // 1. @[Name](userId) - chuẩn cũ có ID
  // 2. @[Name] - có ngoặc vuông không có ID
  // 3. @aura - trợ lý ảo
  // 4. @Tên bạn bè thực tế (bao gồm tên nhiều từ như @Anh hài lúa)
  // 5. @Tên thông thường 1-2 từ
  const pattern = useMemo(() => {
    const sortedFriendNames = friends
      .map((f) => f.friend?.name?.trim())
      .filter((n): n is string => Boolean(n && n.length > 0))
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    const friendNamesRegex = sortedFriendNames.length > 0 ? `@(${sortedFriendNames.join("|")})|` : "";

    return new RegExp(
      `(@\\[([^\\]]+)\\]\\(([^)]+)\\)|@\\[([^\\]]+)\\]|@aura\\b|${friendNamesRegex}@([a-zA-Z0-9_\\u00C0-\\u024F\\u1EA0-\\u1EF9]+(?:\\s[a-zA-Z0-9_\\u00C0-\\u024F\\u1EA0-\\u1EF9]+)?))`,
      "gi"
    );
  }, [friends]);

  if (!text) return null;

  const elements: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Tạo thể hiện regex mới cho mỗi lần render để tránh lỗi mutable state trong hook
  const regex = new RegExp(pattern.source, pattern.flags);

  while ((match = regex.exec(text)) !== null) {
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
    // 2. Tag có định dạng chuẩn kèm ID: @[Name](userId)
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
    // 3. Tag trong ngoặc không có ID: @[Name]
    else if (match[4]) {
      const rawName = match[4].trim();
      const displayName = rawName.startsWith("@") ? rawName : `@${rawName}`;
      const targetId = friendMap.get(rawName.toLowerCase()) || encodeURIComponent(rawName);

      elements.push(
        <Box
          key={`bracket-${matchIndex}`}
          component={NextLink}
          href={`/profile/${targetId}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onMentionClick?.(rawName, targetId);
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
    // 4. Tag thông thường: @Tên bạn bè hoặc @Tên
    else {
      // Tên có thể nằm ở match[5] (tên bạn bè) hoặc match[6] (tên thông thường)
      const rawName = (match[5] || match[6] || fullMatch.slice(1)).trim();
      const displayName = `@${rawName.replace(/^@/, "")}`;
      const targetId = friendMap.get(rawName.toLowerCase()) || encodeURIComponent(rawName);

      elements.push(
        <Box
          key={`plain-${matchIndex}`}
          component={NextLink}
          href={`/profile/${targetId}`}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onMentionClick?.(rawName, targetId);
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

    lastIndex = matchIndex + fullMatch.length;
  }

  // Thêm phần còn lại của văn bản
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return <>{elements}</>;
}

export default MentionText;
