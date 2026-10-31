"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Compass,
  Copy,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  Square,
  X,
} from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { LocationData, useChatStore } from "@/store/useChatStore";
import { liveLocationTracker } from "@/services/liveLocationTracker";
import { formatLiveRemaining } from "@/utils/liveLocation";

interface LocationViewModalProps {
  open: boolean;
  onClose: () => void;
  location: LocationData | null;
  messageId?: string;
  isMe?: boolean;
}

export default function LocationViewModal({
  open,
  onClose,
  location,
  messageId,
  isMe,
}: LocationViewModalProps) {
  const { tr } = useTranslation();
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Vị trí mới nhất, đọc khi khởi tạo bản đồ mà không làm effect khởi tạo chạy lại mỗi lần cập nhật
  const locationRef = useRef<LocationData | null>(location);

  const [autoFollow, setAutoFollow] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  // Cho phép cập nhật lạc quan tức thì ngay khi bấm Dừng chia sẻ (không chờ socket/parent re-render)
  const [localActiveOverride, setLocalActiveOverride] = useState<boolean | null>(null);

  const stopLiveLocation = useChatStore((s) => s.stopLiveLocation);

  const isLive = Boolean(location?.isLive);

  // Reset override khi mở modal hoặc khi prop location thay đổi
  useEffect(() => {
    setLocalActiveOverride(null);
  }, [open, location?.isLiveActive]);

  // Lắng nghe broadcast nội bộ nếu có nơi khác dừng chia sẻ
  useEffect(() => {
    const handleLocal = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string; isLiveActive?: boolean }>;
      if (
        customEvent.detail?.messageId === messageId &&
        typeof customEvent.detail.isLiveActive === "boolean"
      ) {
        setLocalActiveOverride(customEvent.detail.isLiveActive);
      }
    };
    window.addEventListener("chatapp:location_updated", handleLocal);
    return () => window.removeEventListener("chatapp:location_updated", handleLocal);
  }, [messageId]);

  // Cập nhật timer đếm ngược nếu đang trực tiếp
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    if (!isLive || location?.isLiveActive === false) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [open, isLive, location?.isLiveActive]);

  const isExpired = Boolean(
    location?.liveExpiresAt && now !== null && new Date(location.liveExpiresAt).getTime() <= now,
  );
  const isLiveActive =
    isLive &&
    (localActiveOverride !== null ? localActiveOverride : location?.isLiveActive !== false) &&
    !isExpired;

  // Khởi tạo bản đồ lớn.
  // Dùng callback ref (`mapContainer` state) thay vì đọc ref ngay trong effect: Dialog render
  // nội dung qua Portal nên ở lần commit đầu container chưa tồn tại → map không bao giờ được tạo
  // (bản đồ trắng trơn). Khi container gắn vào DOM, state đổi và effect chạy lại.
  useEffect(() => {
    if (!open || !mapContainer || !locationRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const leaflet = await import("leaflet");

      // Đọc vị trí sau khi await để lấy tọa độ mới nhất
      const initial = locationRef.current;
      if (!isMounted || !initial) return;

      const markerHtml = isLive
        ? `
          <div style="position: relative; width: 42px; height: 42px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;">
            ${
              isLiveActive
                ? `<div style="position: absolute; inset: -12px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: liveRadarPulse 2s infinite ease-out;"></div>`
                : ""
            }
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${
              isLiveActive ? "var(--mui-palette-tone-10b981)" : "var(--mui-palette-neutral-500)"
            }; border: 3.5px solid var(--mui-palette-common-white); box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
              <div style="width: 7px; height: 7px; border-radius: 50%; background: var(--mui-palette-common-white);"></div>
            </div>
          </div>
        `
        : `
          <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--mui-palette-error-main)" stroke="var(--mui-palette-common-white)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" fill="var(--mui-palette-common-white)" />
            </svg>
          </div>
        `;

      const customIcon = leaflet.divIcon({
        className: "custom-leaflet-pin-view",
        html: markerHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const map = leaflet.map(mapContainer, {
        center: [initial.latitude, initial.longitude],
        zoom: 16,
        zoomControl: true,
        // Không zoom bằng con lăn cho tới khi người dùng nhấp vào bản đồ (tránh cuộn nhầm)
        scrollWheelZoom: false,
      });

      map.on("click focus", () => map.scrollWheelZoom.enable());
      map.on("mouseout blur", () => map.scrollWheelZoom.disable());

      mapInstanceRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);

      const marker = leaflet
        .marker([initial.latitude, initial.longitude], {
          icon: customIcon,
        })
        .addTo(map);

      markerRef.current = marker;

      // Khi người dùng tự tay kéo di chuyển bản đồ thì tạm tắt tự động bám theo
      map.on("dragstart", () => {
        setAutoFollow(false);
      });

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
    };

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open, mapContainer, isLive, isLiveActive]);

  // Cập nhật marker mượt mà khi tọa độ thời gian thực thay đổi (không tạo lại bản đồ)
  useEffect(() => {
    locationRef.current = location;
    if (!open || !location || !mapInstanceRef.current || !markerRef.current) return;

    markerRef.current.setLatLng([location.latitude, location.longitude]);
    if (autoFollow) {
      mapInstanceRef.current.panTo([location.latitude, location.longitude], { animate: true });
    }
  }, [open, location, autoFollow]);

  if (!location) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  const handleCopyCoords = () => {
    void navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecenter = () => {
    setAutoFollow(true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.latitude, location.longitude], 16, { animate: true });
    }
  };

  const handleStopSharing = () => {
    setLocalActiveOverride(false);
    if (!messageId) return;
    liveLocationTracker.stop(messageId);
    stopLiveLocation(messageId);
  };

  // Định dạng thời gian còn lại
  const getRemainingTimeString = () => formatLiveRemaining(location.liveExpiresAt, now, tr);

  // Mở link ngoài bằng window.open thay vì <a>: rule `a { color: inherit }` (unlayered)
  // luôn thắng style MUI (@layer) nên nút dạng <a> bị mất màu chữ.
  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableScrollLock
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            bgcolor: "var(--mui-palette-background-paper)",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.75,
          px: 2.5,
          borderBottom: "1px solid",
          borderColor: "var(--mui-palette-divider)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              bgcolor: isLive
                ? isLiveActive
                  ? "rgba(16, 185, 129, 0.12)"
                  : "var(--mui-palette-action-hover)"
                : "rgba(239, 68, 68, 0.1)",
              color: isLive
                ? isLiveActive
                  ? "var(--mui-palette-tone-10b981)"
                  : "var(--mui-palette-neutral-500)"
                : "var(--mui-palette-error-main)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isLive ? <Radio size={20} /> : <MapPin size={20} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.25 }}>
              {isLive
                ? isLiveActive
                  ? tr("Đang chia sẻ vị trí trực tiếp", "Sharing live location")
                  : tr("Vị trí trực tiếp đã kết thúc", "Live location ended")
                : location.name || tr("Chi tiết vị trí", "Location Details")}
            </Typography>
            {isLive && (
              <Typography variant="caption" sx={{ color: "var(--mui-palette-text-secondary)" }}>
                {isLiveActive
                  ? `${tr("Cập nhật thời gian thực", "Real-time updates")} • ${getRemainingTimeString()}`
                  : tr("Đã ngừng truyền tọa độ", "Coordinate streaming stopped")}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isMe && isLiveActive && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleStopSharing}
              startIcon={<Square size={13} fill="currentColor" />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "10px",
                fontSize: "0.8rem",
              }}
            >
              {tr("Dừng chia sẻ", "Stop sharing")}
            </Button>
          )}

          <IconButton
            onClick={onClose}
            size="small"
            aria-label={tr("Đóng", "Close")}
            sx={{ color: "var(--mui-palette-text-secondary)" }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: "relative" }}>
        {/* Nút điều khiển nhanh trên bản đồ (Tự động căn giữa) */}
        <Box
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 400,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Tooltip
            title={
              autoFollow
                ? tr("Đang tự động bám theo vị trí", "Auto-following location")
                : tr("Nhấn để căn giữa và bám theo vị trí", "Click to center and follow location")
            }
          >
            <Chip
              onClick={handleRecenter}
              icon={<Compass size={15} />}
              label={autoFollow ? tr("Đang bám theo", "Following") : tr("Căn giữa", "Center")}
              color={autoFollow ? "success" : "default"}
              variant={autoFollow ? "filled" : "outlined"}
              clickable
              sx={{
                bgcolor: autoFollow ? "rgba(16, 185, 129, 0.9)" : "var(--mui-palette-background-paper)",
                color: autoFollow ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
                fontWeight: 600,
                boxShadow: 2,
                backdropFilter: "blur(6px)",
              }}
            />
          </Tooltip>
        </Box>

        {/* Bản đồ tương tác */}
        <Box sx={{ width: "100%", height: 420 }}>
          <Box
            ref={setMapContainer}
            sx={{
              width: "100%",
              height: "100%",
            }}
          />
        </Box>

        {/* Thông tin địa chỉ & Tọa độ */}
        <Box sx={{ p: 2.5, bgcolor: "var(--mui-palette-action-hover)" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--mui-palette-text-primary)" }}>
            {location.name || tr("Vị trí đã ghim", "Pinned Location")}
          </Typography>
          {location.address && (
            <Typography variant="body2" sx={{ color: "var(--mui-palette-text-secondary)", mt: 0.5 }}>
              {location.address}
            </Typography>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Typography variant="caption" sx={{ color: "var(--mui-palette-text-secondary)", fontFamily: "monospace" }}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Typography>
            <Tooltip title={copied ? tr("Đã sao chép!", "Copied!") : tr("Sao chép tọa độ", "Copy coordinates")}>
              <IconButton
                size="small"
                onClick={handleCopyCoords}
                aria-label={tr("Sao chép tọa độ", "Copy coordinates")}
                color={copied ? "success" : "default"}
              >
                <Copy size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.75,
          borderTop: "1px solid",
          borderColor: "var(--mui-palette-divider)",
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={() => openExternal(googleMapsUrl)}
          startIcon={<ExternalLink size={16} />}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
        >
          {tr("Mở trên Google Maps", "Open Google Maps")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => openExternal(directionsUrl)}
          startIcon={<Navigation size={16} />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
        >
          {tr("Chỉ đường", "Get Directions")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}