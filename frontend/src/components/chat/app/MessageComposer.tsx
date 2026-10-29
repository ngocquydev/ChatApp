"use client";

import { KeyboardEvent, MouseEvent, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Image as ImageIcon, Paperclip, Send, Smile, ThumbsUp } from "lucide-react";
import { uploadMedia } from "@/services/postsApi";

const TYPING_THROTTLE_MS = 2500;
const TYPING_IDLE_MS = 5000;

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪",
];

interface MessageComposerProps {
  onSend: (text: string) => Promise<void> | void;
  onTyping: (isTyping: boolean) => void;
  isBlocked?: boolean;
  isBlockedByMe?: boolean;
  onUnblock?: () => void;
}

function ComingSoonButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip title={`${label} — sắp ra mắt`}>
      <span>
        <IconButton size="small" disabled aria-label={`${label} (sắp ra mắt)`}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function MessageComposer({
  onSend,
  onTyping,
  isBlocked = false,
  isBlockedByMe = false,
  onUnblock,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const canSend = text.trim().length > 0;

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingMedia(true);
    try {
      const res = await uploadMedia(file);
      if (res?.url) {
        await onSend(res.url);
      }
    } catch {
      // lỗi khi tải lên
    } finally {
      setUploadingMedia(false);
    }
  };

  const stopTyping = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    onTyping(false);
    lastTypingSentRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setText(value);

    if (!value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
      onTyping(true);
      lastTypingSentRef.current = now;
    }
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const submit = async (customText?: string) => {
    const value = (customText ?? text).trim();
    if (!value) return;
    if (!customText) {
      setText("");
    }
    stopTyping();
    await onSend(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Không gửi khi đang gõ dấu bằng bộ gõ tiếng Việt (Telex/VNI) hoặc IME khác
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  if (isBlocked) {
    return (
      <Box
        sx={{
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          px: 2,
          py: 2.5,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {isBlockedByMe
            ? "Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục trò chuyện."
            : "Người dùng này hiện không thể nhận tin nhắn vào lúc này."}
        </Typography>
        {isBlockedByMe && onUnblock && (
          <Button variant="outlined" size="small" color="primary" onClick={onUnblock} sx={{ borderRadius: "8px" }}>
            Bỏ chặn
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        px: { xs: 1, sm: 2.5 },
        pt: 1.25,
        pb: "calc(10px + env(safe-area-inset-bottom))",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 0.25,
          bgcolor: "background.default",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "24px",
          px: 1,
          py: 0.5,
          transition: "border-color 150ms, background-color 150ms",
          "&:focus-within": {
            borderColor: "primary.main",
            bgcolor: "background.paper",
          },
        }}
      >
        <Box sx={{ display: "flex", pb: 0.25, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={handleMediaSelect}
            aria-label="Chọn ảnh hoặc video để gửi"
          />
          <Tooltip title={uploadingMedia ? "Đang tải tệp lên…" : "Gửi ảnh hoặc video"}>
            <span>
              <IconButton
                size="small"
                disabled={uploadingMedia}
                aria-label="Gửi ảnh hoặc video"
                onClick={() => fileInputRef.current?.click()}
                sx={{ color: "primary.main" }}
              >
                {uploadingMedia ? <CircularProgress size={18} /> : <ImageIcon size={19} />}
              </IconButton>
            </span>
          </Tooltip>
          <Box sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            <ComingSoonButton label="Đính kèm tệp khác">
              <Paperclip size={19} />
            </ComingSoonButton>
          </Box>
        </Box>

        <TextField
          fullWidth
          multiline
          maxRows={5}
          variant="standard"
          placeholder="Nhập tin nhắn…"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            htmlInput: { "aria-label": "Nội dung tin nhắn", enterKeyHint: "send" },
            input: { disableUnderline: true, sx: { px: 1, py: 0.9, fontSize: "0.9375rem" } },
          }}
        />

        <Box sx={{ display: "flex", pb: 0.25, alignItems: "center" }}>
          <Tooltip title="Chọn biểu tượng cảm xúc">
            <IconButton
              size="small"
              aria-label="Chọn biểu tượng cảm xúc"
              onClick={(e: MouseEvent<HTMLButtonElement>) => setEmojiAnchorEl(e.currentTarget)}
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
            >
              <Smile size={19} />
            </IconButton>
          </Tooltip>
        </Box>

        {canSend ? (
          <Tooltip title="Gửi (Enter)">
            <IconButton
              onClick={() => void submit()}
              aria-label="Gửi tin nhắn"
              sx={{
                mb: 0.25,
                width: 36,
                height: 36,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <Send size={16} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Gửi biểu tượng thích">
            <IconButton
              onClick={() => void submit("👍")}
              aria-label="Gửi biểu tượng thích"
              sx={{
                mb: 0.25,
                width: 36,
                height: 36,
                color: "primary.main",
                "&:hover": { bgcolor: "action.selected", transform: "scale(1.08)" },
              }}
            >
              <ThumbsUp size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              borderRadius: "16px",
              maxWidth: 260,
              mb: 1,
            },
          },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
          Biểu tượng cảm xúc
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0.5 }}>
          {POPULAR_EMOJIS.map((emoji) => (
            <ButtonBase
              key={emoji}
              aria-label={`Chèn biểu tượng ${emoji}`}
              onClick={() => {
                handleChange(`${text}${emoji}`);
                setEmojiAnchorEl(null);
              }}
              sx={{
                fontSize: "1.35rem",
                p: 0.6,
                borderRadius: "8px",
                transition: "transform 0.1s ease, background-color 0.1s ease",
                "&:hover": { bgcolor: "action.hover", transform: "scale(1.18)" },
              }}
            >
              {emoji}
            </ButtonBase>
          ))}
        </Box>
      </Popover>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: "none", md: "block" }, mt: 0.5, px: 1.5, fontSize: "0.7rem" }}
      >
        Enter để gửi · Shift + Enter để xuống dòng
      </Typography>
    </Box>
  );
}
