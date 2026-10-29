"use client";

import { useState } from "react";
import { Alert, Box, Button, Skeleton, Typography } from "@mui/material";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { usePagedList } from "@/hooks/usePagedList";
import {
  addComment,
  apiErrorMessage,
  deleteComment,
  fetchComments,
  uploadMedia,
  type CommentView,
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
  const list = usePagedList<CommentView>(
    (after) => fetchComments(postId, { limit: COMMENT_PAGE_SIZE, after }),
    (err) => apiErrorMessage(err, "Không tải được bình luận."),
  );

  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CommentView | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (content: string, file: File | null, isVideo: boolean) => {
    setSending(true);
    setActionError(null);
    try {
      let media: { url: string; type?: "image" | "video" } | undefined;
      if (file) {
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
      setActionError(apiErrorMessage(err, "Không gửi được bình luận."));
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
      setActionError(apiErrorMessage(err, "Không xóa được bình luận."));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
      {list.status === "loading" && (
        <Box aria-busy="true" aria-label="Đang tải bình luận" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Skeleton variant="rounded" height={52} />
          <Skeleton variant="rounded" height={52} width="80%" />
        </Box>
      )}

      {list.status === "error" && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={list.reload}>
              Thử lại
            </Button>
          }
        >
          {list.error}
        </Alert>
      )}

      {list.status === "ready" && (
        <>
          {list.items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
              Chưa có bình luận nào. Hãy là người đầu tiên!
            </Typography>
          ) : (
            <Box component="ul" aria-label="Bình luận" sx={{ p: 0, m: 0, display: "flex", flexDirection: "column", gap: 1.25 }}>
              {[...list.items]
                .sort((a, b) => a._id.localeCompare(b._id))
                .map((c) => (
                  <CommentItem
                    key={c._id}
                    comment={c}
                    currentUserId={currentUserId}
                    canDelete={c.author._id === currentUserId || postAuthorId === currentUserId}
                    onDelete={setToDelete}
                  />
                ))}
            </Box>
          )}

          {list.hasMore && (
            <Button size="small" onClick={list.loadMore} disabled={list.isLoadingMore} sx={{ mt: 1, fontWeight: 600 }}>
              {list.isLoadingMore ? "Đang tải…" : "Xem thêm bình luận"}
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
        title="Xóa bình luận?"
        description={
          toDelete ? (
            <>
              Bình luận của <strong>{toDelete.author.name}</strong> sẽ bị xóa và không thể khôi phục.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Xóa bình luận"
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </Box>
  );
}
