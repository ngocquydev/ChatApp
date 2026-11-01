"use client";

import { useState } from "react";
import { Box, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import ImageLightbox from "@/components/posts/ImageLightbox";
import { useTranslation } from "@/i18n/useTranslation";
import { isVideoUrl, mediaUrl, type CommentView, type ReactionType } from "@/services/postsApi";
import { formatFullDateTime, formatRelativeTime } from "@/utils/formatTime";
import InlineReactionButton from "@/components/reactions/InlineReactionButton";
import ReactionSummary from "@/components/reactions/ReactionSummary";
import PostAuthorHeader from "./PostAuthorHeader";

interface CommentItemProps {
  comment: CommentView;
  currentUserId?: string;
  canDelete: boolean;
  onDelete: (comment: CommentView) => void;
  onToggleReaction?: (comment: CommentView, type?: ReactionType) => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  canDelete,
  onDelete,
  onToggleReaction,
}: CommentItemProps) {
  const { tr } = useTranslation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const hasMedia = Boolean(comment.mediaUrl);
  const isVideo = hasMedia && (comment.mediaType === "video" || isVideoUrl(comment.mediaUrl));
  const fullMediaUrl = comment.mediaUrl ? mediaUrl(comment.mediaUrl) : "";
  const isGif = Boolean(fullMediaUrl) && (/\.gif(\?.*)?$/i.test(fullMediaUrl) || /giphy\.com/i.test(fullMediaUrl));

  return (
    <Box component="li" sx={{ display: "flex", gap: 1, alignItems: "flex-start", listStyle: "none" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ bgcolor: "action.hover", borderRadius: "14px", px: 1.5, py: 1, display: "inline-block", maxWidth: "100%" }}>
          <PostAuthorHeader author={comment.author} currentUserId={currentUserId} size={28} />

          {comment.content && (
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.45 }}>
              {comment.content}
            </Typography>
          )}

          {hasMedia && (
            <Box sx={{ mt: 0.75 }}>
              {isVideo ? (
                <Box
                  component="video"
                  controls
                  preload="metadata"
                  src={fullMediaUrl}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 220,
                    borderRadius: "10px",
                    display: "block",
                    bgcolor: "common.black",
                  }}
                />
              ) : (
                <ButtonBase
                  onClick={() => setLightbox(fullMediaUrl)}
                  aria-label={tr("Phóng to ảnh bình luận", "Zoom comment image")}
                  sx={{ display: "block", borderRadius: "10px", overflow: "hidden", position: "relative" }}
                >
                  <Box
                    component="img"
                    src={fullMediaUrl}
                    alt={tr("Ảnh trong bình luận", "Image in comment")}
                    loading="lazy"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: "10px",
                      display: "block",
                      objectFit: "cover",
                      "&:hover": { opacity: 0.92 },
                    }}
                  />
                  {isGif && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 6,
                        left: 6,
                        bgcolor: "rgba(0, 0, 0, 0.65)",
                        color: "common.white",
                        px: 0.6,
                        py: 0.15,
                        borderRadius: "4px",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        pointerEvents: "none",
                        zIndex: 2,
                      }}
                    >
                      GIF
                    </Box>
                  )}
                </ButtonBase>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 1.5, mt: 0.25 }}>
          {onToggleReaction && (
            <InlineReactionButton
              myReaction={comment.myReaction}
              onReact={(type) => onToggleReaction(comment, type)}
              onToggleDefault={() => onToggleReaction(comment)}
            />
          )}

          <Tooltip title={formatFullDateTime(comment.createdAt)}>
            <Typography variant="caption" color="text.secondary">
              {formatRelativeTime(comment.createdAt)}
            </Typography>
          </Tooltip>

          {(comment.likeCount ?? 0) > 0 && (
            <ReactionSummary
              size="small"
              totalCount={comment.likeCount ?? 0}
              reactionsCount={comment.reactionsCount}
            />
          )}
        </Box>
      </Box>

      {canDelete && (
        <IconButton
          size="small"
          aria-label={tr(`Xóa bình luận của ${comment.author.name}`, `Delete comment by ${comment.author.name}`)}
          onClick={() => onDelete(comment)}
          sx={{ mt: 0.5, color: "text.secondary", "&:hover": { color: "error.main" } }}
        >
          <Trash2 size={16} aria-hidden />
        </IconButton>
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox}
          alt={tr("Ảnh trong bình luận", "Image in comment")}
          onClose={() => setLightbox(null)}
        />
      )}
    </Box>
  );
}

