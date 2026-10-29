"use client";

import { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, IconButton, TextField, Tooltip } from "@mui/material";
import { Image as ImageIcon, SendHorizontal, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { COMMENT_MAX_LENGTH, MAX_IMAGE_BYTES } from "@/services/postsApi";

interface CommentComposerProps {
  sending: boolean;
  onSubmit: (content: string, file: File | null, isVideo: boolean) => Promise<void>;
  onError: (msg: string) => void;
}

export default function CommentComposer({ sending, onSubmit, onError }: CommentComposerProps) {
  const { tr } = useTranslation();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAttachedVideo, setIsAttachedVideo] = useState(false);

  const trimmed = text.trim();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      onError(tr("Tệp quá lớn. Vui lòng chọn ảnh hoặc video dưới 50MB.", "File is too large. Please select an image or video under 50MB."));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const isVideo = file.type.startsWith("video/");
    setIsAttachedVideo(isVideo);
    setAttachedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemoveAttachment = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(null);
    setPreviewUrl(null);
    setIsAttachedVideo(false);
  };

  const handleSend = async () => {
    if ((!trimmed && !attachedFile) || sending) return;
    const fileToSend = attachedFile;
    const isVid = isAttachedVideo;
    const textToSend = trimmed;
    setText("");
    handleRemoveAttachment();
    await onSubmit(textToSend, fileToSend, isVid);
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Xem trước ảnh / video đã đính kèm */}
      {previewUrl && (
        <Box sx={{ mb: 1, position: "relative", display: "inline-block" }}>
          {isAttachedVideo ? (
            <Box
              component="video"
              src={previewUrl}
              sx={{
                width: 90,
                height: 90,
                borderRadius: "12px",
                objectFit: "cover",
                display: "block",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "common.black",
              }}
            />
          ) : (
            <Box
              component="img"
              src={previewUrl}
              alt={tr("Ảnh đính kèm bình luận", "Attached comment image")}
              sx={{
                width: 90,
                height: 90,
                borderRadius: "12px",
                objectFit: "cover",
                display: "block",
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          )}
          <IconButton
            size="small"
            aria-label={tr("Hủy đính kèm", "Remove attachment")}
            onClick={handleRemoveAttachment}
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              p: 0.35,
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <X size={14} />
          </IconButton>
        </Box>
      )}

      {/* Hàng ô nhập kèm nút ảnh/video và gửi */}
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "flex-end" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder={tr("Viết bình luận…", "Write a comment…")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void handleSend();
            }
          }}
          slotProps={{ htmlInput: { maxLength: COMMENT_MAX_LENGTH, "aria-label": tr("Viết bình luận", "Write a comment") } }}
        />

        <Tooltip title={tr("Đính kèm ảnh hoặc video", "Attach photo or video")}>
          <span>
            <IconButton
              color="primary"
              aria-label={tr("Đính kèm ảnh hoặc video", "Attach photo or video")}
              disabled={sending}
              onClick={() => fileInputRef.current?.click()}
              sx={{ p: 1 }}
            >
              <ImageIcon size={20} aria-hidden />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={tr("Gửi bình luận", "Send comment")}>
          <span>
            <IconButton
              color="primary"
              aria-label={tr("Gửi bình luận", "Send comment")}
              disabled={(!trimmed && !attachedFile) || sending}
              onClick={() => void handleSend()}
              sx={{ p: 1 }}
            >
              {sending ? <CircularProgress size={20} /> : <SendHorizontal size={20} aria-hidden />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

