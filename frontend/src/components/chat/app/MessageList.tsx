"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Box, Skeleton, Typography } from "@mui/material";
import { Check, CheckCheck } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { ChatMessage, ChatUser } from "@/store/useChatStore";
import { dayKey, formatClockTime, formatDaySeparator } from "@/utils/formatTime";
import { isVideoUrl } from "@/services/postsApi";
import ImageLightbox from "../../posts/ImageLightbox";

const GROUP_GAP_MS = 5 * 60 * 1000;

interface MessageListProps {
  conversationId: string;
  messages: ChatMessage[];
  currentUserId?: string;
  partner: ChatUser | null;
  isLoading: boolean;
  isPartnerTyping: boolean;
}

type Row =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; msg: ChatMessage; isMe: boolean; isFirst: boolean; isLast: boolean };

const senderOf = (msg: ChatMessage) =>
  typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;

function buildRows(messages: ChatMessage[], currentUserId?: string): Row[] {
  const rows: Row[] = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sender = senderOf(msg);

    if (!prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt)) {
      rows.push({ type: "day", key: `day-${msg._id}`, label: formatDaySeparator(msg.createdAt) });
    }

    const continuesPrev =
      !!prev &&
      senderOf(prev) === sender &&
      dayKey(prev.createdAt) === dayKey(msg.createdAt) &&
      new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_GAP_MS;
    const continuesNext =
      !!next &&
      senderOf(next) === sender &&
      dayKey(next.createdAt) === dayKey(msg.createdAt) &&
      new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < GROUP_GAP_MS;

    rows.push({
      type: "msg",
      key: msg._id,
      msg,
      isMe: sender === currentUserId,
      isFirst: !continuesPrev,
      isLast: !continuesNext,
    });
  });
  return rows;
}

function MessagesSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Đang tải tin nhắn" sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1 }}>
      {[
        { w: "48%", me: false },
        { w: "36%", me: true },
        { w: "58%", me: false },
        { w: "30%", me: true },
      ].map((s, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={44}
          sx={{ width: s.w, alignSelf: s.me ? "flex-end" : "flex-start", borderRadius: 4 }}
        />
      ))}
    </Box>
  );
}

