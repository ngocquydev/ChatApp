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
  Alert,
  Snackbar,
} from "@mui/material";
import { Image as ImageIcon, MapPin, Paperclip, Send, Smile, ThumbsUp } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { uploadMedia, MAX_FILE_BYTES } from "@/services/postsApi";
import { LocationData } from "@/store/useChatStore";
import LocationPickerModal from "../LocationPickerModal";
import AppEmojiPicker from "@/components/common/AppEmojiPicker";
import AppGiphyPicker from "@/components/common/AppGiphyPicker";
import { GifIcon } from "@/components/common/GifIcon";
import MentionAutocomplete, { MentionAutocompleteHandle } from "@/components/common/MentionAutocomplete";
import useMention from "@/hooks/useMention";

const TYPING_THROTTLE_MS = 2500;
const TYPING_IDLE_MS = 5000;

const POPULAR_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "🥳", "😭", "😮",
  "👍", "❤️", "🔥", "🎉", "👏", "💯", "✨", "🙏",
  "👋", "☕", "🚀", "💪",
];

interface MessageComposerProps {
  onSend: (
    text: string,
    options?: {
      type?: "text" | "location";
      location?: LocationData;
    },
  ) => Promise<void> | void;
  onTyping: (isTyping: boolean) => void;
  isBlocked?: boolean;
  isBlockedByMe?: boolean;
  onUnblock?: () => void;
}

