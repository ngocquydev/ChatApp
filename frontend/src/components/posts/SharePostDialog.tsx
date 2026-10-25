"use client";

import { useId, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { apiErrorMessage, isSharedPostAvailable, POST_MAX_LENGTH, sharePost, type PostPrivacy, type PostView } from "@/services/postsApi";
import PostAuthorHeader from "./PostAuthorHeader";
import PrivacyPicker from "./PrivacyPicker";

interface SharePostDialogProps {
  /** Bài được chọn để chia sẻ; null = đóng hộp thoại */
  post: PostView | null;
  currentUserId?: string;
  onClose: () => void;
  onShared: (original: PostView, created: PostView) => void;
}

/** Chia sẻ lại bài viết lên dòng thời gian của mình, kèm lời bình tùy chọn. */
export default function SharePostDialog({ post, currentUserId, onClose, onShared }: SharePostDialogProps) {
  const uid = useId();
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>("friends");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hiển thị bài gốc (nếu đang chia sẻ một bài chia sẻ thì hiện nội dung bài gốc của nó)
  const preview = post
    ? post.sharedPost && isSharedPostAvailable(post.sharedPost)
      ? post.sharedPost
      : post
    : null;

  const handleClose = () => {
    if (pending) return;
    setText("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!post) return;
    setPending(true);
    setError(null);
    try {
      const created = await sharePost(post._id, { content: text.trim() || undefined, privacy });
      setText("");
      onShared(post, created);
    } catch (err) {
      setError(apiErrorMessage(err, "Không chia sẻ được bài viết. Hãy thử lại."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={!!post} onClose={handleClose} fullWidth maxWidth="sm" aria-labelledby={`${uid}-title`}>
      <DialogTitle id={`${uid}-title`} sx={{ fontWeight: 700 }}>
        Chia sẻ bài viết
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          placeholder="Hãy nói gì đó về nội dung này…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={pending}
          slotProps={{ htmlInput: { maxLength: POST_MAX_LENGTH, "aria-label": "Lời bình khi chia sẻ" } }}
        />

        {preview && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
            <PostAuthorHeader author={preview.author} currentUserId={currentUserId} createdAt={preview.createdAt} size={32} />
            {preview.content && (
              <Typography
                variant="body2"
                sx={{ mt: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
              >
                {preview.content}
              </Typography>
            )}
            {preview.images.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Kèm {preview.images.length} ảnh
              </Typography>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Ai xem được:
          </Typography>
          <PrivacyPicker value={privacy} onChange={setPrivacy} disabled={pending} labelId={`${uid}-privacy`} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={handleClose} disabled={pending}>
          Hủy
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={pending}>
          {pending ? "Đang chia sẻ…" : "Chia sẻ ngay"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
