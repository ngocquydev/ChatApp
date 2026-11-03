"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { usePostModalStore } from "@/store/usePostModalStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/i18n/useTranslation";
import {
  apiErrorMessage,
  deletePost,
  fetchPost,
  isSharedPostAvailable,
  toggleLike,
  type PostView,
  type ReactionType,
} from "@/services/postsApi";
import PostCard from "./PostCard";
import SharePostDialog from "./SharePostDialog";
import EditPostDialog from "./EditPostDialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import PostEngagersDialog, { type EngagerTab } from "./PostEngagersDialog";

export default function PostDetailModal() {
  const { postId, closePostModal } = usePostModalStore();
  const { user } = useAuthStore();
  const { tr, t } = useTranslation();
  const currentUserId = (user?._id || user?.id) as string | undefined;

  const [post, setPost] = useState<PostView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<PostView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toShare, setToShare] = useState<PostView | null>(null);
  const [toEdit, setToEdit] = useState<PostView | null>(null);
  const [engagersModal, setEngagersModal] = useState<{ postId: string; initialTab: EngagerTab } | null>(null);

  const loadCurrentPost = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPost(id);
      setPost(data);
    } catch (err) {
      setError(apiErrorMessage(err, tr("Không thể tải bài viết này hoặc bài viết đã bị xóa.", "Could not load this post or it has been deleted.")));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    if (postId) {
      void loadCurrentPost(postId);
    } else {
      setPost(null);
      setError(null);
    }
  }, [postId, loadCurrentPost]);

  // Lắng nghe socket realtime để cập nhật trực tiếp trong modal
  useEffect(() => {
    if (!postId) return;

    const handleReaction = (event: Event) => {
      const data = (event as CustomEvent<{
        postId: string;
        likeCount: number;
        reactionsCount?: Record<string, number>;
        userId: string;
        reactionType?: ReactionType | null;
        liked: boolean;
      }>).detail;
      if (data?.postId === postId) {
        setPost((prev) => {
          if (!prev) return prev;
          const isMe = currentUserId && data.userId === currentUserId;
          return {
            ...prev,
            likeCount: data.likeCount,
            reactionsCount: data.reactionsCount as Record<ReactionType, number> | undefined,
            ...(isMe ? { likedByMe: data.liked, myReaction: data.reactionType ?? null } : {}),
          };
        });
      }
    };

    const handleComment = (event: Event) => {
      const data = (event as CustomEvent<{ postId: string; commentCount: number }>).detail;
      if (data?.postId === postId && typeof data.commentCount === "number") {
        setPost((prev) => (prev ? { ...prev, commentCount: data.commentCount } : prev));
      }
    };

    const handleUpdated = (event: Event) => {
      const updated = (event as CustomEvent<PostView>).detail;
      if (updated?._id === postId) {
        setPost((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    };

    const handleDeleted = (event: Event) => {
      const data = (event as CustomEvent<{ postId: string }>).detail;
      if (data?.postId === postId) {
        setError(tr("Bài viết này đã bị xóa bởi tác giả.", "This post was deleted by the author."));
        setPost(null);
      }
    };

    const handleShareCount = (event: Event) => {
      const data = (event as CustomEvent<{ postId: string; shareCount: number }>).detail;
      if (data?.postId === postId && typeof data.shareCount === "number") {
        setPost((prev) => (prev ? { ...prev, shareCount: data.shareCount } : prev));
      }
    };

    window.addEventListener("chatapp:post_reaction", handleReaction);
    window.addEventListener("chatapp:post_comment", handleComment);
    window.addEventListener("chatapp:post_comment_deleted", handleComment);
    window.addEventListener("chatapp:post_updated", handleUpdated);
    window.addEventListener("chatapp:post_deleted", handleDeleted);
    window.addEventListener("chatapp:post_share_count_updated", handleShareCount);

    return () => {
      window.removeEventListener("chatapp:post_reaction", handleReaction);
      window.removeEventListener("chatapp:post_comment", handleComment);
      window.removeEventListener("chatapp:post_comment_deleted", handleComment);
      window.removeEventListener("chatapp:post_updated", handleUpdated);
      window.removeEventListener("chatapp:post_deleted", handleDeleted);
      window.removeEventListener("chatapp:post_share_count_updated", handleShareCount);
    };
  }, [postId, currentUserId, tr]);

  const handleToggleLike = async (p: PostView, reactionType?: ReactionType) => {
    const targetType = reactionType ?? (p.myReaction ? p.myReaction : "like");
    const isUnreact = Boolean(p.likedByMe && (!reactionType || p.myReaction === reactionType));
    const nextReaction = isUnreact ? null : targetType;
    const nextLiked = !isUnreact;

    // Optimistic update
    setPost((prev) => {
      if (!prev) return prev;
      const nextReactionsCount: Record<string, number> = { ...(prev.reactionsCount || {}) };
      if (isUnreact) {
        if (prev.myReaction && nextReactionsCount[prev.myReaction]) {
          nextReactionsCount[prev.myReaction] = Math.max(0, nextReactionsCount[prev.myReaction] - 1);
        }
      } else {
        if (prev.myReaction && nextReactionsCount[prev.myReaction]) {
          nextReactionsCount[prev.myReaction] = Math.max(0, nextReactionsCount[prev.myReaction] - 1);
        }
        nextReactionsCount[targetType] = (nextReactionsCount[targetType] || 0) + 1;
      }
      return {
        ...prev,
        likedByMe: nextLiked,
        myReaction: nextReaction,
        likeCount: Math.max(0, prev.likeCount + (nextLiked && !prev.likedByMe ? 1 : !nextLiked && prev.likedByMe ? -1 : 0)),
        reactionsCount: nextReactionsCount as Record<ReactionType, number>,
      };
    });

    try {
      const result = await toggleLike(p._id, reactionType);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: result.liked,
              myReaction: result.myReaction,
              likeCount: result.likeCount,
              reactionsCount: result.reactionsCount as Record<ReactionType, number> | undefined,
            }
          : prev,
      );
    } catch {
      // Revert if error
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likedByMe: p.likedByMe,
              myReaction: p.myReaction,
              likeCount: p.likeCount,
              reactionsCount: p.reactionsCount,
            }
          : prev,
      );
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePost(toDelete._id);
      closePostModal();
    } catch {
      // Bỏ qua lỗi
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const handleShared = (original: PostView, created: PostView) => {
    const updatedShareCount =
      created.sharedPost && isSharedPostAvailable(created.sharedPost)
        ? created.sharedPost.shareCount
        : undefined;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            shareCount: typeof updatedShareCount === "number" ? updatedShareCount : prev.shareCount,
          }
        : prev,
    );
    setToShare(null);
  };

  const handleUpdated = (updated: PostView) => {
    setPost(updated);
    setToEdit(null);
  };

  const handleCommentCountChange = (_: string, delta: number) => {
    setPost((prev) => (prev ? { ...prev, commentCount: Math.max(0, prev.commentCount + delta) } : prev));
  };

  const isOpen = Boolean(postId);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={closePostModal}
        maxWidth="sm"
        fullWidth
        disableScrollLock
        aria-labelledby="post-modal-title"
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            bgcolor: "background.paper",
            maxHeight: "90dvh",
          },
        }}
      >
        <DialogTitle
          id="post-modal-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            px: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {post ? tr(`Bài viết của ${post.author.name}`, `${post.author.name}'s Post`) : tr("Chi tiết bài viết", "Post details")}
          </Typography>
          <IconButton
            size="small"
            onClick={closePostModal}
            aria-label={tr("Đóng", "Close")}
            sx={{
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 1, sm: 2 },
            overflowY: "auto",
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "divider",
              borderRadius: 3,
            },
          }}
        >
          {loading && (
            <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Skeleton variant="circular" width={42} height={42} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="40%" height={20} />
                  <Skeleton width="25%" height={16} />
                </Box>
              </Box>
              <Skeleton width="95%" height={18} />
              <Skeleton width="80%" height={18} />
              <Skeleton variant="rounded" height={200} sx={{ mt: 1 }} />
            </Box>
          )}

          {error && (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                {error}
              </Alert>
              {postId && (
                <Button variant="outlined" size="small" onClick={() => void loadCurrentPost(postId)}>
                  {t("common.retry")}
                </Button>
              )}
            </Box>
          )}

          {!loading && !error && post && (
            <PostCard
              post={post}
              priority
              defaultShowComments
              currentUserId={currentUserId}
              onToggleLike={(p, type) => void handleToggleLike(p, type)}
              onRequestEdit={setToEdit}
              onRequestDelete={setToDelete}
              onRequestShare={setToShare}
              onOpenEngagers={(pId, tab) => setEngagersModal({ postId: pId, initialTab: tab })}
              onCommentCountChange={handleCommentCountChange}
            />
          )}
        </DialogContent>
      </Dialog>

      <SharePostDialog
        key={toShare ? `modal-share-${toShare._id}` : "modal-share-closed"}
        post={toShare}
        currentUserId={currentUserId}
        onClose={() => setToShare(null)}
        onShared={handleShared}
      />

      <EditPostDialog
        key={toEdit ? `modal-edit-${toEdit._id}` : "modal-edit-closed"}
        post={toEdit}
        currentUserId={currentUserId}
        onClose={() => setToEdit(null)}
        onUpdated={handleUpdated}
      />

      <PostEngagersDialog
        open={!!engagersModal}
        postId={engagersModal?.postId ?? null}
        initialTab={engagersModal?.initialTab ?? "likes"}
        onClose={() => setEngagersModal(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t("feed.deletePostTitle")}
        description={t("feed.deletePostDesc")}
        confirmLabel={t("common.delete")}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

