"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Box, ButtonBase, IconButton, Skeleton, Tooltip, Typography } from "@mui/material";
import { Check, Clock, Sparkles, Trash2 } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MentionText from "@/components/common/MentionText";
import { useTranslation } from "@/i18n/useTranslation";
import { ChatMessage, ChatUser } from "@/store/useChatStore";
import { dayKey, formatClockTime, formatDaySeparator } from "@/utils/formatTime";
import { isVideoUrl, isAudioUrl, isFileDocUrl } from "@/services/postsApi";
import FileAttachmentItem from "../FileAttachmentItem";
import ImageLightbox from "../../posts/ImageLightbox";
import { getChatTheme } from "./chatThemes";
import CallMessageItem from "../call/CallMessageItem";
import LocationMessageItem from "../LocationMessageItem";
import InChatSafetyBanner from "../InChatSafetyBanner";
import InlineReactionButton from "@/components/reactions/InlineReactionButton";
import type { ReactionType } from "@/components/reactions/reactionConstants";
import MessageReactionsDisplay from "../MessageReactionsDisplay";
import AuraFeedbackButtons from "../AuraFeedbackButtons";
import AuraWelcomeCard from "../AuraWelcomeCard";
import { AURA_BOT_ID, isAuraBot } from "@/constants/auraBot";

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
  onReactMessage?: (messageId: string, type: ReactionType) => void;
  onSendPrompt?: (text: string) => void;
}

type Row =
  | { type: "day"; key: string; label: string }
  | { type: "msg"; key: string; msg: ChatMessage; isMe: boolean; isFirst: boolean; isLast: boolean; isLatest: boolean };

const senderOf = (msg: ChatMessage) =>
  typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;

