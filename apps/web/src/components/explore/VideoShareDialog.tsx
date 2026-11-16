"use client";

import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from "@mui/material";
import { Copy, Repeat2, Share2, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { mediaUrl, type PostView } from "@/services/postsApi";
import { externalShareableVideoUrl, videoShareLinks } from "./shortVideoActions";
import { SHORT_VIDEO_COPY as COPY } from "./shortVideoExploreUi";

interface VideoShareDialogProps {
  post: PostView | null;
  videoUrl: string | null;
  onClose: () => void;
  onShareInApp: (post: PostView) => void;
}

export default function VideoShareDialog({ post, videoUrl, onClose, onShareInApp }: VideoShareDialogProps) {
  const { t, tr } = useTranslation();
  const [message, setMessage] = useState<"copied" | "copyError" | "shareError" | null>(null);
  const externalVideoUrl = post ? externalShareableVideoUrl(post, videoUrl) : null;
  const shareUrl = externalVideoUrl ? mediaUrl(externalVideoUrl) : null;
  const links = shareUrl ? videoShareLinks(shareUrl) : null;

  const close = () => {
    setMessage(null);
    onClose();
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("copied");
    } catch {
      setMessage("copyError");
    }
  };

  const shareWithDevice = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({ url: shareUrl });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("shareError");
    }
  };

  const platforms = links ? [
    { href: links.facebook, label: tr(COPY.facebook) },
    { href: links.x, label: tr(COPY.x) },
    { href: links.whatsapp, label: tr(COPY.whatsapp) },
    { href: links.telegram, label: tr(COPY.telegram) },
  ] : [];

  return (
    <Dialog open={Boolean(post)} onClose={close} fullWidth maxWidth="xs" aria-labelledby="video-share-title">
      <DialogTitle id="video-share-title" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
        {tr(COPY.shareTitle)}
        <IconButton aria-label={t("common.close")} onClick={close}><X size={20} aria-hidden /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Button variant="contained" startIcon={<Repeat2 size={18} aria-hidden />} onClick={() => { if (post) onShareInApp(post); }}>
            {tr(COPY.shareInApp)}
          </Button>

          {shareUrl && links ? (
            <>
              <Typography variant="body2" color="text.secondary">{tr(COPY.shareDirectLink)}</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1 }}>
                {platforms.map(({ href, label }) => (
                  <Button key={href} component="a" href={href} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ minWidth: 0 }}>
                    {label}
                  </Button>
                ))}
              </Box>
              <TextField fullWidth size="small" value={shareUrl} slotProps={{ input: { readOnly: true }, htmlInput: { "aria-label": tr(COPY.copyLink) } }} />
              <Button variant="outlined" startIcon={<Copy size={18} aria-hidden />} onClick={() => void copy()}>{tr(COPY.copyLink)}</Button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <Button variant="outlined" startIcon={<Share2 size={18} aria-hidden />} onClick={() => void shareWithDevice()}>{tr(COPY.shareMore)}</Button>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">{tr(COPY.sharePrivate)}</Typography>
          )}

          {message && <Alert severity={message === "copied" ? "success" : "error"} onClose={() => setMessage(null)}>{tr(message === "copied" ? COPY.copiedLink : message === "copyError" ? COPY.copyFailed : COPY.shareFailed)}</Alert>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