function TypingIndicator({ partner }: { partner: ChatUser | null }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, mt: 0.5 }}>
      <Avatar src={partner?.avatar} alt="" sx={{ width: 28, height: 28, fontSize: "0.8rem" }}>
        {partner?.name?.[0]?.toUpperCase()}
      </Avatar>
      <Box
        role="status"
        aria-label={`${partner?.name || "Đối phương"} đang soạn tin nhắn`}
        sx={{
          px: 1.75,
          py: 1.5,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "18px 18px 18px 6px",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            aria-hidden
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: "text.secondary",
              animation: `typingDot 1.2s infinite ${i * 0.15}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

export default function MessageList({
  conversationId,
  messages,
  currentUserId,
  partner,
  isLoading,
  isPartnerTyping,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastConversationRef = useRef<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const rows = useMemo(() => buildRows(messages, currentUserId), [messages, currentUserId]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  // Chỉ tự cuộn xuống khi: đổi hội thoại, người dùng đang ở gần cuối, hoặc chính mình vừa gửi.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const conversationChanged = lastConversationRef.current !== conversationId;
    const last = messages[messages.length - 1];
    const sentByMe = !!last && senderOf(last) === currentUserId;

    if (conversationChanged || stickToBottomRef.current || sentByMe) {
      el.scrollTo({ top: el.scrollHeight, behavior: conversationChanged ? "auto" : "smooth" });
      stickToBottomRef.current = true;
    }
    if (!isLoading) lastConversationRef.current = conversationId;
  }, [messages, conversationId, currentUserId, isPartnerTyping, isLoading]);

  return (
    <Box
      ref={containerRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Nội dung cuộc trò chuyện"
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        px: { xs: 1.5, sm: 3 },
        py: 2,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overscrollBehavior: "contain",
      }}
    >
      {isLoading && messages.length === 0 ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        <Box sx={{ my: "auto" }}>
          <EmptyState
            icon={<span style={{ fontSize: 28 }}>👋</span>}
            title="Chưa có tin nhắn nào"
            description={`Hãy gửi lời chào đầu tiên tới ${partner?.name || "bạn bè"}!`}
          />
        </Box>
      ) : (
        rows.map((row) => {
          if (row.type === "day") {
            return (
              <Box key={row.key} sx={{ display: "flex", justifyContent: "center", my: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    borderRadius: 999,
                    bgcolor: "action.focus",
                    color: "text.secondary",
                    fontWeight: 600,
                  }}
                >
                  {row.label}
                </Typography>
              </Box>
            );
          }

          const { msg, isMe, isFirst, isLast } = row;
          const radius = 18;
          const tail = 6;

          return (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 1,
                mt: isFirst ? 1.25 : 0.25,
                animation: "fadeInUp 160ms ease-out",
              }}
            >
              {!isMe && (
                <Box sx={{ width: 28, flexShrink: 0 }}>
                  {isLast && (
                    <Avatar src={partner?.avatar} alt="" sx={{ width: 28, height: 28, fontSize: "0.8rem" }}>
                      {partner?.name?.[0]?.toUpperCase()}
                    </Avatar>
                  )}
                </Box>
              )}

              <Box
                sx={{
                  maxWidth: { xs: "82%", sm: "70%", md: "60%" },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                }}
              >
                {(() => {
                  const trimmed = msg.text?.trim() || "";
                  const isMedia = /^https:\/\/res\.cloudinary\.com\//i.test(trimmed);
                  const isVideo = isMedia && isVideoUrl(trimmed);

                  if (isMedia) {
                    return (
                      <Box
                        sx={{
                          overflow: "hidden",
                          borderRadius: isMe
                            ? `${radius}px ${isFirst ? radius : tail}px ${tail}px ${radius}px`
                            : `${isFirst ? radius : tail}px ${radius}px ${radius}px ${tail}px`,
                          maxWidth: "100%",
                        }}
                      >
                        {isVideo ? (
                          <Box
                            component="video"
                            controls
                            preload="metadata"
                            src={trimmed}
                            sx={{
                              maxWidth: "100%",
                              maxHeight: 280,
                              display: "block",
                              bgcolor: "common.black",
                            }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={trimmed}
                            alt="Ảnh trong tin nhắn"
                            loading="lazy"
                            onClick={() => setLightboxUrl(trimmed)}
                            sx={{
                              maxWidth: "100%",
                              maxHeight: 280,
                              display: "block",
                              cursor: "pointer",
                              transition: "opacity 150ms",
                              "&:hover": { opacity: 0.9 },
                            }}
                          />
                        )}
                      </Box>
                    );
                  }

                  return (
                    <Box
                      sx={{
                        px: 1.75,
                        py: 1,
                        bgcolor: isMe ? "primary.main" : "background.paper",
                        color: isMe ? "primary.contrastText" : "text.primary",
                        border: isMe ? "none" : "1px solid",
                        borderColor: "divider",
                        // Góc phía người gửi nhỏ lại để các bubble liền nhau "dính" vào nhau; bubble cuối có đuôi.
                        borderRadius: isMe
                          ? `${radius}px ${isFirst ? radius : tail}px ${tail}px ${radius}px`
                          : `${isFirst ? radius : tail}px ${radius}px ${radius}px ${tail}px`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontSize: "0.9375rem", lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                      >
                        {msg.text}
                      </Typography>
                    </Box>
                  );
                })()}

                {isLast && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.4, px: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                      {formatClockTime(msg.createdAt)}
                    </Typography>
                    {isMe && (
                      <Box
                        component="span"
                        sx={{ display: "inline-flex", color: msg.readAt ? "primary.main" : "text.secondary" }}
                      >
                        {msg.readAt ? <CheckCheck size={14} aria-hidden /> : <Check size={14} aria-hidden />}
                        <Box component="span" sx={visuallyHidden}>
                          {msg.readAt ? "Đã xem" : "Đã gửi"}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })
      )}

      {isPartnerTyping && <TypingIndicator partner={partner} />}

      <ImageLightbox
        src={lightboxUrl}
        alt="Ảnh trong tin nhắn"
        onClose={() => setLightboxUrl(null)}
      />
    </Box>
  );
}

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
} as const;
