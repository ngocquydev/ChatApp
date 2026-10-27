"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, Divider, IconButton, Paper, TextField, Typography } from "@mui/material";
import { ImagePlus, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import {
  apiErrorMessage,
  createPost,
  MAX_IMAGE_BYTES,
  MAX_POST_IMAGES,
  POST_MAX_LENGTH,
  uploadPostImage,
  type PostPrivacy,
  type PostView,
} from "@/services/postsApi";
import PrivacyPicker from "./PrivacyPicker";

interface Attachment {
  key: string;
  preview: string;
  isVideo?: boolean;
  /** Đường dẫn trên server sau khi tải xong */
  url?: string;
}

interface PostComposerProps {
  userName?: string;
  userAvatar?: string;
  defaultPrivacy?: PostPrivacy;
  onCreated: (post: PostView) => void;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const POST_PRIVACY_STORAGE_KEY = "chatapp:post_privacy";
const VALID_PRIVACIES: PostPrivacy[] = ["public", "friends", "only_me"];

function readStoredPrivacy(fallback: PostPrivacy): PostPrivacy {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(POST_PRIVACY_STORAGE_KEY) as PostPrivacy | null;
    if (raw && VALID_PRIVACIES.includes(raw)) return raw;
  } catch {
    // Bỏ qua nếu localStorage bị chặn
  }
  return fallback;
}

/** Ô soạn bài: chữ + tối đa 4 ảnh + quyền riêng tư. Ảnh được tải lên ngay khi chọn. */
export default function PostComposer({
  userName,
  userAvatar,
  defaultPrivacy = "friends",
  onCreated,
}: PostComposerProps) {
  const uid = useId();
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState<PostPrivacy>(defaultPrivacy);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewsRef = useRef<string[]>([]);

  useEffect(() => {
    // Khôi phục quyền riêng tư người dùng đã chọn trước đó
    const stored = readStoredPrivacy(defaultPrivacy);
    if (stored !== defaultPrivacy) {
      setPrivacy(stored);
    }
  }, [defaultPrivacy]);

  const handlePrivacyChange = (next: PostPrivacy) => {
    setPrivacy(next);
    try {
      localStorage.setItem(POST_PRIVACY_STORAGE_KEY, next);
    } catch {
      // Bỏ qua nếu localStorage bị chặn
    }
  };

  useEffect(() => {
    const previews = previewsRef;
    return () => {
      // Giải phóng blob URL khi rời trang
      previews.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const trimmed = text.trim();
  const canPost = (trimmed.length > 0 || attachments.length > 0) && uploading === 0 && !posting;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // cho phép chọn lại cùng một tệp
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
      previewsRef.current.push(preview);
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
    if (!canPost) return;
    setPosting(true);
    setError(null);
    try {
      const post = await createPost({
        content: trimmed,
        images: attachments.flatMap((a) => (a.url ? [a.url] : [])),
        privacy,
      });
      setText("");
      setAttachments([]);
      onCreated(post);
    } catch (err) {
      setError(apiErrorMessage(err, "Không đăng được bài viết. Hãy thử lại."));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <PresenceAvatar name={userName} src={userAvatar} size={40} hidePresence />
        <TextField
          fullWidth
          multiline
          minRows={2}
          maxRows={10}
          variant="standard"
          placeholder="Bạn đang nghĩ gì?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={posting}
          slotProps={{
            input: { disableUnderline: true },
            htmlInput: { maxLength: POST_MAX_LENGTH, "aria-label": "Nội dung bài viết" },
          }}
        />
      </Box>

      {text.length > POST_MAX_LENGTH * 0.9 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right" }}>
          {text.length}/{POST_MAX_LENGTH}
        </Typography>
      )}

      {attachments.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }} aria-label="Tệp đính kèm">
          {attachments.map((a, i) => (
            <Box
              key={a.key}
              sx={{ position: "relative", width: 88, height: 88, borderRadius: "12px", overflow: "hidden", bgcolor: "action.hover" }}
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
                disabled={posting}
                sx={{ position: "absolute", top: 2, right: 2, p: 0.25, bgcolor: "common.black", color: "common.white", "&:hover": { bgcolor: "grey.800" } }}
              >
                <X size={14} aria-hidden />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Divider sx={{ my: 1.5 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            component="label"
            size="small"
            color="inherit"
            disabled={posting || attachments.length >= MAX_POST_IMAGES}
            startIcon={<ImagePlus size={18} aria-hidden />}
            sx={{ fontWeight: 600, color: "text.secondary" }}
          >
            Ảnh / Video
            <input hidden type="file" accept={ACCEPT} multiple onChange={handleFiles} aria-label="Chọn ảnh hoặc video đính kèm" />
          </Button>
          <PrivacyPicker value={privacy} onChange={handlePrivacyChange} disabled={posting} labelId={`${uid}-privacy`} />
        </Box>
        <Button variant="contained" disabled={!canPost} onClick={() => void submit()}>
          {posting ? "Đang đăng…" : uploading > 0 ? "Đang tải lên…" : "Đăng"}
        </Button>
      </Box>
    </Paper>
  );
}
