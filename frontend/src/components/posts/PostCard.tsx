"use client";

import { useState } from "react";
import { Box, Button, ButtonBase, Card, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { Heart, MessageCircle, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import { isSharedPostAvailable, type PostView } from "@/services/postsApi";
import { useTranslation } from "@/i18n/useTranslation";
import PostAuthorHeader from "./PostAuthorHeader";
import PostCommentSection from "./PostCommentSection";
import PostImages from "./PostImages";
import SharedPostEmbed from "./SharedPostEmbed";

const CONTENT_PREVIEW_CHARS = 420;

interface PostCardProps {
  post: PostView;
  currentUserId?: string;
  priority?: boolean;
  onToggleLike: (post: PostView) => void;
  onRequestEdit?: (post: PostView) => void;
  onRequestDelete: (post: PostView) => void;
  onRequestShare: (post: PostView) => void;
  onCommentCountChange: (postId: string, delta: number) => void;
  onOpenEngagers?: (postId: string, tab: "likes" | "commenters") => void;
}

/** Bài gốc mà thao tác chia sẻ sẽ trỏ tới (bài chia sẻ → bài gốc của nó). */
function shareTarget(post: PostView) {
  if (post.sharedPost) {
    if (!isSharedPostAvailable(post.sharedPost)) return null;
    return { authorId: post.sharedPost.author._id, privacy: post.sharedPost.privacy };
  }
  return { authorId: post.author._id, privacy: post.privacy };
}

export function canSharePost(post: PostView, currentUserId?: string): boolean {
  const target = shareTarget(post);
  if (!target) return false;
  return target.authorId === currentUserId || target.privacy === "public";
}

export default function PostCard({
  post,
  currentUserId,
  priority = false,
  onToggleLike,
  onRequestEdit,
  onRequestDelete,
  onRequestShare,
  onCommentCountChange,
  onOpenEngagers,
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { t } = useTranslation();

  const isOwn = post.author._id === currentUserId;
  const shareable = canSharePost(post, currentUserId);
  const long = post.content.length > CONTENT_PREVIEW_CHARS;
  const text = long && !expanded ? `${post.content.slice(0, CONTENT_PREVIEW_CHARS)}…` : post.content;

  return (
    <Card
      component="article"
      elevation={0}
      aria-label={`Bài viết của ${post.author.name}`}
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <PostAuthorHeader
          author={post.author}
          currentUserId={currentUserId}
          createdAt={post.createdAt}
          privacy={post.privacy}
          priority={priority}
          action={
            isOwn ? (
              <>
                <IconButton
                  size="small"
                  aria-label="Tùy chọn bài viết"
                  aria-haspopup="menu"
                  aria-expanded={!!menuAnchor}
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                >
                  <MoreHorizontal size={20} aria-hidden />
                </IconButton>
                <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onRequestEdit?.(post);
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                      <Pencil size={18} aria-hidden />
                    </ListItemIcon>
                    {t("common.edit")}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onRequestDelete(post);
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 32 }}>
                      <Trash2 size={18} aria-hidden />
                    </ListItemIcon>
                    {t("common.delete")}
                  </MenuItem>
                </Menu>
              </>
            ) : null
          }
        />

        {post.content && (
          <Typography variant="body1" sx={{ mt: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {text}
            {long && (
              <Button size="small" onClick={() => setExpanded((v) => !v)} sx={{ ml: 0.5, p: 0, minWidth: 0, fontWeight: 700 }}>
                {expanded ? t("common.seeLess") : t("common.seeMore")}
              </Button>
            )}
          </Typography>
        )}

        <SharedPostEmbed shared={post.sharedPost} currentUserId={currentUserId} />
      </Box>

      <PostImages images={post.images} altPrefix={post.author.name} priority={priority} />

      {(post.likeCount > 0 || post.commentCount > 0 || post.shareCount > 0) && (
        <Box
          sx={{
            px: 2,
            pt: 1.25,
            pb: 0.5,
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {post.likeCount > 0 && (
              <ButtonBase
                onClick={() => onOpenEngagers?.(post._id, "likes")}
                aria-label={`Xem danh sách ${post.likeCount} người thích bài viết`}
                sx={{
                  borderRadius: "6px",
                  p: 0.25,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    bgcolor: "error.main",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "common.white",
                  }}
                >
                  <Heart size={11} fill="currentColor" strokeWidth={0} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {post.likeCount}
                </Typography>
              </ButtonBase>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {post.commentCount > 0 && (
              <ButtonBase
                onClick={() => onOpenEngagers?.(post._id, "commenters")}
                aria-label={t("feed.commentsCount", { count: post.commentCount })}
                sx={{ borderRadius: "6px", p: 0.25, "&:hover": { textDecoration: "underline" } }}
              >
                <Typography variant="body2" color="text.secondary">
                  {t("feed.commentsCount", { count: post.commentCount })}
                </Typography>
              </ButtonBase>
            )}
            {post.shareCount > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("feed.sharesCount", { count: post.shareCount })}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          borderTop: "1px solid",
          borderColor: "divider",
          px: 1,
          py: 0.5,
          gap: 0.5,
        }}
      >
        <Button
          color="inherit"
          aria-pressed={post.likedByMe}
          onClick={() => onToggleLike(post)}
          startIcon={
            <Heart
              size={18}
              fill={post.likedByMe ? "currentColor" : "none"}
              color={post.likedByMe ? "currentColor" : undefined}
              aria-hidden
            />
          }
          sx={{
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            fontWeight: 600,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
            color: post.likedByMe ? "error.main" : "text.secondary",
            py: 0.8,
            px: { xs: 0.5, sm: 1.5 },
            borderRadius: "8px",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {t("feed.like")}
        </Button>
        <Button
          color="inherit"
          aria-expanded={showComments}
          onClick={() => setShowComments((v) => !v)}
          startIcon={<MessageCircle size={18} aria-hidden />}
          sx={{
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            fontWeight: 600,
            fontSize: { xs: "0.8125rem", sm: "0.875rem" },
            color: "text.secondary",
            py: 0.8,
            px: { xs: 0.5, sm: 1.5 },
            borderRadius: "8px",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {t("feed.comment")}
        </Button>
        <Tooltip title={shareable ? "" : (t("feed.privacyFriends"))}>
          <Box component="span" sx={{ flex: 1, minWidth: 0, display: "flex" }}>
            <Button
              fullWidth
              color="inherit"
              disabled={!shareable}
              onClick={() => onRequestShare(post)}
              startIcon={<Share2 size={18} aria-hidden />}
              sx={{
                width: "100%",
                minWidth: 0,
                whiteSpace: "nowrap",
                fontWeight: 600,
                fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                color: "text.secondary",
                py: 0.8,
                px: { xs: 0.5, sm: 1.5 },
                borderRadius: "8px",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {t("common.share")}
            </Button>
          </Box>
        </Tooltip>
      </Box>

      {showComments && (
        <Box sx={{ px: 2, pb: 2, pt: 1 }}>
          <PostCommentSection
            postId={post._id}
            postAuthorId={post.author._id}
            currentUserId={currentUserId}
            onCountChange={(delta) => onCommentCountChange(post._id, delta)}
          />
        </Box>
      )}
      {!showComments && <Box sx={{ pb: 1 }} />}
    </Card>
  );
}
