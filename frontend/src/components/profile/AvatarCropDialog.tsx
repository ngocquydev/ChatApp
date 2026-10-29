"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Typography,
} from "@mui/material";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirmCrop: (croppedBlob: Blob) => Promise<void> | void;
  loading?: boolean;
}

const BOX_SIZE = 320; // Kích thước khung hiển thị vuông
const CROP_DIAMETER = 250; // Đường kính vùng tròn avatar

export default function AvatarCropDialog({
  open,
  imageSrc,
  onClose,
  onConfirmCrop,
  loading = false,
}: AvatarCropDialogProps) {
  const { tr } = useTranslation();
  const uid = useId();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Đặt lại trạng thái khi mở dialog mới hoặc đổi ảnh
  useEffect(() => {
    if (open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
      setIsProcessing(false);
    }
  }, [open, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Tính scale cơ sở để ảnh phủ kín vùng crop tròn
  const baseScale = naturalSize
    ? Math.max(CROP_DIAMETER / naturalSize.width, CROP_DIAMETER / naturalSize.height)
    : 1;

  const currentScale = baseScale * zoom;
  const displayedWidth = naturalSize ? naturalSize.width * currentScale : BOX_SIZE;
  const displayedHeight = naturalSize ? naturalSize.height * currentScale : BOX_SIZE;

  // Tọa độ góc trên bên trái của ảnh trong container
  const imgLeft = (BOX_SIZE - displayedWidth) / 2 + pan.x;
  const imgTop = (BOX_SIZE - displayedHeight) / 2 + pan.y;

  // Bắt đầu kéo
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (loading || isProcessing) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Bỏ qua nếu browser không hỗ trợ setPointerCapture
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Bỏ qua
    }
  };

  // Lăn chuột để phóng to/thu nhỏ
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = -e.deltaY * 0.0015;
      const next = Math.min(3, Math.max(1, prev + delta));
      return Number(next.toFixed(3));
    });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Thực hiện cắt ảnh bằng Canvas
  const handleSave = useCallback(async () => {
    if (!imgRef.current || !naturalSize) return;
    setIsProcessing(true);

    try {
      // Vùng crop hình tròn có góc trên-trái tại:
      const cropLeft = (BOX_SIZE - CROP_DIAMETER) / 2;
      const cropTop = (BOX_SIZE - CROP_DIAMETER) / 2;

      // Vị trí tương đối so với ảnh đang hiển thị
      const relX = cropLeft - imgLeft;
      const relY = cropTop - imgTop;

      // Chuyển sang tọa độ ảnh gốc
      const sourceX = relX / currentScale;
      const sourceY = relY / currentScale;
      const sourceSize = CROP_DIAMETER / currentScale;

      const outputCanvas = document.createElement("canvas");
      const OUTPUT_SIZE = 512; // Kích thước xuất ra độ phân giải cao
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext("2d");

      if (!ctx) {
        throw new Error("Không khởi tạo được ngữ cảnh vẽ Canvas");
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Vẽ phần ảnh được chọn lên canvas
      ctx.drawImage(
        imgRef.current,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      outputCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setIsProcessing(false);
            return;
          }
          try {
            await onConfirmCrop(blob);
          } finally {
            setIsProcessing(false);
          }
        },
        "image/jpeg",
        0.92,
      );
    } catch {
      setIsProcessing(false);
    }
  }, [naturalSize, imgLeft, imgTop, currentScale, onConfirmCrop]);

  if (!imageSrc) return null;

  const isBusy = loading || isProcessing;

  return (
    <Dialog
      open={open}
      onClose={isBusy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      disableAutoFocus
      aria-labelledby={`${uid}-dialog-title`}
    >
      <DialogTitle
        id={`${uid}-dialog-title`}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          px: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          fontWeight: 700,
        }}
      >
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {tr("Cắt ảnh đại diện", "Crop profile picture")}
        </Typography>
        <IconButton
          size="small"
          aria-label={tr("Đóng", "Close")}
          onClick={onClose}
          disabled={isBusy}
          sx={{ color: "text.secondary" }}
        >
          <X size={18} aria-hidden />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Khung hiển thị và kéo ảnh */}
        <Box
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          sx={{
            width: BOX_SIZE,
            height: BOX_SIZE,
            maxWidth: "100%",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            bgcolor: "var(--mui-palette-neutral-900)",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: "none",
            touchAction: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          }}
        >
          {/* Ảnh thực tế */}
          <Box
            component="img"
            ref={imgRef}
            src={imageSrc}
            alt={tr("Ảnh cắt đại diện", "Cropped avatar preview")}
            onLoad={handleImageLoad}
            draggable={false}
            sx={{
              position: "absolute",
              left: `${imgLeft}px`,
              top: `${imgTop}px`,
              width: `${displayedWidth}px`,
              height: `${displayedHeight}px`,
              maxWidth: "none",
              pointerEvents: "none",
              transformOrigin: "top left",
            }}
          />

          {/* Vùng tròn cắt avatar (Overlay che mờ 4 phía bên ngoài vòng tròn) */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: (BOX_SIZE - CROP_DIAMETER) / 2,
              left: (BOX_SIZE - CROP_DIAMETER) / 2,
              width: CROP_DIAMETER,
              height: CROP_DIAMETER,
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.9)",
              boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
              pointerEvents: "none",
            }}
          />
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1.5, textAlign: "center", display: "block" }}
        >
          {tr(
            "Kéo để căn chỉnh vị trí · Cuộn chuột hoặc dùng thanh trượt để phóng to",
            "Drag to adjust position · Scroll or use slider to zoom"
          )}
        </Typography>

        {/* Thanh trượt điều khiển Zoom */}
        <Box sx={{ width: "100%", maxWidth: 300, mt: 2, px: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 1.5 }}>
            <ZoomOut size={18} aria-hidden color="var(--mui-palette-neutral-400)" />
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.02}
              aria-label={tr("Thu phóng ảnh", "Zoom image")}
              onChange={(_, val) => setZoom(val as number)}
              disabled={isBusy}
              sx={{
                flex: 1,
                "& .MuiSlider-thumb": {
                  width: 16,
                  height: 16,
                },
              }}
            />
            <ZoomIn size={18} aria-hidden color="var(--mui-palette-neutral-400)" />
            <IconButton
              size="small"
              onClick={handleReset}
              disabled={isBusy}
              aria-label={tr("Đặt lại vị trí và thu phóng", "Reset position and zoom")}
              sx={{ color: "text.secondary" }}
            >
              <RotateCcw size={16} aria-hidden />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2.5, pt: 0, justifyContent: "space-between" }}>
        <Button onClick={onClose} disabled={isBusy} color="inherit">
          {tr("Hủy", "Cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={isBusy}
          startIcon={isBusy ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ px: 3, fontWeight: 700 }}
        >
          {isBusy ? tr("Đang lưu…", "Saving…") : tr("Cắt và Lưu", "Crop & Save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
