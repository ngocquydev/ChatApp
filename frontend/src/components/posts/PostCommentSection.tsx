"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Skeleton, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { summarizeComments } from "@/services/groqApi";
import AiCommentSummaryBox from "./AiCommentSummaryBox";
import { usePagedList } from "@/hooks/usePagedList";
import { useTranslation } from "@/i18n/useTranslation";
import {
  addComment,
  apiErrorMessage,
  deleteComment,
  fetchComments,
  toggleCommentReaction,
  uploadMedia,
  type CommentView,
  type ReactionType,
} from "@/services/postsApi";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";

const COMMENT_PAGE_SIZE = 5;

interface PostCommentSectionProps {
  postId: string;
  postAuthorId: string;
  currentUserId?: string;
  /** Báo cho thẻ bài viết cập nhật bộ đếm bình luận (+1 / −1) */
  onCountChange: (delta: number) => void;
}

/** Danh sách + ô nhập bình luận của một bài viết (hỗ trợ đính kèm ảnh / video). */
export default function PostCommentSection({
  postId,
  postAuthorId,
  currentUserId,
  onCountChange,
}: PostCommentSectionProps) {
  const { tr } = useTranslation();
  const list = usePagedList<CommentView>(
    (after) => fetchComments(postId, { limit: COMMENT_PAGE_SIZE, after }),
    (err) => apiErrorMessage(err, tr("Không tải được bình luận.", "Could not load comments.")),
  );

  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CommentView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Lắng nghe sự kiện socket thời gian thực khi có bình luận mới hoặc xóa bình luận
  useEffect(() => {
    const handleComment = (e: Event) => {
      const data = (e as CustomEvent<{ postId: string; comment: CommentView }>).detail;
      if (data && data.postId === postId && data.comment) {
        list.append(data.comment);
      }
    };
    const handleCommentDeleted = (e: Event) => {
      const data = (e as CustomEvent<{ postId: string; commentId: string }>).detail;
      if (data && data.postId === postId && data.commentId) {
        list.remove(data.commentId);
      }
    };
    window.addEventListener("chatapp:post_comment", handleComment);
    window.addEventListener("chatapp:post_comment_deleted", handleCommentDeleted);
    return () => {
      window.removeEventListener("chatapp:post_comment", handleComment);
      window.removeEventListener("chatapp:post_comment_deleted", handleCommentDeleted);
    };
  }, [postId, list]);

  const handleSummarize = async () => {
    setLoadingSummary(true);
    try {
      const res = await summarizeComments(postId);
      setSummary(res.summary);
    } catch {
      setActionError(tr("Không thể tóm tắt bình luận lúc này.", "Could not summarize comments at this time."));
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSubmit = async (
    content: string,
    file: File | null,
    isVideo: boolean,
    gifUrl?: string,
  ) => {
    setSending(true);
    setActionError(null);
    try {
      let media: { url: string; type?: "image" | "video" } | undefined;
      if (gifUrl) {
        media = { url: gifUrl, type: "image" };
      } else if (file) {
        const uploaded = await uploadMedia(file);
        media = {
          url: uploaded.url,
          type: uploaded.resource_type === "video" || isVideo ? "video" : "image",
        };
      }
      const comment = await addComment(postId, content || undefined, media);
      list.append(comment);
      onCountChange(1);
    } catch (err) {
      setActionError(apiErrorMessage(err, tr("Không gửi được bình luận.", "Could not send comment.")));
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteComment(postId, toDelete._id);
      list.remove(toDelete._id);
      onCountChange(-1);
      setToDelete(null);
    } catch (err) {
      setActionError(apiErrorMessage(err, tr("Không xóa được bình luận.", "Could not delete comment.")));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleCommentReaction = async (comment: CommentView, type?: ReactionType) => {
    const targetType = type ?? (comment.myReaction ? comment.myReaction : "like");
    const isUnreact = Boolean(comment.likedByMe && (!type || comment.myReaction === type));
    const nextReaction = isUnreact ? null : targetType;
    const nextLiked = !isUnreact;

    list.patch(comment._id, (c) => {
      const nextReactionsCount: Record<string, number> = { ...(c.reactionsCount || {}) };
      if (isUnreact) {
        if (c.myReaction && nextReactionsCount[c.myReaction]) {
          nextReactionsCount[c.myReaction] = Math.max(0, nextReactionsCount[c.myReaction] - 1);
        }
      } else {
        if (c.myReaction && nextReactionsCount[c.myReaction]) {
          nextReactionsCount[c.myReaction] = Math.max(0, nextReactionsCount[c.myReaction] - 1);
        }
        nextReactionsCount[targetType] = (nextReactionsCount[targetType] || 0) + 1;
      }
      return {
        ...c,
        likedByMe: nextLiked,
        myReaction: nextReaction,
        likeCount: Math.max(
          0,
          (c.likeCount ?? 0) + (nextLiked && !c.likedByMe ? 1 : !nextLiked && c.likedByMe ? -1 : 0),
        ),
        reactionsCount: nextReactionsCount as Record<ReactionType, number>,
      };
    });

    try {
      const res = await toggleCommentReaction(postId, comment._id, type);
      list.patch(comment._id, (c) => ({
        ...c,
        likedByMe: res.liked,
        myReaction: res.myReaction,
        likeCount: res.likeCount,
        reactionsCount: res.reactionsCount as Record<ReactionType, number> | undefined,
      }));
    } catch {
      list.patch(comment._id, (c) => ({
        ...c,
        likedByMe: comment.likedByMe,
        myReaction: comment.myReaction,
        likeCount: comment.likeCount,
        reactionsCount: comment.reactionsCount,
      }));
    }
  };

  return (
    <Box sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
      {list.status === "loading" && (
        <Box aria-busy="true" aria-label={tr("Đang tải bình luận", "Loading comments")} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Skeleton variant="rounded" height={52} />
          <Skeleton variant="rounded" height={52} width="80%" />
        </Box>
      )}

      {list.status === "error" && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={list.reload}>
              {tr("Thử lại", "Retry")}
            </Button>
          }
        >
          {list.error}
        </Alert>
      )}

      {list.status === "ready" && (
        <>
          {list.items.length >= 2 && !summary && !loadingSummary && (
            <Box sx={{ mb: 1, display: "flex", justifyContent: "flex-end" }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Sparkles size={13} />}
                onClick={() => void handleSummarize()}
                sx={{
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                  py: 0.3,
                  px: 1.2,
                }}
              >
                {tr("Tóm tắt bình luận (Llama 3.3)", "Summarize comments (Llama 3.3)")}
              </Button>
            </Box>
          )}

          <AiCommentSummaryBox
            summary={summary}
            loading={loadingSummary}
            commentCount={list.items.length}
            onRefresh={() => void handleSummarize()}
            onClose={() => setSummary(null)}
          />
          {list.items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              {tr("Chưa có bình luận nào. Hãy là người đầu tiên!", "No comments yet. Be the first to comment!")}
            </Typography>
          ) : (
            <Box component="ul" aria-label={tr("Bình luận", "Comments")} sx={{ p: 0, m: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
              {[...list.items]
                .sort((a, b) => a._id.localeCompare(b._id))
                .map((c) => (
                  <CommentItem
                    key={c._id}
                    comment={c}
                    currentUserId={currentUserId}
                    canDelete={c.author._id === currentUserId || postAuthorId === currentUserId}
                    onDelete={setToDelete}
                    onToggleReaction={handleToggleCommentReaction}
                  />
                ))}
            </Box>
          )}

          {list.hasMore && (
            <Button size="small" onClick={list.loadMore} disabled={list.isLoadingMore} sx={{ mt: 1, fontWeight: 600 }}>
              {list.isLoadingMore ? tr("Đang tải…", "Loading…") : tr("Xem thêm bình luận", "View more comments")}
            </Button>
          )}
          {list.loadMoreError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {list.loadMoreError}
            </Alert>
          )}
        </>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Ô nhập bình luận kèm đính kèm ảnh hoặc video */}
      <CommentComposer
        sending={sending}
        onSubmit={handleSubmit}
        onError={(msg) => setActionError(msg)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={tr("Xóa bình luận?", "Delete comment?")}
        description={
          toDelete ? (
            <>
              {tr("Bình luận của ", "Comment by ")}
              <strong>{toDelete.author.name}</strong>
              {tr(" sẽ bị xóa và không thể khôi phục.", " will be permanently deleted.")}
            </>
          ) : (
            ""
          )
        }
        confirmLabel={tr("Xóa bình luận", "Delete comment")}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </Box>
  );
}
