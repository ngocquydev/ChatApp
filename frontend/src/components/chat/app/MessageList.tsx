"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Box, ButtonBase, IconButton, Skeleton, Tooltip, Typography } from "@mui/material";
import { Check, Trash2 } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ChatMessage, ChatUser } from "@/store/useChatStore";
import { dayKey, formatClockTime, formatDaySeparator } from "@/utils/formatTime";
import { isVideoUrl } from "@/services/postsApi";
import ImageLightbox from "../../posts/ImageLightbox";
import { getChatTheme } from "./chatThemes";

const GROUP_GAP_MS = 5 * 60 * 1000;

interface MessageListProps {
  conversationId: string;
  messages: ChatMessage[];
  currentUserId?: string;
  partner: ChatUser | null;
  isLoading: boolean;
  isPartnerTyping: boolean;
  theme?: string;
  onDeleteMessage?: (messageId: string) => Promise<void> | void;
}

type Row =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; msg: ChatMessage; isMe: boolean; isFirst: boolean; isLast: boolean; isLatest: boolean };

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
      isLatest: i === messages.length - 1,
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
  theme = "default",
  onDeleteMessage,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastConversationRef = useRef<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const themeConfig = useMemo(() => getChatTheme(theme), [theme]);
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
        background: themeConfig.background,
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
                    py: 0.35,
                    borderRadius: 999,
                    bgcolor: themeConfig.dayPillBg,
                    color: themeConfig.dayPillColor,
                    fontWeight: 600,
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {row.label}
                </Typography>
              </Box>
            );
          }

          const { msg, isMe, isFirst, isLast, isLatest } = row;
          const radius = 18;
          const tail = 4;
          const bubbleRadius =
            isFirst && isLast
              ? `${radius}px`
              : isMe
                ? `${radius}px ${isFirst ? radius : tail}px ${isLast ? radius : tail}px ${radius}px`
                : `${isFirst ? radius : tail}px ${radius}px ${radius}px ${isLast ? radius : tail}px`;

          return (
            <Box
              key={row.key}
              className="message-row"
              sx={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 1,
                mt: isFirst ? 1.15 : 0.25,
                animation: "fadeInUp 160ms ease-out",
                "&:hover .msg-action-btn": { opacity: 1 },
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
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexDirection: isMe ? "row-reverse" : "row",
                  }}
                >
                  <Tooltip title={formatClockTime(msg.createdAt)} placement={isMe ? "left" : "right"} enterDelay={400}>
                    {(() => {
                      if (msg.isDeleted) {
                        return (
                          <Box
                            sx={{
                              px: 1.75,
                              py: 0.75,
                              bgcolor: themeConfig.isDarkTheme ? "rgba(30, 41, 59, 0.55)" : "action.hover",
                              color: themeConfig.metaTextColor,
                              border: "1px dashed",
                              borderColor: themeConfig.partnerBorder,
                              borderRadius: bubbleRadius,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.875rem", fontStyle: "italic", lineHeight: 1.4 }}
                            >
                              Tin nhắn đã bị thu hồi
                            </Typography>
                          </Box>
                        );
                      }

                      const trimmed = msg.text?.trim() || "";
                      const isMedia = /^https:\/\/res\.cloudinary\.com\//i.test(trimmed);
                      const isVideo = isMedia && isVideoUrl(trimmed);

                      if (isMedia) {
                        return (
                          <Box
                            sx={{
                              overflow: "hidden",
                              borderRadius: bubbleRadius,
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
                              <ButtonBase
                                onClick={() => setLightboxUrl(trimmed)}
                                aria-label="Phóng to ảnh trong tin nhắn"
                                sx={{ display: "block", width: "100%" }}
                              >
                                <Box
                                  component="img"
                                  src={trimmed}
                                  alt="Ảnh trong tin nhắn"
                                  loading="lazy"
                                  sx={{
                                    maxWidth: "100%",
                                    maxHeight: 280,
                                    display: "block",
                                    transition: "opacity 150ms",
                                    "&:hover": { opacity: 0.9 },
                                  }}
                                />
                              </ButtonBase>
                            )}
                          </Box>
                        );
                      }

                      return (
                        <Box
                          sx={{
                            px: 1.65,
                            py: 0.9,
                            background: isMe ? themeConfig.bubbleMe : themeConfig.bubblePartner,
                            color: isMe ? themeConfig.bubbleMeColor : themeConfig.bubblePartnerColor,
                            border: isMe ? "none" : "1px solid",
                            borderColor: isMe ? "transparent" : themeConfig.partnerBorder,
                            borderRadius: bubbleRadius,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.9375rem", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                          >
                            {msg.text}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Tooltip>

                  {/* Nút thu hồi tin nhắn cho tin nhắn của chính mình */}
                  {isMe && !msg.isDeleted && Boolean(onDeleteMessage) && (
                    <Tooltip title="Thu hồi tin nhắn">
                      <IconButton
                        size="small"
                        className="msg-action-btn"
                        onClick={() => setMessageToDelete(msg._id)}
                        aria-label="Thu hồi tin nhắn"
                        sx={{
                          opacity: { xs: 0.7, sm: 0 },
                          transition: "opacity 0.15s ease",
                          color: themeConfig.metaTextColor,
                          p: 0.5,
                          "&:hover": { color: "error.main", bgcolor: "action.hover" },
                        }}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {isMe && isLatest && !msg.isDeleted && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.4, px: 0.25 }}>
                    {msg.readAt ? (
                      <Tooltip title={`Đã xem lúc ${formatClockTime(msg.readAt)}`}>
                        <Avatar
                          src={partner?.avatar}
                          alt={`Đã xem bởi ${partner?.name || "đối phương"}`}
                          sx={{ width: 15, height: 15, fontSize: "0.55rem" }}
                        >
                          {partner?.name?.[0]?.toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ) : (
                      <Box
                        component="span"
                        sx={{ display: "inline-flex", color: themeConfig.metaTextColor }}
                      >
                        <Check size={14} aria-hidden />
                        <Box component="span" sx={visuallyHidden}>
                          Đã gửi
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

      {/* Xác nhận Thu Hồi Tin Nhắn */}
      <ConfirmDialog
        open={Boolean(messageToDelete)}
        title="Thu hồi tin nhắn?"
        description="Tin nhắn này sẽ bị thu hồi với tất cả mọi người trong cuộc trò chuyện."
        confirmLabel="Thu hồi"
        cancelLabel="Hủy"
        pending={isDeleting}
        onClose={() => setMessageToDelete(null)}
        onConfirm={async () => {
          if (!messageToDelete || !onDeleteMessage) return;
          setIsDeleting(true);
          try {
            await onDeleteMessage(messageToDelete);
            setMessageToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
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
