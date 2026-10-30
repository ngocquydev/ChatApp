"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Crosshair, MapPin, Navigation, Search, X } from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { LocationData } from "@/store/useChatStore";

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationData) => void;
}

// Tọa độ mặc định (Hà Nội, Việt Nam) nếu không lấy được GPS ngay
const DEFAULT_LAT = 21.0285;
const DEFAULT_LNG = 105.8542;

export default function LocationPickerModal({
  open,
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const { tr } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [address, setAddress] = useState<string>("");
  const [placeName, setPlaceName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Reverse geocode dùng OpenStreetMap Nominatim
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setIsGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "vi,en",
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        const displayName = (data?.display_name as string) || "";
        const name = (data?.name as string) || (data?.address?.road as string) || "";
        setAddress(displayName);
        setPlaceName(name);
      }
    } catch {
      // Fallback
    } finally {
      setIsGeocoding(false);
    }
  };

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const initMap = async () => {
      const leaflet = await import("leaflet");

      if (!mapContainerRef.current || !isMounted) return;

      // Xóa bản đồ cũ nếu đã có
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Tạo custom SVG pin icon
      const customPinHtml = `
        <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="var(--mui-palette-error-main)" stroke="var(--mui-palette-common-white)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" fill="var(--mui-palette-common-white)" />
          </svg>
        </div>
      `;

      const customIcon = leaflet.divIcon({
        className: "custom-leaflet-pin",
        html: customPinHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const initialLat = DEFAULT_LAT;
      const initialLng = DEFAULT_LNG;

      const map = leaflet.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Tile layer từ OpenStreetMap
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);

      // Marker
      const marker = leaflet
        .marker([initialLat, initialLng], {
          draggable: true,
          icon: customIcon,
        })
        .addTo(map);

      markerRef.current = marker;

      // Kéo marker
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        setCoords({ lat: position.lat, lng: position.lng });
        void fetchAddress(position.lat, position.lng);
      });

      // Nhấp chuột trên bản đồ để di chuyển marker
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setCoords({ lat, lng });
        void fetchAddress(lat, lng);
      });

      // Lấy địa chỉ ban đầu
      void fetchAddress(initialLat, initialLng);

      // Cập nhật kích thước render sau khi Dialog hoàn tất animation
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
  }, [open]);

  // Lấy vị trí GPS hiện tại của người dùng
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(tr("Trình duyệt không hỗ trợ định vị GPS", "Geolocation is not supported by your browser"));
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
        }

        void fetchAddress(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Lỗi GPS:", err);
        setGeoError(
          tr(
            "Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí trên trình duyệt hoặc ghim vị trí thủ công trên bản đồ.",
            "Could not access location. Please allow location permissions or drag the pin on the map.",
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Tìm kiếm địa điểm qua Nominatim
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    try {
      setIsSearching(true);
      setGeoError(null);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "vi,en",
          },
        },
      );
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          const item = results[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          setCoords({ lat: newLat, lng: newLng });
          setAddress((item.display_name as string) || query);
          setPlaceName((item.name as string) || query);

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 });
            markerRef.current.setLatLng([newLat, newLng]);
          }
        } else {
          setGeoError(tr("Không tìm thấy kết quả phù hợp với địa chỉ này", "No results found for this address"));
        }
      }
    } catch {
      setGeoError(tr("Lỗi khi tìm kiếm địa chỉ. Vui lòng thử lại", "Failed to search location. Please try again"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation({
      latitude: coords.lat,
      longitude: coords.lng,
      address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
      name: placeName || tr("Vị trí đã ghim", "Pinned Location"),
    });
    onClose();
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
            {tr("Chia sẻ vị trí", "Share Location")}
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

      <DialogContent sx={{ p: 0, position: "relative" }}>
        {/* Thanh tìm kiếm & Nút định vị GPS */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSearchLocation}
            sx={{ flex: 1, display: "flex", gap: 1 }}
          >
            <TextField
              fullWidth
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr("Tìm kiếm địa chỉ, địa danh…", "Search address or place…")}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="var(--mui-palette-text-secondary)" />
                    </InputAdornment>
                  ),
                },
                htmlInput: {
                  "aria-label": tr("Tìm kiếm địa chỉ", "Search address"),
                },
              }}
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={isSearching || !searchQuery.trim()}
              sx={{ minWidth: 90, textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
            >
              {isSearching ? <CircularProgress size={18} /> : tr("Tìm", "Search")}
            </Button>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={isLocating ? <CircularProgress size={18} color="inherit" /> : <Crosshair size={18} />}
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "10px",
              whiteSpace: "nowrap",
            }}
          >
            {tr("Vị trí của tôi", "My Location")}
          </Button>
        </Box>

        {geoError && (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: "error.lighter",
              color: "error.main",
              fontSize: "0.85rem",
              borderBottom: "1px solid",
              borderColor: "error.light",
            }}
          >
            {geoError}
          </Box>
        )}

        {/* Khung hiển thị Leaflet Map */}
        <Box sx={{ position: "relative", width: "100%", height: 380 }}>
          <Box
            ref={mapContainerRef}
            sx={{
              width: "100%",
              height: "100%",
              zIndex: 1,
            }}
          />

          {/* Nút định vị nhanh nổi trên bản đồ */}
          <Tooltip title={tr("Lấy vị trí hiện tại", "Get current GPS")}>
            <IconButton
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              sx={{
                position: "absolute",
                bottom: 20,
                right: 20,
                zIndex: 10,
                bgcolor: "background.paper",
                color: "primary.main",
                boxShadow: 3,
                "&:hover": { bgcolor: "background.paper", color: "primary.dark" },
              }}
            >
              {isLocating ? <CircularProgress size={20} /> : <Crosshair size={22} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Thông tin địa chỉ đã chọn */}
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <MapPin size={22} color="var(--mui-palette-error-main)" style={{ marginTop: 2, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                {placeName || tr("Vị trí đã chọn", "Selected Location")}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 0.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {isGeocoding ? (
                  <span style={{ fontStyle: "italic" }}>
                    {tr("Đang xác định địa chỉ…", "Determining address…")}
                  </span>
                ) : (
                  address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                )}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · {tr("Nhấp vào bản đồ hoặc kéo ghim để đổi vị trí", "Click or drag pin to adjust")}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}>
          {tr("Hủy", "Cancel")}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirm}
          startIcon={<Navigation size={18} />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 2.5 }}
        >
          {tr("Gửi vị trí này", "Send this location")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
