"use client";

import { useState, useEffect, useRef, useCallback, ChangeEvent } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Chip,
  CircularProgress,
  Skeleton,
  ButtonBase,
} from "@mui/material";
import { Search, X } from "lucide-react";
import Masonry from "react-masonry-css";
import type { IGif } from "@giphy/js-types";
import { useTranslation } from "@/i18n/useTranslation";

const QUICK_TAGS = [
  { id: "trending", labelVi: "🔥 Xu hướng", labelEn: "🔥 Trending", query: "" },
  { id: "haha", labelVi: "😂 Haha", labelEn: "😂 Haha", query: "haha" },
  { id: "love", labelVi: "❤️ Yêu thích", labelEn: "❤️ Love", query: "love" },
  { id: "cute", labelVi: "🥰 Dễ thương", labelEn: "🥰 Cute", query: "cute" },
  { id: "reaction", labelVi: "😮 Biểu cảm", labelEn: "😮 Reaction", query: "reaction" },
  { id: "clap", labelVi: "👏 Vỗ tay", labelEn: "👏 Applause", query: "applause" },
  { id: "sad", labelVi: "😢 Buồn", labelEn: "😢 Sad", query: "sad" },
  { id: "dance", labelVi: "💃 Nhảy", labelEn: "💃 Dance", query: "dance" },
  { id: "cat", labelVi: "🐱 Mèo", labelEn: "🐱 Cat", query: "cat" },
];

const PAGE_LIMIT:Number = 20;

export interface AppGiphyPickerProps {
  onSelect: (gifUrl: string, title?: string) => void;
  onClose?: () => void;
  width?: number | string;
  height?: number | string;
}

