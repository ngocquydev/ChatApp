"use client";

import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Copy, ExternalLink, MapPin, Navigation, X } from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { LocationData } from "@/store/useChatStore";

interface LocationViewModalProps {
  open: boolean;
  onClose: () => void;
  location: LocationData | null;
}

export default function LocationViewModal({
  open,
  onClose,
  location,
}: LocationViewModalProps) {
  const { tr } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!open || !location) return;

    let isMounted = true;

    const initMap = async () => {
      const leaflet = await import("leaflet");

      if (!mapContainerRef.current || !isMounted) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const customPinHtml = `
        <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--mui-palette-error-main)" stroke="var(--mui-palette-common-white)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" fill="var(--mui-palette-common-white)" />
          </svg>
        </div>
      `;

      const customIcon = leaflet.divIcon({
        className: "custom-leaflet-pin-view",
        html: customPinHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const map = leaflet.map(mapContainerRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 16,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
      }, 300);
    };

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open, location]);

  if (!location) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  const handleCopyCoords = () => {
    void navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`);
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
            bgcolor: "background.paper",
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
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: "error.lighter",
              color: "error.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MapPin size={20} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {location.name || tr("Chi tiết vị trí", "Location Details")}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label={tr("Đóng", "Close")}
          sx={{ color: "text.secondary" }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Bản đồ tương tác */}
        <Box sx={{ width: "100%", height: 420 }}>
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: "100%",
            }}
          />
        </Box>

        {/* Thông tin địa chỉ & Tọa độ */}
        <Box sx={{ p: 2.5, bgcolor: "action.hover" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
            {location.name || tr("Vị trí đã ghim", "Pinned Location")}
          </Typography>
          {location.address && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {location.address}
            </Typography>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Typography>
            <Tooltip title={tr("Sao chép tọa độ", "Copy coordinates")}>
              <IconButton size="small" onClick={handleCopyCoords} aria-label={tr("Sao chép tọa độ", "Copy coordinates")}>
                <Copy size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: "1px solid", borderColor: "divider", gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<ExternalLink size={16} />}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
        >
          {tr("Mở trên Google Maps", "Open Google Maps")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<Navigation size={16} />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
        >
          {tr("Chỉ đường", "Get Directions")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
