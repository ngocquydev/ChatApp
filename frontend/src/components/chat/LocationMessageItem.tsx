"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, ButtonBase, Typography } from "@mui/material";
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
          width: { xs: 260, sm: 295 },
          maxWidth: "100%",
          borderRadius: "18px",
          overflow: "hidden",
          bgcolor: isMe ? "primary.main" : "background.paper",
          color: isMe ? "common.white" : "text.primary",
          border: "1px solid",
          borderColor: isMe ? "rgba(255, 255, 255, 0.18)" : "divider",
          boxShadow: 2,
          transition: "transform 150ms ease, box-shadow 150ms ease",
          "&:hover": {
            boxShadow: 4,
          },
        }}
      >
        {/* Khung bản đồ thu nhỏ có thể nhấp vào */}
        <ButtonBase
          onClick={() => setOpenModal(true)}
          aria-label={tr("Mở xem vị trí trên bản đồ", "Open location on map")}
          sx={{
            position: "relative",
            width: "100%",
            height: 145,
            display: "block",
            textAlign: "inherit",
            cursor: "pointer",
            bgcolor: "action.hover",
            overflow: "hidden",
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

          {/* Huy hiệu Vị trí nổi ở góc trên */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 400,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.35,
              borderRadius: "10px",
              bgcolor: "rgba(0, 0, 0, 0.65)",
              color: "common.white",
              fontSize: "0.7rem",
              fontWeight: 600,
              pointerEvents: "none",
            }}
          >
            <MapPin size={12} color="var(--mui-palette-error-main)" />
            <span>{tr("Vị trí", "Location")}</span>
          </Box>

          {/* Lớp phủ hover mờ với icon phóng to */}
          <Box
            className="map-overlay"
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0, 0, 0, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              transition: "opacity 150ms ease",
              zIndex: 401,
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
        </ButtonBase>

        {/* Thông tin địa điểm */}
        <Box sx={{ p: 1.75, pt: 1.5 }}>
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
                  fontSize: "0.92rem",
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
                    color: isMe ? "rgba(255, 255, 255, 0.85)" : "text.secondary",
                    mt: 0.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.35,
                  }}
                >
                  {location.address}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Các nút hành động */}
          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
            <Button
              size="small"
              onClick={() => setOpenModal(true)}
              startIcon={<ExternalLink size={13} />}
              sx={{
                flex: 1,
                fontSize: "0.75rem",
                py: 0.6,
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                bgcolor: isMe ? "rgba(255, 255, 255, 0.16)" : "action.hover",
                color: isMe ? "common.white" : "text.primary",
                border: "1px solid",
                borderColor: isMe ? "rgba(255, 255, 255, 0.3)" : "divider",
                "& .MuiButton-startIcon": {
                  color: isMe ? "common.white" : "text.secondary",
                },
                "&:hover": {
                  bgcolor: isMe ? "rgba(255, 255, 255, 0.25)" : "action.selected",
                },
              }}
            >
              {tr("Xem bản đồ", "View map")}
            </Button>
            <Button
              size="small"
              component="a"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Navigation size={13} />}
              sx={{
                flex: 1,
                fontSize: "0.75rem",
                py: 0.6,
                textTransform: "none",
                fontWeight: 700,
                borderRadius: "10px",
                bgcolor: isMe ? "common.white" : "primary.main",
                color: isMe ? "primary.dark" : "primary.contrastText",
                boxShadow: isMe ? "0 2px 6px rgba(0,0,0,0.15)" : 1,
                "&, &:hover, &:focus, &:active": {
                  color: isMe
                    ? "var(--mui-palette-primary-dark) !important"
                    : "var(--mui-palette-primary-contrastText) !important",
                },
                "& .MuiButton-startIcon": {
                  color: isMe
                    ? "var(--mui-palette-primary-dark) !important"
                    : "var(--mui-palette-primary-contrastText) !important",
                },
                "&:hover": {
                  bgcolor: isMe ? "rgba(255, 255, 255, 0.92)" : "primary.dark",
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
