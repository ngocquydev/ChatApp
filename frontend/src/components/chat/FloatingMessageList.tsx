"use client";

import { memo, useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  Tooltip,
  IconButton,
  CircularProgress,
  Button,
  ButtonBase,
} from "@mui/material";
import { CheckCheck, Clock, Trash2, Sparkles } from "lucide-react";
import { isVideoUrl, isAudioUrl, isFileDocUrl } from "@/services/postsApi";
import FileAttachmentItem from "./FileAttachmentItem";
import InChatSafetyBanner from "./InChatSafetyBanner";
import MessageReactionsDisplay from "./MessageReactionsDisplay";
import AuraFeedbackButtons from "./AuraFeedbackButtons";
import AuraWelcomeCard from "./AuraWelcomeCard";
import CallMessageItem from "./call/CallMessageItem";
import LocationMessageItem from "./LocationMessageItem";
import MentionText from "@/components/common/MentionText";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { ChatMessage, ChatUser } from "@/store/useChatStore";
import { getChatTheme } from "./app/chatThemes";
import { AURA_BOT_ID } from "@/constants/auraBot";
import { useTranslation } from "@/i18n/useTranslation";
import type { ReactionType } from "@/components/reactions/reactionConstants";

function getBubbleRadius(isMe: boolean, isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) return "18px";
  if (isMe) {
    if (isFirst) return "18px 18px 4px 18px";
    if (isLast) return "18px 4px 18px 18px";
    return "18px 4px 4px 18px";
  }
  if (isFirst) return "18px 18px 18px 4px";
  if (isLast) return "4px 18px 18px 18px";
  return "4px 18px 18px 4px";
}

export interface FloatingMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isAuraChat: boolean;
  targetUser: ChatUser;
  targetUserId: string;
  currentUserId: string;
  isOnline: boolean;
  isPartnerTyping: boolean;
  partnerSeenAt: string | null;
  isRestricted: boolean;
  chatTheme: ReturnType<typeof getChatTheme>;
  convId?: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (text: string) => void;
  onReactMessage: (msgId: string, type: ReactionType) => void;
  onDeleteMessage: (msgId: string) => void;
  onOpenLightbox: (url: string) => void;
}

