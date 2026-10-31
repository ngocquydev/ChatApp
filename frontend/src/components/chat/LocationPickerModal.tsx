"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Crosshair, MapPin, Navigation, Radio, Search, X } from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { LocationData } from "@/store/useChatStore";
import LiveDurationSelector from "./LiveDurationSelector";
import { formatLiveDuration } from "@/utils/liveLocation";

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationData) => void;
}


// Tọa độ trung tâm Việt Nam dự phòng nếu hoàn toàn không có GPS lẫn IP
const FALLBACK_LAT = 16.0544;
const FALLBACK_LNG = 108.2022;


async function fetchIpLocation(): Promise<{ lat: number; lng: number } | null> {
  // 1. Thử freeipapi.com
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://freeipapi.com/api/json", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
  } catch {
    // Tiếp tục thử dịch vụ dự phòng
  }

  // 2. Dự phòng qua ipwho.is
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://ipwho.is/", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch {
    // Không lấy được qua IP
  }

  return null;
}

/**
 * Thử lấy tọa độ người dùng nhanh nhất có thể: GPS trình duyệt -> Fallback IP
 */
async function detectQuickLocation(): Promise<{ lat: number; lng: number } | null> {
  if (typeof window !== "undefined" && navigator.geolocation) {
    try {
      const gpsCoords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 },
        );
      });
      return gpsCoords;
    } catch {
      // Bị từ chối hoặc timeout trên máy tính -> chuyển sang IP
    }
  }

  return await fetchIpLocation();
}

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
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
  });
  const [shareMode, setShareMode] = useState<"static" | "live">("static");
  const [liveDurationMinutes, setLiveDurationMinutes] = useState<number>(15);
  const [address, setAddress] = useState<string>("");
  const [placeName, setPlaceName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Reverse geocode dùng OpenStreetMap Nominatim
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
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
  }, []);

  // Hàm định vị chi tiết (GPS độ chính xác cao -> IP Fallback)
  const locateUser = useCallback(async (isManual = false) => {
    setIsLocating(true);
    setGeoError(null);

    // 1. Thử lấy GPS độ chính xác cao qua Web Geolocation API
    const tryGps = (): Promise<{ lat: number; lng: number } | null> => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => {
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: isManual ? 8000 : 4000, maximumAge: 60000 },
        );
      });
    };

    let loc = await tryGps();

    // 2. Nếu GPS không khả dụng hoặc bị từ chối / timeout trên trình duyệt, thử IP Geolocation
    if (!loc) {
      loc = await fetchIpLocation();
    }

    setIsLocating(false);

    if (loc) {
      setCoords(loc);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([loc.lat, loc.lng], 16, { duration: 1.2 });
        markerRef.current.setLatLng([loc.lat, loc.lng]);
      }
      void fetchAddress(loc.lat, loc.lng);
    } else if (isManual) {
      setGeoError(
        tr(
          "Không thể xác định vị trí tự động. Vui lòng cấp quyền vị trí trên trình duyệt hoặc kéo ghim thủ công trên bản đồ.",
          "Could not determine location. Please allow location permissions or drag the pin on the map.",
        ),
      );
    }
  }, [fetchAddress, tr]);

  // Khởi tạo bản đồ Leaflet & tự động định vị vị trí hiện tại
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

      // Tự động nhận diện vị trí người dùng ngay lập tức
      setIsLocating(true);
      const userLoc = await detectQuickLocation();
      if (!isMounted || !mapContainerRef.current) return;

      const initialLat = userLoc ? userLoc.lat : FALLBACK_LAT;
      const initialLng = userLoc ? userLoc.lng : FALLBACK_LNG;
      const initialZoom = userLoc ? 16 : 6;

      if (userLoc) {
        setCoords(userLoc);
      }
      setIsLocating(false);

      const map = leaflet.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true,
        // Tắt zoom bằng con lăn mặc định để cuộn hộp thoại không vô tình phóng to/thu nhỏ bản đồ.
        // Chỉ bật khi người dùng chủ động nhấp vào bản đồ; tắt lại khi rời chuột khỏi bản đồ.
        scrollWheelZoom: false,
      });

      map.on("click focus", () => map.scrollWheelZoom.enable());
      map.on("mouseout blur", () => map.scrollWheelZoom.disable());

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

      // Lấy địa chỉ ban đầu của tọa độ thực tế
      if (userLoc) {
        void fetchAddress(initialLat, initialLng);
      }

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
  }, [open, fetchAddress]);

  // Lấy vị trí GPS hiện tại của người dùng khi nhấn nút
  const handleGetCurrentLocation = () => {
    void locateUser(true);
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
    if (shareMode === "live") {
      const expiresAt = new Date(Date.now() + liveDurationMinutes * 60 * 1000).toISOString();
      onSelectLocation({
        latitude: coords.lat,
        longitude: coords.lng,
        address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        name: placeName || tr("Vị trí trực tiếp", "Live Location"),
        isLive: true,
        liveExpiresAt: expiresAt,
        isLiveActive: true,
      });
    } else {
      onSelectLocation({
        latitude: coords.lat,
        longitude: coords.lng,
        address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        name: placeName || tr("Vị trí đã ghim", "Pinned Location"),
        isLive: false,
        isLiveActive: false,
      });
    }
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

      {/* Tabs chọn chế độ: Ghim vị trí tĩnh hoặc Chia sẻ trực tiếp kiểu Zalo */}
      <Tabs
        value={shareMode}
        onChange={(_, val) => setShareMode(val)}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          minHeight: 46,
          px: 2,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
            minHeight: 46,
            gap: 0.75,
          },
        }}
      >
        <Tab
          value="static"
          icon={<MapPin size={17} />}
          iconPosition="start"
          label={tr("Gửi vị trí đã ghim", "Pinned Location")}
        />
        <Tab
          value="live"
          icon={<Radio size={17} />}
          iconPosition="start"
          label={tr("Chia sẻ trực tiếp (Thời gian thực)", "Live Location (Realtime)")}
        />
      </Tabs>

      {/* Chọn thời lượng ngay dưới tab, nằm ngoài vùng cuộn → không phải cuộn qua bản đồ */}
      {shareMode === "live" && (
        <LiveDurationSelector value={liveDurationMinutes} onChange={setLiveDurationMinutes} />
      )}

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
        <Box sx={{ position: "relative", width: "100%", height: { xs: 260, sm: 320 } }}>
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
          color={shareMode === "live" ? "success" : "primary"}
          onClick={handleConfirm}
          startIcon={shareMode === "live" ? <Radio size={18} /> : <Navigation size={18} />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 2.5 }}
        >
          {shareMode === "live"
            ? `${tr("Bắt đầu chia sẻ", "Start sharing")} (${formatLiveDuration(liveDurationMinutes, tr)})`
            : tr("Gửi vị trí này", "Send this location")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
