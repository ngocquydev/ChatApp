"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Box, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Image as ImageIcon, Paperclip, Send, Smile } from "lucide-react";

const TYPING_THROTTLE_MS = 2500;
const TYPING_IDLE_MS = 5000;

interface MessageComposerProps {
  onSend: (text: string) => Promise<void> | void;
  onTyping: (isTyping: boolean) => void;
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

export default function MessageComposer({ onSend, onTyping }: MessageComposerProps) {
  const [text, setText] = useState("");
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const canSend = text.trim().length > 0;

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
            borderColor: "primary.main",
            bgcolor: "background.paper",
            boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
          },
        }}
      >
        <Box sx={{ display: { xs: "none", sm: "flex" }, pb: 0.25 }}>
          <ComingSoonButton label="Đính kèm tệp">
            <Paperclip size={19} />
          </ComingSoonButton>
          <ComingSoonButton label="Gửi hình ảnh">
            <ImageIcon size={19} />
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
