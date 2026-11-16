"use client";

import { useState } from "react";
import { Box, Button, ButtonBase, IconButton, Tooltip, Typography } from "@mui/material";
import { EyeOff, ShieldAlert } from "lucide-react";
import { mediaUrl, isVideoUrl } from "@/services/postsApi";
import { useTranslation } from "@/i18n/useTranslation";
import ImageLightbox from "./ImageLightbox";

interface PostImagesProps {
  images: string[];
  /** Mô tả ngắn cho ảnh (tên tác giả) để đọc màn hình */
  altPrefix: string;
  /** Tải trước ngay lập tức cho bài viết đầu tiên trên viewport để tối ưu LCP */
  priority?: boolean;
  /** Cờ ảnh nhạy cảm do AI kiểm duyệt gắn cờ */
  isSensitive?: boolean;
}

/** Lưới 1–4 ảnh/video của bài viết; bấm để xem ảnh lớn hoặc phát video; hỗ trợ Safe Blur ảnh nhạy cảm. */
export default function PostImages({
  images,
  altPrefix,
  priority = false,
  isSensitive = false,
}: PostImagesProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { isEnglish: isEn } = useTranslation();

  if (images.length === 0) return null;

  const cols = images.length === 1 ? 1 : 2;
  const single = images.length === 1;
  const isBlurred = isSensitive && !revealed;

  return (
    <>
      <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "12px", mt: 1 }}>
        {/* Lưới hình ảnh / video */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 0.5,
            filter: isBlurred ? "blur(24px)" : "none",
            transform: isBlurred ? "scale(1.04)" : "none",
            transition: "filter 0.35s ease, transform 0.35s ease",
            pointerEvents: isBlurred ? "none" : "auto",
          }}
        >
          {images.map((src, index) => {
            const isVideo = isVideoUrl(src);
            if (isVideo) {
              return (
                <Box
                  key={src}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    bgcolor: "black",
                    borderRadius: "8px",
                    gridColumn: images.length === 3 && index === 0 ? "1 / -1" : undefined,
                  }}
                >
                  <Box
                    component="video"
                    controls
                    preload={priority && index === 0 ? "auto" : "metadata"}
                    src={mediaUrl(src)}
                    sx={{
                      width: "100%",
                      maxHeight: single ? 520 : 320,
                      display: "block",
                    }}
                  />
                </Box>
              );
            }

            return (
              <ButtonBase
                key={src}
                onClick={() => setOpenIndex(index)}
                aria-label={`Xem ảnh ${index + 1} trên ${images.length} của ${altPrefix}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  // Bộ 3 ảnh: ảnh đầu trải rộng hai cột cho cân đối
                  gridColumn: images.length === 3 && index === 0 ? "1 / -1" : undefined,
                  aspectRatio: single ? "auto" : images.length === 3 && index === 0 ? "16 / 9" : "1 / 1",
                }}
              >
                <Box
                  component="img"
                  src={mediaUrl(src)}
                  alt={`Ảnh ${index + 1} của ${altPrefix}`}
                  loading={priority && index === 0 ? "eager" : "lazy"}
                  sx={{
                    width: "100%",
                    height: single ? "auto" : "100%",
                    maxHeight: single ? 520 : undefined,
                    objectFit: single ? "contain" : "cover",
                    display: "block",
                  }}
                />
              </ButtonBase>
            );
          })}
        </Box>

        {/* Lớp phủ cảnh báo Safe Blur khi ảnh nhạy cảm */}
        {isBlurred && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setRevealed(true);
            }}
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(6px)",
              p: 2,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                p: 1.25,
                borderRadius: "50%",
                bgcolor: "rgba(255, 255, 255, 0.15)",
                color: "common.white",
                mb: 1,
                display: "flex",
              }}
            >
              <ShieldAlert size={28} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "common.white", mb: 0.5 }}>
              {isEn ? "Content Warning: Sensitive Media" : "Cảnh báo nội dung: Hình ảnh nhạy cảm"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 2, maxWidth: 300 }}>
              {isEn
                ? "This photo was detected by AI Moderation as potentially sensitive or violent."
                : "Hình ảnh này được hệ thống AI nhận diện có yếu tố nhạy cảm hoặc bạo lực."}
            </Typography>
            <Button
              size="small"
              variant="contained"
              sx={{
                bgcolor: "common.white",
                color: "common.black",
                fontWeight: 700,
                borderRadius: "20px",
                px: 2.5,
                "&:hover": { bgcolor: "grey.100" },
              }}
            >
              {isEn ? "Click to view" : "Nhấn để xem"}
            </Button>
          </Box>
        )}

        {/* Nút làm mờ lại sau khi đã mở */}
        {isSensitive && revealed && (
          <Tooltip title={isEn ? "Blur sensitive media" : "Làm mờ lại"}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setRevealed(false);
              }}
              aria-label={isEn ? "Blur image" : "Làm mờ ảnh"}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 3,
                bgcolor: "rgba(0, 0, 0, 0.6)",
                color: "common.white",
                "&:hover": { bgcolor: "rgba(0, 0, 0, 0.85)" },
              }}
            >
              <EyeOff size={16} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <ImageLightbox
        src={openIndex !== null ? mediaUrl(images[openIndex]) : null}
        alt={openIndex !== null ? `Ảnh ${openIndex + 1} của ${altPrefix}` : ""}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
