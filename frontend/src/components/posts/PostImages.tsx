"use client";

import { useState } from "react";
import { Box, ButtonBase } from "@mui/material";
import { mediaUrl, isVideoUrl } from "@/services/postsApi";
import ImageLightbox from "./ImageLightbox";

interface PostImagesProps {
  images: string[];
  /** Mô tả ngắn cho ảnh (tên tác giả) để đọc màn hình */
  altPrefix: string;
  /** Tải trước ngay lập tức cho bài viết đầu tiên trên viewport để tối ưu LCP */
  priority?: boolean;
}

/** Lưới 1–4 ảnh/video của bài viết; bấm để xem ảnh lớn hoặc phát video. */
export default function PostImages({ images, altPrefix, priority = false }: PostImagesProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (images.length === 0) return null;

  const cols = images.length === 1 ? 1 : 2;
  const single = images.length === 1;

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 0.5,
          mt: 1,
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

      <ImageLightbox
        src={openIndex !== null ? mediaUrl(images[openIndex]) : null}
        alt={openIndex !== null ? `Ảnh ${openIndex + 1} của ${altPrefix}` : ""}
        onClose={() => setOpenIndex(null)}
      />
    </>
  );
}