function ComingSoonButton({ label, children }: { label: string; children: React.ReactNode }) {
  const { tr } = useTranslation();
  return (
    <Tooltip title={`${label} — ${tr("sắp ra mắt", "coming soon")}`}>
      <span>
        <IconButton size="small" disabled aria-label={`${label} (${tr("sắp ra mắt", "coming soon")})`}>
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
  const { tr } = useTranslation();
  const [text, setText] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [openLocationPicker, setOpenLocationPicker] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [gifAnchorEl, setGifAnchorEl] = useState<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const mentionRef = useRef<MentionAutocompleteHandle | null>(null);
  const { mentionOpen, mentionQuery, mentionAnchorEl, checkMention, insertMention, closeMention } = useMention(text, setText, inputRef);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const canSend = text.trim().length > 0;

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_BYTES) {
      setFileError(tr(`Tệp “${file.name}” vượt quá giới hạn tối đa 100MB.`, `File “${file.name}” exceeds 100MB limit.`));
      return;
    }
    setUploadingMedia(true);
    try {
      const res = await uploadMedia(file);
      if (res?.url) {
        await onSend(res.url);
      }
    } catch {
      setFileError(tr("Không thể tải tệp lên. Vui lòng thử lại sau.", "Could not upload file. Please try again later."));
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_BYTES) {
      setFileError(tr(`Tệp “${file.name}” vượt quá giới hạn tối đa 100MB.`, `File “${file.name}” exceeds 100MB limit.`));
      return;
    }
    setUploadingMedia(true);
    try {
      const res = await uploadMedia(file);
      if (res?.url) {
        await onSend(res.url);
      }
    } catch {
      setFileError(tr("Không thể tải tệp lên. Vui lòng thử lại sau.", "Could not upload file. Please try again later."));
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
    checkMention(value);

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
    if (mentionRef.current?.handleKeyDown(e)) return;
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
            ? tr("Bạn đã chặn người dùng này. Bỏ chặn để tiếp tục trò chuyện.", "You have blocked this user. Unblock to continue chatting.")
            : tr("Người dùng này hiện không thể nhận tin nhắn vào lúc này.", "This user cannot receive messages right now.")}
        </Typography>
        {isBlockedByMe && onUnblock && (
          <Button variant="outlined" size="small" color="primary" onClick={onUnblock} sx={{ borderRadius: "8px" }}>
            {tr("Bỏ chặn", "Unblock")}
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
          gap: 0.75,
        }}
      >
        <Box sx={{ display: "flex", pb: 0.35, alignItems: "center", gap: 0.25 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={handleMediaSelect}
            aria-label={tr("Chọn ảnh hoặc video để gửi", "Choose image or video to send")}
          />
          <Tooltip title={uploadingMedia ? tr("Đang tải tệp lên…", "Uploading file…") : tr("Gửi ảnh hoặc video", "Send image or video")}>
            <span>
              <IconButton
                size="small"
                disabled={uploadingMedia}
                aria-label={tr("Gửi ảnh hoặc video", "Send image or video")}
                onClick={() => fileInputRef.current?.click()}
                sx={{ color: "primary.main" }}
              >
                {uploadingMedia ? <CircularProgress size={18} /> : <ImageIcon size={20} />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={tr("Chia sẻ vị trí", "Share location")}>
            <IconButton
              size="small"
              aria-label={tr("Chia sẻ vị trí", "Share location")}
              onClick={() => setOpenLocationPicker(true)}
              sx={{ color: "primary.main" }}
            >
              <MapPin size={20} />
            </IconButton>
          </Tooltip>
          <input
            ref={docInputRef}
            type="file"
            hidden
            onChange={handleFileSelect}
            aria-label={tr("Chọn tệp để gửi (tối đa 100MB)", "Choose file to send (max 100MB)")}
          />
          <Tooltip title={uploadingMedia ? tr("Đang tải tệp lên…", "Uploading file…") : tr("Đính kèm tệp (tối đa 100MB)", "Attach file (max 100MB)")}>
            <span>
              <IconButton
                size="small"
                disabled={uploadingMedia}
                aria-label={tr("Đính kèm tệp (tối đa 100MB)", "Attach file (max 100MB)")}
                onClick={() => docInputRef.current?.click()}
                sx={{ color: "primary.main" }}
              >
                <Paperclip size={20} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "transparent",
            borderRadius: "24px",
            pl: 2,
            pr: 0.75,
            py: 0.25,
            transition: "border-color 150ms, background-color 150ms",
            "&:focus-within": {
              borderColor: "primary.main",
              bgcolor: "background.paper",
            },
          }}
        >
          <TextField
            fullWidth
            multiline
            inputRef={inputRef}
            maxRows={5}
            variant="standard"
            placeholder="Aa (@ để tag bạn bè hoặc @aura)"
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            slotProps={{
              htmlInput: { "aria-label": tr("Nội dung tin nhắn", "Message content"), enterKeyHint: "send" },
              input: { disableUnderline: true, sx: { py: 0.65, fontSize: "0.9375rem" } },
            }}
          />

          <Tooltip title={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}>
            <IconButton
              size="small"
              aria-label={tr("Chọn ảnh GIF từ GIPHY", "Choose GIF from GIPHY")}
              onClick={(e: MouseEvent<HTMLButtonElement>) => setGifAnchorEl(e.currentTarget)}
              sx={{ color: "primary.main", mb: 0.25 }}
            >
              <GifIcon size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title={tr("Chọn biểu tượng cảm xúc", "Choose emoji")}>
            <IconButton
              size="small"
              aria-label={tr("Chọn biểu tượng cảm xúc", "Choose emoji")}
              onClick={(e: MouseEvent<HTMLButtonElement>) => setEmojiAnchorEl(e.currentTarget)}
              sx={{ color: "primary.main", mb: 0.25 }}
            >
              <Smile size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        {canSend ? (
          <Tooltip title={tr("Gửi (Enter)", "Send (Enter)")}>
            <IconButton
              onClick={() => void submit()}
              aria-label={tr("Gửi tin nhắn", "Send message")}
              sx={{
                mb: 0.25,
                width: 38,
                height: 38,
                color: "primary.main",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Send size={19} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title={tr("Gửi biểu tượng thích", "Send a like")}>
            <IconButton
              onClick={() => void submit("👍")}
              aria-label={tr("Gửi biểu tượng thích", "Send a like")}
              sx={{
                mb: 0.25,
                width: 38,
                height: 38,
                color: "primary.main",
                "&:hover": { bgcolor: "action.hover", transform: "scale(1.08)" },
              }}
            >
              <ThumbsUp size={20} />
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
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: 4,
              mb: 1,
            },
          },
        }}
      >
        <AppEmojiPicker
          onEmojiSelect={(emoji) => {
            handleChange(`${text}${emoji}`);
            setEmojiAnchorEl(null);
          }}
          width={320}
          height={380}
        />
      </Popover>

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
              overflow: "hidden",
              boxShadow: 4,
              mb: 1,
            },
          },
        }}
      >
        <AppGiphyPicker
          onSelect={(gifUrl) => {
            setGifAnchorEl(null);
            void onSend(gifUrl);
          }}
          onClose={() => setGifAnchorEl(null)}
          width={340}
          height={400}
        />
      </Popover>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: "none", md: "block" }, mt: 0.5, px: 1.5, fontSize: "0.7rem" }}
      >
        {tr("Enter để gửi · Shift + Enter để xuống dòng", "Enter to send · Shift + Enter for new line")}
      </Typography>

      <LocationPickerModal
        open={openLocationPicker}
        onClose={() => setOpenLocationPicker(false)}
        onSelectLocation={(loc) => {
          const defaultText = loc.isLive
            ? tr("🛰️ Vị trí trực tiếp (Thời gian thực)", "🛰️ Live location (Real-time)")
            : (loc.name || loc.address || tr("📍 Vị trí đã ghim", "📍 Pinned Location"));
          void onSend(defaultText, {
            type: "location",
            location: loc,
          });
        }}
      />
    </Box>
  );
}
