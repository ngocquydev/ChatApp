"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";
import { uploadMedia } from "@/services/postsApi";

const TYPING_THROTTLE_MS = 2500;
const TYPING_IDLE_MS = 5000;

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

  // Dọn timer khi rời khỏi hội thoại / unmount
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

  const submit = async () => {
    if (!canSend) return;
    const value = text;
    setText("");
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
          <Button variant="outlined" size="small" color="primary" onClick={onUnblock} sx={{ textTransform: "none", borderRadius: "8px" }}>
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
          borderRadius: 5,
          px: 1,
          py: 0.5,
          transition: "border-color 150ms, box-shadow 150ms, background-color 150ms",
          "&:focus-within": {
            borderColor: "divider",
            bgcolor: "background.paper",
            boxShadow: "none",
          },
        }}
      >
        <Box sx={{ display: { xs: "none", sm: "flex" }, pb: 0.25, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={handleMediaSelect}
            aria-label="Chọn ảnh hoặc video để gửi"
          />
          <Tooltip title={uploadingMedia ? "Đang tải tệp lên Cloudinary…" : "Gửi ảnh hoặc video"}>
            <span>
              <IconButton
                size="small"
                disabled={uploadingMedia}
                aria-label="Gửi ảnh hoặc video qua Cloudinary"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingMedia ? <CircularProgress size={18} /> : <ImageIcon size={19} />}
              </IconButton>
            </span>
          </Tooltip>
          <ComingSoonButton label="Đính kèm tệp khác">
            <Paperclip size={19} />
          </ComingSoonButton>
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
            input: { disableUnderline: true, sx: { px: 1.25, py: 1, fontSize: "0.9375rem" } },
          }}
        />

        <Box sx={{ display: { xs: "none", sm: "flex" }, pb: 0.25 }}>
          <ComingSoonButton label="Biểu tượng cảm xúc">
            <Smile size={19} />
          </ComingSoonButton>
        </Box>

        <Tooltip title="Gửi (Enter)">
          <span>
            <IconButton
              onClick={() => void submit()}
              disabled={!canSend}
              aria-label="Gửi tin nhắn"
              sx={{
                mb: 0.25,
                width: 38,
                height: 38,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground", color: "text.disabled" },
              }}
            >
              <Send size={17} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

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
