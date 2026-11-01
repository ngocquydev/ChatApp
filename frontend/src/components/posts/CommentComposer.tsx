"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import { Box, CircularProgress, IconButton, Popover, TextField, Tooltip } from "@mui/material";
import { Image as ImageIcon, SendHorizontal, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { COMMENT_MAX_LENGTH, MAX_IMAGE_BYTES } from "@/services/postsApi";
import AppGiphyPicker from "@/components/common/AppGiphyPicker";

interface CommentComposerProps {
  sending: boolean;
  onSubmit: (content: string, file: File | null, isVideo: boolean, gifUrl?: string) => Promise<void>;
  onError: (msg: string) => void;
}

export default function CommentComposer({ sending, onSubmit, onError }: CommentComposerProps) {
  const { tr } = useTranslation();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedGifUrl, setAttachedGifUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAttachedVideo, setIsAttachedVideo] = useState(false);
  const [gifAnchorEl, setGifAnchorEl] = useState<HTMLElement | null>(null);

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
      onError(tr("Tệp quá lớn. Vui lòng chọn ảnh hoặc video dưới 100MB.", "File is too large. Please select an image or video under 100MB."));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedGifUrl(null);
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
    setAttachedGifUrl(null);
    setIsAttachedVideo(false);
  };

  const handleSend = async () => {
    if ((!trimmed && !attachedFile && !attachedGifUrl) || sending) return;
    const fileToSend = attachedFile;
    const isVid = isAttachedVideo;
    const textToSend = trimmed;
    const gifToSend = attachedGifUrl || undefined;
    setText("");
    handleRemoveAttachment();
    await onSubmit(textToSend, fileToSend, isVid, gifToSend);
  };

  const handlePickGif = (url: string) => {
    setGifAnchorEl(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(null);
    setPreviewUrl(null);
    setIsAttachedVideo(false);
    setAttachedGifUrl(url);
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      {/* Xem trước ảnh / video / GIF đã đính kèm */}
      {(previewUrl || attachedGifUrl) && (
        <Box sx={{ mb: 1, position: "relative", display: "inline-block" }}>
          {attachedGifUrl ? (
            <Box
              component="img"
              src={attachedGifUrl}
              alt="GIF"
              sx={{
                width: 100,
                height: 100,
                borderRadius: "12px",
                objectFit: "cover",
                display: "block",
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          ) : isAttachedVideo ? (
            <Box
              component="video"
              src={previewUrl!}
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
              src={previewUrl!}
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

      {/* Hàng ô nhập kèm nút ảnh/video, nút GIF và gửi */}
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

        {/* Nút đính kèm ảnh / video */}
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

        {/* Nút chọn ảnh GIF từ GIPHY */}
        <Tooltip title={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}>
          <span>
            <IconButton
              color="primary"
              aria-label={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}
              disabled={sending}
              onClick={(e: MouseEvent<HTMLButtonElement>) => setGifAnchorEl(e.currentTarget)}
              sx={{
                p: 0.5,
                fontWeight: 900,
                fontSize: "0.72rem",
                borderRadius: "6px",
                border: "1.5px solid",
                borderColor: "primary.main",
                width: 32,
                height: 32,
                lineHeight: 1,
              }}
            >
              GIF
            </IconButton>
          </span>
        </Tooltip>

        <Popover
          open={Boolean(gifAnchorEl)}
          anchorEl={gifAnchorEl}
          onClose={() => setGifAnchorEl(null)}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "bottom", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "16px",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
                overflow: "hidden",
              },
            },
          }}
        >
          <AppGiphyPicker onSelect={handlePickGif} onClose={() => setGifAnchorEl(null)} />
        </Popover>

        {/* Nút gửi */}
        <Tooltip title={tr("Gửi bình luận", "Send comment")}>
          <span>
            <IconButton
              color="primary"
              aria-label={tr("Gửi bình luận", "Send comment")}
              disabled={(!trimmed && !attachedFile && !attachedGifUrl) || sending}
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

