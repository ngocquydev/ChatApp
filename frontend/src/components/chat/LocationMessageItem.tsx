"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { ChatMessage, LocationData } from "@/store/useChatStore";
import LocationViewModal from "./LocationViewModal";

interface LocationMessageItemProps {
  message: ChatMessage;
  isMe: boolean;
}

export default function LocationMessageItem({ message, isMe }: LocationMessageItemProps) {
  const { tr } = useTranslation();
  const miniMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [openModal, setOpenModal] = useState(false);

  // Lấy dữ liệu location từ message.location hoặc parse từ text nếu cần
  const location: LocationData | null = message.location || null;

  useEffect(() => {
    if (!location || !miniMapRef.current) return;

    let isMounted = true;

    const initMiniMap = async () => {
      const leaflet = await import("leaflet");

      if (!miniMapRef.current || !isMounted) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const customPinHtml = `
        <div style="position: relative; width: 28px; height: 28px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--mui-palette-error-main)" stroke="var(--mui-palette-common-white)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" fill="var(--mui-palette-common-white)" />
          </svg>
        </div>
      `;

      const customIcon = leaflet.divIcon({
        className: "custom-leaflet-mini-pin",
        html: customPinHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const map = leaflet.map(miniMapRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 15,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        })
        .addTo(map);

      leaflet
        .marker([location.latitude, location.longitude], {
          icon: customIcon,
        })
        .addTo(map);

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    void initMiniMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  if (!location) {
    return (
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <MapPin size={18} color="var(--mui-palette-error-main)" />
        <Typography variant="body2">{message.text}</Typography>
      </Box>
    );
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  return (
    <>
      <Box
        sx={{
          width: { xs: 240, sm: 280 },
          maxWidth: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          bgcolor: isMe ? "primary.dark" : "background.paper",
          color: isMe ? "common.white" : "text.primary",
          border: "1px solid",
          borderColor: isMe ? "transparent" : "divider",
          boxShadow: 1,
          transition: "transform 150ms ease, box-shadow 150ms ease",
          "&:hover": {
            boxShadow: 3,
          },
        }}
      >
        {/* Khung bản đồ thu nhỏ có thể nhấp vào */}
        <Box
          onClick={() => setOpenModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenModal(true);
            }
          }}
          aria-label={tr("Mở xem vị trí trên bản đồ", "Open location on map")}
          sx={{
            position: "relative",
            width: "100%",
            height: 140,
            cursor: "pointer",
            bgcolor: "action.hover",
            "&:hover .map-overlay": {
              opacity: 1,
            },
          }}
        >
          <Box
            ref={miniMapRef}
            sx={{
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />
          {/* Lớp phủ hover mờ với icon phóng to */}
          <Box
            className="map-overlay"
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 150ms ease",
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: "20px",
                bgcolor: "background.paper",
                color: "text.primary",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                boxShadow: 2,
              }}
            >
              <ExternalLink size={14} />
              {tr("Xem chi tiết", "View details")}
            </Box>
          </Box>
        </Box>

        {/* Thông tin địa điểm */}
        <Box sx={{ p: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <MapPin
              size={18}
              color={isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-error-main)"}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: isMe ? "common.white" : "text.primary",
                  lineHeight: 1.3,
                }}
              >
                {location.name || tr("Vị trí đã ghim", "Pinned Location")}
              </Typography>
              {location.address && (
                <Typography
                  variant="caption"
                  sx={{
                    color: isMe ? "rgba(255, 255, 255, 0.82)" : "text.secondary",
                    mt: 0.25,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.25,
                  }}
                >
                  {location.address}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Các nút hành động */}
          <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
            <Button
              size="small"
              variant={isMe ? "contained" : "outlined"}
              onClick={() => setOpenModal(true)}
              sx={{
                flex: 1,
                fontSize: "0.75rem",
                py: 0.4,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                bgcolor: isMe ? "rgba(255, 255, 255, 0.2)" : undefined,
                color: isMe ? "common.white" : "primary.main",
                borderColor: isMe ? "rgba(255, 255, 255, 0.4)" : undefined,
                "&:hover": {
                  bgcolor: isMe ? "rgba(255, 255, 255, 0.3)" : undefined,
                },
              }}
            >
              {tr("Xem bản đồ", "View map")}
            </Button>
            <Button
              size="small"
              variant={isMe ? "contained" : "contained"}
              color="primary"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Navigation size={12} />}
              sx={{
                flex: 1,
                fontSize: "0.75rem",
                py: 0.4,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "8px",
                bgcolor: isMe ? "common.white" : undefined,
                color: isMe ? "primary.main" : undefined,
                "&:hover": {
                  bgcolor: isMe ? "rgba(255, 255, 255, 0.9)" : undefined,
                },
              }}
            >
              {tr("Chỉ đường", "Directions")}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Modal xem bản đồ toàn màn hình */}
      <LocationViewModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        location={location}
      />
    </>
  );
}
