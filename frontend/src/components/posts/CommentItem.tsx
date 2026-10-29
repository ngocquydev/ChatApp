"use client";

import { useState } from "react";
import { Box, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import ImageLightbox from "@/components/posts/ImageLightbox";
import { isVideoUrl, mediaUrl, type CommentView } from "@/services/postsApi";
import { formatFullDateTime, formatRelativeTime } from "@/utils/formatTime";
import PostAuthorHeader from "./PostAuthorHeader";

interface CommentItemProps {
  comment: CommentView;
  currentUserId?: string;
  canDelete: boolean;
  onDelete: (comment: CommentView) => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  canDelete,
  onDelete,
}: CommentItemProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const hasMedia = Boolean(comment.mediaUrl);
  const isVideo = hasMedia && (comment.mediaType === "video" || isVideoUrl(comment.mediaUrl));
  const fullMediaUrl = comment.mediaUrl ? mediaUrl(comment.mediaUrl) : "";

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
                  aria-label="Phóng to ảnh bình luận"
                  sx={{ display: "block", borderRadius: "10px", overflow: "hidden" }}
                >
                  <Box
                    component="img"
                    src={fullMediaUrl}
                    alt="Ảnh trong bình luận"
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
                </ButtonBase>
              )}
            </Box>
          )}
        </Box>

        <Tooltip title={formatFullDateTime(comment.createdAt)}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 1.5, mt: 0.25 }}>
            {formatRelativeTime(comment.createdAt)}
          </Typography>
        </Tooltip>
      </Box>

      {canDelete && (
        <IconButton
          size="small"
          aria-label={`Xóa bình luận của ${comment.author.name}`}
          onClick={() => onDelete(comment)}
          sx={{ mt: 0.5, color: "text.secondary", "&:hover": { color: "error.main" } }}
        >
          <Trash2 size={16} aria-hidden />
        </IconButton>
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox}
          alt="Ảnh trong bình luận"
          onClose={() => setLightbox(null)}
        />
      )}
    </Box>
  );
}