export default function AppGiphyPicker({
  onSelect,
  width = 340,
  height = 420,
}: AppGiphyPickerProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string>("trending");
  const [gifs, setGifs] = useState<IGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchGifs = useCallback(
    async (query: string, currentOffset: number, isInitial = false) => {
      try {
        if (isInitial) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }

        const trimmed = query.trim();
        const params = new URLSearchParams({
        offset: currentOffset.toString(),
        limit: PAGE_LIMIT.toString(),
        lang: isEn ? "en" : "vi",
        rating: "g",
      });
      if (trimmed) {
        params.set("q", trimmed);
      }
      const response = await fetch(`/api/giphy?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Fetch ponse: ${response.statusText}`);
      }
      const res = await response.json();

        const newGifs = res.data || [];      
        setGifs((prev) => (isInitial ? newGifs : [...prev, ...newGifs]));
        setHasMore(newGifs.length === PAGE_LIMIT);
        setOffset(currentOffset + newGifs.length);
      } catch (err) {
        console.error("Lỗi khi tải ảnh GIF từ GIPHY:", err);
        setError(
          isEn
            ? "Could not load GIFs. Please check your connection."
            : "Không tải được ảnh GIF. Vui lòng thử lại sau."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isEn]
  );

  const handleTagClick = (tag: (typeof QUICK_TAGS)[0]) => {
    setActiveTag(tag.id);
    setSearch(tag.query);
    setOffset(0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    void fetchGifs(tag.query, 0, true);
  };

  // Tìm kiếm có debounce
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setActiveTag("");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setOffset(0);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      void fetchGifs(val, 0, true);
    }, 350);
  };

  const handleClearSearch = () => {
    setSearch("");
    setActiveTag("trending");
    setOffset(0);
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    void fetchGifs("", 0, true);
  };

  useEffect(() => {
    void fetchGifs("", 0, true);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchGifs]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
      void fetchGifs(search, offset, false);
    }
  };

  const handlePickGif = (gif: IGif) => {
    // Ưu tiên downsized_medium hoặc fixed_height để chất lượng tốt nhưng dung lượng nhẹ
    const chosenUrl =
      gif.images.downsized_medium?.url ||
      gif.images.fixed_height?.url ||
      gif.images.original?.url ||
      gif.images.fixed_width?.url;

    if (chosenUrl) {
      onSelect(chosenUrl, gif.title);
    }
  };

  return (
    <Box
      sx={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        color: "text.primary",
        overflow: "hidden",
        borderRadius: "16px",
      }}
    >
      {/* Ô tìm kiếm GIF */}
      <Box sx={{ p: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={isEn ? "Search all GIFs via GIPHY…" : "Tìm kiếm tất cả GIF trên GIPHY…"}
          value={search}
          onChange={handleSearchChange}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    aria-label={isEn ? "Clear search" : "Xóa tìm kiếm"}
                    sx={{ p: 0.5 }}
                  >
                    <X size={15} />
                  </IconButton>
                </InputAdornment>
              ) : null,
              sx: {
                borderRadius: "999px",
                bgcolor: "action.hover",
                fontSize: "0.875rem",
              },
            },
          }}
        />
      </Box>

      {/* Dải thẻ gợi ý thể loại */}
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          overflowX: "auto",
          px: 1.5,
          pb: 1,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {QUICK_TAGS.map((tag) => {
          const isSelected = activeTag === tag.id;
          return (
            <Chip
              key={tag.id}
              label={isEn ? tag.labelEn : tag.labelVi}
              size="small"
              onClick={() => handleTagClick(tag)}
              color={isSelected ? "primary" : "default"}
              variant={isSelected ? "filled" : "outlined"}
              sx={{
                fontWeight: isSelected ? 700 : 500,
                fontSize: "0.75rem",
                cursor: "pointer",
                flexShrink: 0,
                borderRadius: "999px",
              }}
            />
          );
        })}
      </Box>

      {/* Lưới Masonry cuộn danh sách GIF */}
      <Box
        ref={scrollContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          pt: 0.5,
          pb: 1,
          overscrollBehavior: "contain",
          "& .giphy-masonry-grid": {
            display: "flex",
            marginLeft: "-6px",
            width: "auto",
          },
          "& .giphy-masonry-column": {
            paddingLeft: "6px",
            backgroundClip: "padding-box",
          },
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: "8px" }} />
              <Skeleton variant="rounded" height={140} sx={{ borderRadius: "8px" }} />
              <Skeleton variant="rounded" height={90} sx={{ borderRadius: "8px" }} />
            </Box>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
              <Skeleton variant="rounded" height={130} sx={{ borderRadius: "8px" }} />
              <Skeleton variant="rounded" height={80} sx={{ borderRadius: "8px" }} />
              <Skeleton variant="rounded" height={120} sx={{ borderRadius: "8px" }} />
            </Box>
          </Box>
        ) : error ? (
          <Box sx={{ py: 6, textAlign: "center", px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {error}
            </Typography>
          </Box>
        ) : gifs.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center", px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {isEn ? "No GIFs found. Try another search!" : "Không tìm thấy ảnh GIF nào. Thử từ khóa khác nhé!"}
            </Typography>
          </Box>
        ) : (
          <>
            <Masonry
              breakpointCols={2}
              className="giphy-masonry-grid"
              columnClassName="giphy-masonry-column"
            >
              {gifs.map((gif) => {
                const previewImg = gif.images.fixed_width || gif.images.fixed_height_small;
                const aspectHeight =
                  previewImg && previewImg.width
                    ? Math.round((Number(previewImg.height) / Number(previewImg.width)) * 140)
                    : 110;

                return (
                  <ButtonBase
                    key={gif.id}
                    onClick={() => handlePickGif(gif)}
                    aria-label={gif.title || "GIF"}
                    sx={{
                      width: "100%",
                      mb: "6px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      bgcolor: "action.hover",
                      display: "block",
                      position: "relative",
                      transition: "transform 0.15s ease, opacity 0.15s ease",
                      "&:hover": {
                        transform: "scale(1.02)",
                        opacity: 0.9,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={previewImg.url}
                      alt={gif.title || "GIF"}
                      loading="lazy"
                      sx={{
                        width: "100%",
                        height: Math.min(Math.max(aspectHeight, 70), 220),
                        objectFit: "cover",
                        display: "block",
                        borderRadius: "8px",
                      }}
                    />
                  </ButtonBase>
                );
              })}
            </Masonry>

            {loadingMore && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                <CircularProgress size={22} />
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Chân trang GIPHY Attribution */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: 0.5,
            fontSize: "0.7rem",
            color: "text.secondary",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          Powered by <strong style={{ color: "var(--mui-palette-primary-main)" }}>GIPHY</strong>
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {isEn ? "Click to send" : "Nhấn để gửi"}
        </Typography>
      </Box>
    </Box>
  );
}