function buildRows(messages: ChatMessage[], currentUserId?: string, _lang?: string): Row[] {
  void _lang;
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
  const { tr } = useTranslation();
  return (
    <Box aria-busy="true" aria-label={tr("Đang tải tin nhắn", "Loading messages")} sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1 }}>
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
  const { tr } = useTranslation();
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, mt: 0.5 }}>
      <Avatar src={partner?.avatar} alt="" sx={{ width: 28, height: 28, fontSize: "0.8rem" }}>
        {partner?.name?.[0]?.toUpperCase()}
      </Avatar>
      <Box
        role="status"
        aria-label={tr(`${partner?.name || "Đối phương"} đang soạn tin nhắn`, `${partner?.name || "User"} is typing`)}
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
  onReactMessage,
  onSendPrompt,
}: MessageListProps) {
  const { tr, language } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const lastConversationRef = useRef<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const themeConfig = useMemo(() => getChatTheme(theme), [theme]);
  const rows = useMemo(() => buildRows(messages, currentUserId, language), [messages, currentUserId, language]);

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
      aria-label={tr("Nội dung cuộc trò chuyện", "Conversation messages")}
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
      <InChatSafetyBanner messages={messages} currentUserId={currentUserId} conversationId={conversationId} />
      {isLoading && messages.length === 0 ? (
        <MessagesSkeleton />
      ) : messages.length === 0 ? (
        isAuraBot(partner?._id || partner?.id) ? (
          <AuraWelcomeCard onSelectPrompt={(p) => onSendPrompt?.(p)} />
        ) : (
          <Box sx={{ my: "auto" }}>
            <EmptyState
              icon={<span style={{ fontSize: 28 }}>👋</span>}
              title={tr("Chưa có tin nhắn nào", "No messages yet")}
              description={tr(
                `Hãy gửi lời chào đầu tiên tới ${partner?.name || "bạn bè"}!`,
                `Send the first greeting to ${partner?.name || "your friend"}!`
              )}
            />
          </Box>
        )
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
                  <Tooltip
                    title={formatClockTime(msg.createdAt)}
                    placement="top"
                    disableInteractive
                    enterDelay={500}
                  >
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
                              {tr("Tin nhắn đã bị thu hồi", "Message unsent")}
                            </Typography>
                          </Box>
                        );
                      }

                      const trimmed = msg.text?.trim() || "";
                      const isCall = msg.type === "call" || Boolean(msg.callLog) || /^(📞|📹)\s*Cuộc gọi/i.test(trimmed);

                      if (isCall) {
                        return (
                          <CallMessageItem
                            message={msg}
                            isMe={isMe}
                            partner={
                              partner
                                ? {
                                    id: String(partner._id || partner.id || ""),
                                    name: partner.name,
                                    avatar: partner.avatar,
                                  }
                                : null
                            }
                            conversationId={conversationId}
                          />
                        );
                      }

                      const isLocation = msg.type === "location" || Boolean(msg.location);

                      if (isLocation) {
                        return <LocationMessageItem message={msg} isMe={isMe} />;
                      }

                      const isGiphy =
                        /^https?:\/\/(media\d*\.giphy\.com|i\.giphy\.com)\//i.test(trimmed) ||
                        /\.gif(\?.*)?$/i.test(trimmed);
                      const isMedia = /^https:\/\/res\.cloudinary\.com\//i.test(trimmed) || isGiphy;
                      const isVideo = isMedia && !isGiphy && isVideoUrl(trimmed);
                      const isAudio = isMedia && !isGiphy && isAudioUrl(trimmed);
                      const isFileDoc = isMedia && !isGiphy && isFileDocUrl(trimmed);

                      if (isMedia) {
                        if (isFileDoc) {
                          return <FileAttachmentItem url={trimmed} isMe={isMe} />;
                        }

                        if (isAudio) {
                          return (
                            <Box
                              sx={{
                                p: 1,
                                borderRadius: bubbleRadius,
                                bgcolor: isMe ? "rgba(255, 255, 255, 0.15)" : "var(--mui-palette-background-paper)",
                                border: "1px solid",
                                borderColor: isMe ? "rgba(255, 255, 255, 0.25)" : "var(--mui-palette-divider)",
                                maxWidth: 290,
                              }}
                            >
                              <Box
                                component="audio"
                                controls
                                preload="metadata"
                                src={trimmed}
                                sx={{ width: "100%", height: 36, display: "block" }}
                              />
                            </Box>
                          );
                        }

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
                                aria-label={tr("Phóng to ảnh trong tin nhắn", "Zoom message image")}
                                sx={{ display: "block", width: "100%", position: "relative" }}
                              >
                                <Box
                                  component="img"
                                  src={trimmed}
                                  alt={tr("Ảnh trong tin nhắn", "Message image")}
                                  loading="lazy"
                                  sx={{
                                    maxWidth: "100%",
                                    maxHeight: 280,
                                    display: "block",
                                    transition: "opacity 150ms",
                                    "&:hover": { opacity: 0.9 },
                                  }}
                                />
                                {isGiphy && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      bottom: 8,
                                      left: 8,
                                      bgcolor: "rgba(0, 0, 0, 0.65)",
                                      color: "common.white",
                                      px: 0.7,
                                      py: 0.2,
                                      borderRadius: "4px",
                                      fontSize: "0.65rem",
                                      fontWeight: 800,
                                      letterSpacing: 0.5,
                                      pointerEvents: "none",
                                    }}
                                  >
                                    GIF
                                  </Box>
                                )}
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
                            opacity: msg.isOptimistic ? 0.75 : 1,
                            transition: "opacity 0.2s ease",
                          }}
                        >
                          {senderOf(msg) === "666666666666666666666666" && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                mb: 0.5,
                                px: 0.75,
                                py: 0.2,
                                borderRadius: "999px",
                                bgcolor: "action.hover",
                                border: "1px solid",
                                borderColor: "divider",
                                color: "primary.main",
                              }}
                            >
                              <Sparkles size={11} />
                              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.68rem", lineHeight: 1 }}>
                                Aura AI • RAG ⚡
                              </Typography>
                            </Box>
                          )}
                          <Typography
                            component="div"
                            variant="body2"
                            sx={{ fontSize: "0.9375rem", lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                          >
                            <MentionText text={msg.text} />
                            {msg.isStreaming && (
                              <Box
                                component="span"
                                sx={{
                                  display: "inline-block",
                                  width: "7px",
                                  height: "15px",
                                  bgcolor: "primary.main",
                                  ml: 0.5,
                                  verticalAlign: "middle",
                                  borderRadius: "1px",
                                  animation: "auraBlink 0.8s infinite ease-in-out",
                                  "@keyframes auraBlink": {
                                    "0%, 100%": { opacity: 1 },
                                    "50%": { opacity: 0.2 },
                                  },
                                }}
                              />
                            )}
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Tooltip>

                  {!msg.isDeleted && !msg.isStreaming && senderOf(msg) === AURA_BOT_ID && (
                    <AuraFeedbackButtons messageId={msg._id} />
                  )}

                  {/* Nút thả cảm xúc (Reaction) */}
                  {!msg.isDeleted && !msg.isStreaming && Boolean(onReactMessage) && (
                    <Box
                      className="msg-action-btn"
                      sx={{
                        opacity: { xs: 0.7, sm: 0 },
                        transition: "opacity 0.15s ease",
                        flexShrink: 0,
                      }}
                    >
                      <InlineReactionButton
                        variant="icon"
                        pickerPlacement="top"
                        pickerAlign={isMe ? "right" : "left"}
                        onReact={(type) => onReactMessage?.(msg._id, type)}
                      />
                    </Box>
                  )}

                  {/* Nút thu hồi tin nhắn cho tin nhắn của chính mình */}
                  {isMe && !msg.isDeleted && Boolean(onDeleteMessage) && (
                    <Tooltip title={tr("Thu hồi tin nhắn", "Unsend message")} disableInteractive>
                      <IconButton
                        size="small"
                        className="msg-action-btn"
                        onClick={() => setMessageToDelete(msg._id)}
                        aria-label={tr("Thu hồi tin nhắn", "Unsend message")}
                        sx={{
                          opacity: { xs: 0.7, sm: 0 },
                          transition: "opacity 0.15s ease",
                          flexShrink: 0,
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

                {/* Hiển thị các cảm xúc đã thả */}
                <MessageReactionsDisplay
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  isMe={isMe}
                  onToggleReaction={(type) => onReactMessage?.(msg._id, type)}
                />

                {isMe && isLatest && !msg.isDeleted && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.4, px: 0.25 }}>
                    {msg.isOptimistic ? (
                      <Tooltip title={tr("Đang gửi…", "Sending…")}>
                        <Box
                          component="span"
                          sx={{ display: "inline-flex", color: themeConfig.metaTextColor, opacity: 0.7 }}
                        >
                          <Clock size={13} aria-hidden />
                          <Box component="span" sx={visuallyHidden}>
                            {tr("Đang gửi…", "Sending…")}
                          </Box>
                        </Box>
                      </Tooltip>
                    ) : msg.readAt ? (
                      <Tooltip title={`${tr("Đã xem lúc", "Seen at")} ${formatClockTime(msg.readAt)}`}>
                        <Avatar
                          src={partner?.avatar}
                          alt={tr(`Đã xem bởi ${partner?.name || "đối phương"}`, `Seen by ${partner?.name || "partner"}`)}
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
                          {tr("Đã gửi", "Sent")}
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
        alt={tr("Ảnh trong tin nhắn", "Message image")}
        onClose={() => setLightboxUrl(null)}
      />

      {/* Xác nhận Thu Hồi Tin Nhắn */}
      <ConfirmDialog
        open={Boolean(messageToDelete)}
        title={tr("Thu hồi tin nhắn?", "Unsend message?")}
        description={tr(
          "Tin nhắn này sẽ bị thu hồi với tất cả mọi người trong cuộc trò chuyện.",
          "This message will be unsent for everyone in the conversation."
        )}
        confirmLabel={tr("Thu hồi", "Unsend")}
        cancelLabel={tr("Hủy", "Cancel")}
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
