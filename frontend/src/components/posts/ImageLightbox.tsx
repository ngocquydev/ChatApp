"use client";

import { Box, Dialog, IconButton } from "@mui/material";
import { X } from "lucide-react";

interface ImageLightboxProps {
  /** URL đầy đủ của ảnh; null = đóng */
  src: string | null;
  alt: string;
  onClose: () => void;
}

/** Xem ảnh lớn trong hộp thoại nền đen. */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <Dialog
      open={!!src}
      onClose={onClose}
      maxWidth="lg"
      slotProps={{ paper: { sx: { bgcolor: "common.black", boxShadow: "none", m: 1 } } }}
    >
      {src && (
        <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <Box component="img" src={src} alt={alt} sx={{ maxWidth: "100%", maxHeight: "90dvh", objectFit: "contain" }} />
          <IconButton
            aria-label="Đóng ảnh"
            onClick={onClose}
            sx={{ position: "absolute", top: 8, right: 8, bgcolor: "common.black", color: "common.white", "&:hover": { bgcolor: "grey.800" } }}
          >
            <X size={20} aria-hidden />
          </IconButton>
        </Box>
      )}
    </Dialog>
  );
}
