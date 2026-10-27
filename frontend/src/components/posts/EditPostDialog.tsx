"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { ImagePlus, X } from "lucide-react";
import {
  apiErrorMessage,
  isSharedPostAvailable,
  isVideoUrl,
  MAX_IMAGE_BYTES,
  MAX_POST_IMAGES,
  mediaUrl,
  POST_MAX_LENGTH,
  updatePost,
  uploadPostImage,
  type PostPrivacy,
  type PostView,
} from "@/services/postsApi";
import PostAuthorHeader from "./PostAuthorHeader";
import PrivacyPicker from "./PrivacyPicker";

interface EditPostDialogProps {
  post: PostView | null;
  currentUserId?: string;
  onClose: () => void;
  onUpdated: (post: PostView) => void;
}

interface Attachment {
  key: string;
  preview: string;
  isVideo?: boolean;
  url?: string;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export default function EditPostDialog({
  post,
  currentUserId,
  onClose,
  onUpdated,
}: EditPostDialogProps) {
  const uid = useId();
  const [text, setText] = useState(post?.content ?? "");
  const [privacy, setPrivacy] = useState<PostPrivacy>(post?.privacy ?? "friends");
  const [attachments, setAttachments] = useState<Attachment[]>(() => {
    if (!post?.images) return [];
    return post.images.map((url) => ({
      key: url,
      preview: mediaUrl(url),
      isVideo: isVideoUrl(url),
      url,
    }));
  });
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const isShared = !!post?.sharedPost;
  const sharedPreview = isShared && post?.sharedPost && isSharedPostAvailable(post.sharedPost)
    ? post.sharedPost
    : null;

  const trimmed = text.trim();
  const canSave =
    (isShared || trimmed.length > 0 || attachments.length > 0) &&
    uploading === 0 &&
    !saving;

  const handleClose = () => {
    if (saving || uploading > 0) return;
    setError(null);
    onClose();
  };

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);

    const room = MAX_POST_IMAGES - attachments.length;
    if (files.length > room) {
      setError(`Mỗi bài viết chỉ đính kèm tối đa ${MAX_POST_IMAGES} ảnh hoặc video.`);
    }
    const accepted = files.slice(0, Math.max(room, 0));

    for (const file of accepted) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isImage && !isVideo) {
        setError("Chỉ hỗ trợ tệp ảnh (JPG, PNG, WEBP, GIF) hoặc video (MP4, WEBM, MOV).");
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Tệp “${file.name}” vượt quá 50MB.`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      blobUrlsRef.current.push(preview);
      const key = `${preview}`;
      setAttachments((prev) => [...prev, { key, preview, isVideo }]);
      setUploading((n) => n + 1);
      try {
        const url = await uploadPostImage(file);
        setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, url } : a)));
      } catch (err) {
        setAttachments((prev) => prev.filter((a) => a.key !== key));
        setError(apiErrorMessage(err, "Không tải được tệp lên."));
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const removeAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((a) => a.key !== key));
  };

  const submit = async () => {
    if (!post || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrls = attachments.flatMap((a) => (a.url ? [a.url] : []));
      const updated = await updatePost(post._id, {
        content: trimmed,
        images: isShared ? undefined : imageUrls,
        privacy,
      });
      onUpdated(updated);
    } catch (err) {
      setError(apiErrorMessage(err, "Không cập nhật được bài viết. Hãy thử lại."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!post}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disableAutoFocus
      aria-labelledby={`${uid}-title`}
    >
      <DialogTitle id={`${uid}-title`} sx={{ fontWeight: 700 }}>
        Chỉnh sửa bài viết
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={10}
          placeholder="Nội dung bài viết…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={saving}
          slotProps={{
            htmlInput: {
              maxLength: POST_MAX_LENGTH,
              "aria-label": "Chỉnh sửa nội dung bài viết",
            },
          }}
        />

        {text.length > POST_MAX_LENGTH * 0.9 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", mt: 0.5 }}>
            {text.length}/{POST_MAX_LENGTH}
          </Typography>
        )}

        {!isShared && attachments.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }} aria-label="Tệp đính kèm">
            {attachments.map((a, i) => (
              <Box
                key={a.key}
                sx={{
                  position: "relative",
                  width: 88,
                  height: 88,
                  borderRadius: "12px",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                }}
              >
                {a.isVideo ? (
                  <Box
                    component="video"
                    src={a.preview}
                    muted
                    sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: a.url ? 1 : 0.5 }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={a.preview}
                    alt={`Tệp đính kèm ${i + 1}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", opacity: a.url ? 1 : 0.5 }}
                  />
                )}
                {!a.url && (
                  <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CircularProgress size={22} aria-label="Đang tải tệp lên" />
                  </Box>
                )}
                <IconButton
                  size="small"
                  aria-label={`Gỡ tệp đính kèm ${i + 1}`}
                  onClick={() => removeAttachment(a.key)}
                  disabled={saving}
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    p: 0.25,
                    bgcolor: "common.black",
                    color: "common.white",
                    "&:hover": { bgcolor: "grey.800" },
                  }}
                >
                  <X size={14} aria-hidden />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        {sharedPreview && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
            <PostAuthorHeader author={sharedPreview.author} currentUserId={currentUserId} createdAt={sharedPreview.createdAt} size={32} />
            {sharedPreview.content && (
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {sharedPreview.content}
              </Typography>
            )}
            {sharedPreview.images.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Kèm {sharedPreview.images.length} ảnh
              </Typography>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ai xem được:
            </Typography>
            <PrivacyPicker value={privacy} onChange={setPrivacy} disabled={saving} labelId={`${uid}-privacy`} />
          </Box>

          {!isShared && attachments.length < MAX_POST_IMAGES && (
            <Button
              component="label"
              size="small"
              color="inherit"
              disabled={saving || uploading > 0}
              startIcon={<ImagePlus size={18} aria-hidden />}
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Thêm ảnh / video
              <input
                hidden
                type="file"
                accept={ACCEPT}
                multiple
                onChange={handleFiles}
                aria-label="Chọn thêm ảnh hoặc video"
              />
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={handleClose} disabled={saving || uploading > 0}>
          Hủy
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={!canSave}>
          {saving ? "Đang lưu…" : uploading > 0 ? "Đang tải lên…" : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
