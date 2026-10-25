"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { SendHorizontal, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { usePagedList } from "@/hooks/usePagedList";
import {
  addComment,
  apiErrorMessage,
  COMMENT_MAX_LENGTH,
  deleteComment,
  fetchComments,
  type CommentView,
} from "@/services/postsApi";
import { formatFullDateTime, formatRelativeTime } from "@/utils/formatTime";
import PostAuthorHeader from "./PostAuthorHeader";

const COMMENT_PAGE_SIZE = 5;

interface PostCommentSectionProps {
  postId: string;
  postAuthorId: string;
  currentUserId?: string;
  /** Báo cho thẻ bài viết cập nhật bộ đếm bình luận (+1 / −1) */
  onCountChange: (delta: number) => void;
}

function CommentItem({
  comment,
  currentUserId,
  canDelete,
  onDelete,
}: {
  comment: CommentView;
  currentUserId?: string;
  canDelete: boolean;
  onDelete: (comment: CommentView) => void;
}) {
  return (
    <Box component="li" sx={{ display: "flex", gap: 1, alignItems: "flex-start", listStyle: "none" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ bgcolor: "action.hover", borderRadius: "12px", px: 1.5, py: 1 }}>
          <PostAuthorHeader author={comment.author} currentUserId={currentUserId} size={28} />
          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {comment.content}
          </Typography>
        </Box>
        <Tooltip title={formatFullDateTime(comment.createdAt)}>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
            {formatRelativeTime(comment.createdAt)}
          </Typography>
        </Tooltip>
      </Box>
      {canDelete && (
        <IconButton
          size="small"
          aria-label={`Xóa bình luận của ${comment.author.name}`}
          onClick={() => onDelete(comment)}
          sx={{ mt: 0.5 }}
        >
          <Trash2 size={16} aria-hidden />
        </IconButton>
      )}
    </Box>
  );
}

/** Danh sách + ô nhập bình luận của một bài viết (tải khi mở, "Xem thêm" để tải tiếp). */
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

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CommentView | null>(null);
  const [deleting, setDeleting] = useState(false);

  const trimmed = text.trim();

  const submit = async () => {
    if (!trimmed || sending) return;
    setSending(true);
    setActionError(null);
    try {
      const comment = await addComment(postId, trimmed);
      // Luôn hiện ngay bình luận vừa gửi; thứ tự theo _id (ObjectId tăng dần theo thời gian) được giữ khi tải thêm
      list.append(comment);
      setText("");
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

      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", mt: 1.5 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Viết bình luận…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Không gửi khi đang gõ IME (Telex/VNI dùng Enter để chốt từ)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          slotProps={{ htmlInput: { maxLength: COMMENT_MAX_LENGTH, "aria-label": "Viết bình luận" } }}
        />
        <IconButton
          color="primary"
          aria-label="Gửi bình luận"
          disabled={!trimmed || sending}
          onClick={() => void submit()}
        >
          {sending ? <CircularProgress size={20} /> : <SendHorizontal size={20} aria-hidden />}
        </IconButton>
      </Box>

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