function FloatingMessageListComponent({
  messages,
  isLoading,
  isAuraChat,
  targetUser,
  targetUserId,
  currentUserId,
  isOnline,
  isPartnerTyping,
  partnerSeenAt,
  isRestricted,
  chatTheme,
  convId,
  messagesEndRef,
  onSendMessage,
  onReactMessage,
  onDeleteMessage,
  onOpenLightbox,
}: FloatingMessageListProps) {
  const { tr } = useTranslation();

  const isSenderMe = useCallback(
    (msg: ChatMessage) => {
      const sId =
        typeof msg.senderId === "string"
          ? msg.senderId
          : msg.senderId?._id || msg.senderId?.id;
      return String(sId) === currentUserId;
    },
    [currentUserId]
  );

  const formatTime = useCallback((isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, []);

  return (
    <Box
      role="log"
      aria-live="polite"
      aria-label={tr(`Tin nhắn với ${targetUser.name}`, `Messages with ${targetUser.name}`)}
      sx={{
        flex: 1,
        overflowY: "auto",
        px: 1.25,
        py: 1.5,
        background: chatTheme.background,
        display: "flex",
        flexDirection: "column",
        scrollbarWidth: "thin",
      }}
    >
      <InChatSafetyBanner
        messages={messages}
        currentUserId={currentUserId}
        conversationId={convId || undefined}
      />
      {isLoading ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 1.5,
            color: chatTheme.metaTextColor,
          }}
        >
          <CircularProgress size={24} />
          <Typography variant="caption">
            {tr("Đang tải tin nhắn…", "Loading messages…")}
          </Typography>
        </Box>
      ) : messages.length === 0 ? (
        isAuraChat ? (
          <AuraWelcomeCard onSelectPrompt={(prompt) => void onSendMessage(prompt)} />
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              px: 2,
              py: 3,
            }}
          >
            <PresenceAvatar
              name={targetUser.name}
              src={targetUser.avatar}
              online={isOnline}
              size={56}
            />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: chatTheme.isDarkTheme ? "common.white" : "text.primary",
                mt: 1.25,
              }}
            >
              {targetUser.name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: chatTheme.metaTextColor,
                mb: 2,
                display: "block",
                maxWidth: 200,
              }}
            >
              {tr(
                "Các bạn đã kết nối trên ChatApp. Hãy bắt đầu cuộc trò chuyện!",
                "You're connected on ChatApp. Start a conversation!"
              )}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => void onSendMessage(tr("👋 Chào bạn!", "👋 Hello!"))}
              sx={{
                borderRadius: "20px",
                px: 2,
                py: 0.6,
                fontSize: "0.82rem",
                fontWeight: 600,
                bgcolor: "background.paper",
              }}
            >
              {tr("👋 Nói xin chào!", "👋 Say hello!")}
            </Button>
          </Box>
        )
      ) : (
        messages.map((msg, index) => {
          const isMe = isSenderMe(msg);
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

          const curTime = new Date(msg.createdAt || 0).getTime();
          const prevTime = prevMsg ? new Date(prevMsg.createdAt || 0).getTime() : 0;
          const nextTime = nextMsg ? new Date(nextMsg.createdAt || 0).getTime() : 0;

          const showTimeDivider = !prevMsg || curTime - prevTime > 10 * 60 * 1000;
          const sameAsPrev =
            Boolean(prevMsg) &&
            isSenderMe(prevMsg!) === isMe &&
            curTime - prevTime <= 5 * 60 * 1000 &&
            !showTimeDivider;
          const sameAsNext =
            Boolean(nextMsg) &&
            isSenderMe(nextMsg!) === isMe &&
            nextTime - curTime <= 5 * 60 * 1000;

          const isFirstInGroup = !sameAsPrev;
          const isLastInGroup = !sameAsNext;
          const isLastMsg = index === messages.length - 1;
          const isSeen = Boolean(msg.readAt || partnerSeenAt);
          const trimmed = msg.text?.trim() || "";
          const isGiphy =
            !msg.isDeleted &&
            (/^https?:\/\/(media\d*\.giphy\.com|i\.giphy\.com)\//i.test(trimmed) ||
              /\.gif(\?.*)?$/i.test(trimmed));
          const isMedia =
            (!msg.isDeleted && /^https:\/\/res\.cloudinary\.com\//i.test(trimmed)) || isGiphy;
          const isVideo = isMedia && !isGiphy && isVideoUrl(trimmed);
          const isAudio = isMedia && !isGiphy && isAudioUrl(trimmed);
          const isFileDoc = isMedia && !isGiphy && isFileDocUrl(trimmed);
          const bubbleRadius = getBubbleRadius(isMe, isFirstInGroup, isLastInGroup);

          return (
            <Box
              key={msg._id || index}
              sx={{
                display: "flex",
                flexDirection: "column",
                mb: isLastInGroup ? 1 : 0.25,
              }}
            >
              {showTimeDivider && (
                <Typography
                  variant="caption"
                  sx={{
                    alignSelf: "center",
                    my: 1,
                    px: 1.25,
                    py: 0.2,
                    borderRadius: "999px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    color: chatTheme.dayPillColor,
                    bgcolor: chatTheme.dayPillBg,
                  }}
                >
                  {formatTime(msg.createdAt)}
                </Typography>
              )}

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  "&:hover .msg-delete-btn": { opacity: 1 },
                  "&:hover .msg-reaction-btn": { opacity: 1 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    maxWidth: "85%",
                    flexDirection: isMe ? "row-reverse" : "row",
                  }}
                >
                  {!isMe &&
                    (isLastInGroup ? (
                      <Avatar
                        src={targetUser.avatar || ""}
                        alt=""
                        sx={{
                          width: 26,
                          height: 26,
                          fontSize: "0.68rem",
                          bgcolor: "var(--mui-palette-brand-500)",
                          alignSelf: "flex-end",
                          flexShrink: 0,
                        }}
                      >
                        {(targetUser.name || "U")[0].toUpperCase()}
                      </Avatar>
                    ) : (
                      <Box sx={{ width: 26, flexShrink: 0 }} />
                    ))}

                  <Tooltip
                    title={formatTime(msg.createdAt)}
                    placement="top"
                    disableInteractive
                    enterDelay={500}
                  >
                    {msg.isDeleted ? (
                      <Box
                        sx={{
                          py: 0.85,
                          px: 1.4,
                          borderRadius: bubbleRadius,
                          bgcolor: chatTheme.isDarkTheme
                            ? "rgba(30, 41, 59, 0.55)"
                            : "action.hover",
                          color: chatTheme.metaTextColor,
                          fontSize: "0.82rem",
                          fontStyle: "italic",
                          border: "1px dashed",
                          borderColor: chatTheme.partnerBorder,
                          lineHeight: 1.38,
                        }}
                      >
                        {tr("Tin nhắn đã bị thu hồi", "Message unsent")}
                      </Box>
                    ) : msg.type === "call" ||
                      Boolean(msg.callLog) ||
                      /^(📞|📹)\s*Cuộc gọi/i.test(trimmed) ? (
                      <CallMessageItem
                        message={msg}
                        isMe={isMe}
                        partner={{
                          id: targetUserId,
                          name: targetUser.name,
                          avatar: targetUser.avatar,
                        }}
                        conversationId={convId || undefined}
                      />
                    ) : msg.type === "location" || Boolean(msg.location) ? (
                      <LocationMessageItem message={msg} isMe={isMe} />
                    ) : isMedia ? (
                      isFileDoc ? (
                        <FileAttachmentItem url={trimmed} isMe={isMe} />
                      ) : isAudio ? (
                        <Box
                          sx={{
                            p: 0.8,
                            borderRadius: bubbleRadius,
                            bgcolor: isMe
                              ? "rgba(255, 255, 255, 0.15)"
                              : "var(--mui-palette-background-paper)",
                            border: "1px solid",
                            borderColor: isMe
                              ? "rgba(255, 255, 255, 0.25)"
                              : "var(--mui-palette-divider)",
                            maxWidth: 210,
                          }}
                        >
                          <Box
                            component="audio"
                            controls
                            preload="metadata"
                            src={trimmed}
                            sx={{ width: "100%", height: 32, display: "block" }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            overflow: "hidden",
                            borderRadius: bubbleRadius,
                            maxWidth: 210,
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
                                maxHeight: 200,
                                display: "block",
                                bgcolor: "common.black",
                              }}
                            />
                          ) : (
                            <ButtonBase
                              onClick={() => onOpenLightbox(trimmed)}
                              aria-label={tr("Xem ảnh phóng to", "View full image")}
                              sx={{
                                display: "block",
                                textAlign: "inherit",
                                width: "100%",
                                borderRadius: bubbleRadius,
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <Box
                                component="img"
                                src={trimmed}
                                alt={tr("Ảnh đính kèm", "Attached image")}
                                loading="lazy"
                                sx={{
                                  maxWidth: "100%",
                                  maxHeight: 200,
                                  display: "block",
                                  objectFit: "cover",
                                  transition: "transform 0.2s ease",
                                  "&:hover": { transform: "scale(1.02)" },
                                }}
                              />
                              {isGiphy && (
                                <Box
                                  sx={{
                                    position: "absolute",
                                    bottom: 6,
                                    right: 6,
                                    bgcolor: "rgba(0, 0, 0, 0.7)",
                                    color: "common.white",
                                    px: 0.6,
                                    py: 0.15,
                                    borderRadius: "4px",
                                    fontSize: "0.62rem",
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
                      )
                    ) : (
                      <Box
                        sx={{
                          py: 0.85,
                          px: 1.4,
                          borderRadius: bubbleRadius,
                          background: isMe ? chatTheme.bubbleMe : chatTheme.bubblePartner,
                          color: isMe ? chatTheme.bubbleMeColor : chatTheme.bubblePartnerColor,
                          border: isMe ? "none" : "1px solid",
                          borderColor: isMe ? "transparent" : chatTheme.partnerBorder,
                          fontSize: "0.875rem",
                          lineHeight: 1.38,
                          wordBreak: "break-word",
                          opacity: msg.isOptimistic ? 0.75 : 1,
                          transition: "opacity 0.2s ease",
                        }}
                      >
                        {msg.senderId === "666666666666666666666666" && (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              mb: 0.5,
                              px: 0.7,
                              py: 0.15,
                              borderRadius: "999px",
                              bgcolor: "action.hover",
                              border: "1px solid",
                              borderColor: "divider",
                              color: "primary.main",
                            }}
                          >
                            <Sparkles size={11} />
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, fontSize: "0.65rem", lineHeight: 1 }}
                            >
                              Aura AI • RAG ⚡
                            </Typography>
                          </Box>
                        )}
                        <MentionText text={msg.text} />
                      </Box>
                    )}
                  </Tooltip>

                  {!msg.isDeleted && String(msg.senderId) === AURA_BOT_ID && (
                    <AuraFeedbackButtons messageId={String(msg._id || msg.id || "")} />
                  )}

                  {!msg.isDeleted && (
                    <Box
                      className="msg-reaction-btn"
                      sx={{
                        opacity: { xs: 0.7, sm: 0 },
                        transition: "opacity 0.15s ease",
                        flexShrink: 0,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onReactMessage(String(msg._id || msg.id || ""), "like");
                        }}
                        sx={{
                          p: 0.3,
                          color: chatTheme.metaTextColor,
                          "&:hover": { color: "primary.main", bgcolor: "action.hover" },
                        }}
                        aria-label={tr("Thích tin nhắn", "Like message")}
                      >
                        <Sparkles size={13} />
                      </IconButton>
                    </Box>
                  )}

                  {isMe && !msg.isDeleted && (
                    <Tooltip title={tr("Thu hồi tin nhắn", "Unsend message")} disableInteractive>
                      <IconButton
                        className="msg-delete-btn"
                        size="small"
                        onClick={() => onDeleteMessage(String(msg._id || msg.id || ""))}
                        sx={{
                          opacity: 0,
                          transition: "opacity 0.15s ease",
                          p: 0.4,
                          flexShrink: 0,
                          color: chatTheme.metaTextColor,
                          "&:hover": {
                            color: "error.main",
                            bgcolor: "action.hover",
                          },
                        }}
                        aria-label={tr("Thu hồi tin nhắn", "Unsend message")}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Hiển thị các cảm xúc đã thả */}
                <MessageReactionsDisplay
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  isMe={isMe}
                  onToggleReaction={(type) =>
                    void onReactMessage(String(msg._id || msg.id || ""), type)
                  }
                />

                {/* Trạng thái đã xem hoặc đang gửi */}
                {isMe && isLastMsg && !isRestricted && (
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.35, pr: 0.25 }}>
                    {msg.isOptimistic ? (
                      <Tooltip title={tr("Đang gửi…", "Sending…")}>
                        <Box sx={{ display: "inline-flex", opacity: 0.6 }}>
                          <Clock size={12} color={chatTheme.metaTextColor} />
                        </Box>
                      </Tooltip>
                    ) : isSeen ? (
                      <Tooltip
                        title={`${tr("Đã xem lúc", "Seen at")} ${formatTime(
                          partnerSeenAt || msg.readAt || msg.createdAt
                        )}`}
                      >
                        <Avatar
                          src={targetUser.avatar || ""}
                          alt={tr(
                            `Đã xem bởi ${targetUser.name}`,
                            `Seen by ${targetUser.name}`
                          )}
                          sx={{
                            width: 14,
                            height: 14,
                            fontSize: "0.5rem",
                            bgcolor: "var(--mui-palette-brand-500)",
                          }}
                        >
                          {(targetUser.name || "U")[0].toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ) : (
                      <Tooltip title={tr("Đã gửi", "Sent")}>
                        <CheckCheck size={12} color={chatTheme.metaTextColor} />
                      </Tooltip>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          );
        })
      )}

      {/* Bouncing Dots khi bạn bè đang soạn tin nhắn */}
      {isPartnerTyping && (
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.8, mt: 0.5 }}>
          <Avatar
            src={targetUser.avatar || ""}
            alt=""
            sx={{
              width: 22,
              height: 22,
              fontSize: "0.65rem",
              bgcolor: "var(--mui-palette-brand-500)",
            }}
          >
            {(targetUser.name || "U")[0].toUpperCase()}
          </Avatar>
          <Box
            role="status"
            aria-label={tr(
              `${targetUser.name} đang soạn tin nhắn`,
              `${targetUser.name} is typing`
            )}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.4,
              px: 1.4,
              py: 1,
              borderRadius: "18px 18px 18px 4px",
              background: chatTheme.bubblePartner,
              border: "1px solid",
              borderColor: chatTheme.partnerBorder,
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
                  bgcolor: chatTheme.metaTextColor,
                  animation: `typingDot 1.2s infinite ${i * 0.15}s`,
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      <div ref={messagesEndRef} />
    </Box>
  );
}

export const FloatingMessageList = memo(FloatingMessageListComponent);
export default FloatingMessageList;

