"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, ButtonBase, Typography } from "@mui/material";
import { ExternalLink, MapPin, Navigation, Radio, Square } from "lucide-react";
import type * as L from "leaflet";
import { useTranslation } from "@/i18n/useTranslation";
import { ChatMessage, LocationData, useChatStore } from "@/store/useChatStore";
import { liveLocationTracker } from "@/services/liveLocationTracker";
import { formatLiveRemaining } from "@/utils/liveLocation";
import LocationViewModal from "./LocationViewModal";

interface LocationMessageItemProps {
  message: ChatMessage;
  isMe: boolean;
}

export default function LocationMessageItem({ message, isMe }: LocationMessageItemProps) {
  const { tr } = useTranslation();
  const miniMapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const updateLiveLocation = useChatStore((s) => s.updateLiveLocation);
  const stopLiveLocation = useChatStore((s) => s.stopLiveLocation);

  const location: LocationData | null = message.location || null;
  const isLive = Boolean(location?.isLive);
  // Vị trí mới nhất cho lần khởi tạo bản đồ (không đưa vào deps để tránh tạo lại map mỗi lần cập nhật)
  const locationRef = useRef<LocationData | null>(location);
  // Cho phép cập nhật lạc quan tức thì ngay khi bấm Dừng chia sẻ (không chờ socket/parent re-render)
  const [localActiveOverride, setLocalActiveOverride] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalActiveOverride(null);
  }, [message.location?.isLiveActive]);

  // Lắng nghe broadcast nội bộ nếu có nơi khác dừng chia sẻ (như từ trong modal toàn màn hình)
  useEffect(() => {
    const handleLocal = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string; isLiveActive?: boolean }>;
      if (
        customEvent.detail?.messageId === message._id &&
        typeof customEvent.detail.isLiveActive === "boolean"
      ) {
        setLocalActiveOverride(customEvent.detail.isLiveActive);
      }
    };
    window.addEventListener("chatapp:location_updated", handleLocal);
    return () => window.removeEventListener("chatapp:location_updated", handleLocal);
  }, [message._id]);

  // Cập nhật đếm ngược mỗi giây nếu đang chia sẻ trực tiếp
  useEffect(() => {
    setNow(Date.now());
    if (!isLive || location?.isLiveActive === false) return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [isLive, location?.isLiveActive]);

  // Tính trạng thái hết hạn và trạng thái đang hoạt động của live location
  const isExpired = Boolean(
    location?.liveExpiresAt && now !== null && new Date(location.liveExpiresAt).getTime() <= now,
  );
  const isLiveActive =
    isLive &&
    (localActiveOverride !== null ? localActiveOverride : location?.isLiveActive !== false) &&
    !isExpired;

  // Nếu là người gửi và đang chia sẻ trực tiếp: kích hoạt watcher định vị nền
  useEffect(() => {
    if (!isMe || !isLiveActive || !message._id) {
      if (isMe && message._id) {
        liveLocationTracker.stop(message._id);
      }
      return;
    }

    liveLocationTracker.start(message._id, (lat, lng) => {
      updateLiveLocation(message._id, {
        latitude: lat,
        longitude: lng,
      });
    });

    return () => {
      liveLocationTracker.stop(message._id);
    };
  }, [isMe, isLiveActive, message._id, updateLiveLocation]);

  // Khởi tạo bản đồ mini (chỉ khi mount hoặc đổi trạng thái live; cập nhật tọa độ ở effect bên dưới)
  useEffect(() => {
    if (!miniMapRef.current || !locationRef.current) return;

    let isMounted = true;

    const initMiniMap = async () => {
      const leaflet = await import("leaflet");

      const location = locationRef.current;
      if (!miniMapRef.current || !isMounted || !location) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      // Biểu tượng ghim động: Nếu là live location thì hiển thị radar phát sóng xanh nhấp nháy
      const markerHtml = isLive
        ? `
          <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -50%); display: flex; align-items: center; justify-content: center;">
            ${
              isLiveActive
                ? `<div style="position: absolute; inset: -8px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: miniRadarPulse 2s infinite ease-out;"></div>`
                : ""
            }
            <div style="width: 20px; height: 20px; border-radius: 50%; background: ${
              isLiveActive ? "var(--mui-palette-tone-10b981)" : "var(--mui-palette-neutral-500)"
            }; border: 3px solid var(--mui-palette-common-white); box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
              <div style="width: 6px; height: 6px; border-radius: 50%; background: var(--mui-palette-common-white);"></div>
            </div>
          </div>
        `
        : `
          <div style="position: relative; width: 28px; height: 28px; transform: translate(-50%, -100%);">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--mui-palette-error-main)" stroke="var(--mui-palette-common-white)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" fill="var(--mui-palette-common-white)" />
            </svg>
          </div>
        `;

      const customIcon = leaflet.divIcon({
        className: "custom-leaflet-mini-pin",
        html: markerHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const map = leaflet.map(miniMapRef.current, {
        center: [location.latitude, location.longitude],
        zoom: isLive ? 16 : 15,
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

      const marker = leaflet
        .marker([location.latitude, location.longitude], {
          icon: customIcon,
        })
        .addTo(map);

      markerRef.current = marker;

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
        markerRef.current = null;
      }
    };
  }, [isLive, isLiveActive]);

  // Tọa độ thay đổi qua socket → chỉ dời marker & pan, không tạo lại bản đồ (tránh nháy/tải lại tile)
  useEffect(() => {
    locationRef.current = location;
    if (!location || !mapInstanceRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([location.latitude, location.longitude]);
    mapInstanceRef.current.panTo([location.latitude, location.longitude], { animate: true });
  }, [location]);

  if (!location) {
    return (
      <Box sx={{ p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <MapPin size={18} color="var(--mui-palette-error-main)" />
        <Typography variant="body2">{message.text}</Typography>
      </Box>
    );
  }

  // Định dạng thời gian còn lại
  const getRemainingTimeString = () => formatLiveRemaining(location.liveExpiresAt, now, tr);

  const handleStopSharing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalActiveOverride(false);
    if (!message._id) return;
    liveLocationTracker.stop(message._id);
    stopLiveLocation(message._id);
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;

  // Mở Google Maps ở tab mới. Không render nút dưới dạng <a> vì rule `a { color: inherit }`
  // (unlayered trong globals.css) luôn thắng style MUI (@layer) → chữ trắng trên nền trắng.
  const handleOpenDirections = () => {
    window.open(directionsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Box
        sx={{
          width: { xs: 260, sm: 305 },
          maxWidth: "100%",
          borderRadius: "18px",
          overflow: "hidden",
          bgcolor: isMe ? "var(--mui-palette-brand-600)" : "var(--mui-palette-background-paper)",
          color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
          border: "1px solid",
          borderColor: isMe ? "rgba(255, 255, 255, 0.2)" : "var(--mui-palette-divider)",
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
          aria-label={
            isLive
              ? tr("Mở theo dõi vị trí trực tiếp", "Open live location tracking")
              : tr("Mở xem vị trí trên bản đồ", "Open location on map")
          }
          sx={{
            position: "relative",
            width: "100%",
            height: 145,
            display: "block",
            textAlign: "inherit",
            cursor: "pointer",
            bgcolor: "var(--mui-palette-action-hover)",
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

          {/* Huy hiệu trạng thái: Live hoặc Ghim */}
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 400,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.15,
              py: 0.45,
              borderRadius: "12px",
              bgcolor: isLive
                ? isLiveActive
                  ? "rgba(16, 185, 129, 0.92)"
                  : "rgba(55, 65, 81, 0.88)"
                : "rgba(0, 0, 0, 0.65)",
              color: "var(--mui-palette-common-white)",
              fontSize: "0.72rem",
              fontWeight: 700,
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
              pointerEvents: "none",
              backdropFilter: "blur(4px)",
            }}
          >
            {isLive ? (
              isLiveActive ? (
                <>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "var(--mui-palette-common-white)",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        inset: -3,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.6)",
                        animation: "badgePulse 1.6s infinite ease-out",
                      },
                      "@keyframes badgePulse": {
                        "0%": { transform: "scale(0.8)", opacity: 1 },
                        "100%": { transform: "scale(2.2)", opacity: 0 },
                      },
                    }}
                  />
                  <span>
                    {tr("TRỰC TIẾP", "LIVE")} • {getRemainingTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <Square size={11} fill="currentColor" />
                  <span>{tr("ĐÃ DỪNG CHIA SẺ", "LIVE ENDED")}</span>
                </>
              )
            ) : (
              <>
                <MapPin size={12} color="var(--mui-palette-error-main)" />
                <span>{tr("VỊ TRÍ ĐÃ GHIM", "PINNED LOCATION")}</span>
              </>
            )}
          </Box>

          {/* Lớp phủ hover mờ với icon phóng to */}
          <Box
            className="map-overlay"
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0, 0, 0, 0.3)",
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
                py: 0.6,
                borderRadius: "20px",
                bgcolor: "var(--mui-palette-background-paper)",
                color: "var(--mui-palette-text-primary)",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                boxShadow: 3,
              }}
            >
              <ExternalLink size={14} />
              {isLive ? tr("Mở bản đồ trực tiếp", "Open live map") : tr("Xem chi tiết", "View details")}
            </Box>
          </Box>
        </ButtonBase>

        {/* Thông tin địa điểm & thời gian thực */}
        <Box sx={{ p: 1.75, pt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            {isLive ? (
              <Radio
                size={18}
                color={
                  isLiveActive
                    ? "var(--mui-palette-tone-10b981)"
                    : isMe
                      ? "var(--mui-palette-common-white)"
                      : "var(--mui-palette-neutral-400)"
                }
                style={{ marginTop: 2, flexShrink: 0 }}
              />
            ) : (
              <MapPin
                size={18}
                color={isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-error-main)"}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
            )}

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {isLive
                  ? isLiveActive
                    ? tr("Chia sẻ vị trí trực tiếp", "Sharing live location")
                    : tr("Vị trí trực tiếp đã kết thúc", "Live location ended")
                  : location.name || tr("Vị trí đã ghim", "Pinned Location")}
              </Typography>

              {location.address && (
                <Typography
                  variant="caption"
                  sx={{
                    color: isMe ? "rgba(255, 255, 255, 0.85)" : "var(--mui-palette-text-secondary)",
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
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1.5,
              "& .MuiButton-root": { whiteSpace: "nowrap", minWidth: 0 },
            }}
          >
            {isMe && isLiveActive ? (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  onClick={handleStopSharing}
                  startIcon={<Square size={13} fill="currentColor" />}
                  sx={{
                    flex: 1,
                    fontSize: "0.75rem",
                    py: 0.65,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "10px",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  {tr("Dừng chia sẻ", "Stop sharing")}
                </Button>

                <Button
                  size="small"
                  onClick={() => setOpenModal(true)}
                  startIcon={<ExternalLink size={13} />}
                  sx={{
                    flex: 1,
                    fontSize: "0.75rem",
                    py: 0.65,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    bgcolor: "rgba(255, 255, 255, 0.18)",
                    color: "var(--mui-palette-common-white)",
                    border: "1px solid rgba(255, 255, 255, 0.35)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.28)",
                    },
                  }}
                >
                  {tr("Xem trực tiếp", "View live")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="small"
                  onClick={() => setOpenModal(true)}
                  startIcon={<ExternalLink size={13} />}
                  sx={{
                    flex: 1,
                    fontSize: "0.75rem",
                    py: 0.65,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "10px",
                    bgcolor: isMe ? "rgba(255, 255, 255, 0.18)" : "var(--mui-palette-action-hover)",
                    color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-primary)",
                    border: "1px solid",
                    borderColor: isMe ? "rgba(255, 255, 255, 0.35)" : "var(--mui-palette-divider)",
                    "& .MuiButton-startIcon": {
                      color: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-text-secondary)",
                    },
                    "&:hover": {
                      bgcolor: isMe ? "rgba(255, 255, 255, 0.28)" : "var(--mui-palette-action-selected)",
                    },
                  }}
                >
                  {isLive ? tr("Xem trực tiếp", "View live") : tr("Xem bản đồ", "View map")}
                </Button>

                <Button
                  size="small"
                  onClick={handleOpenDirections}
                  aria-label={tr("Chỉ đường tới vị trí này trên Google Maps", "Get directions on Google Maps")}
                  startIcon={<Navigation size={13} />}
                  sx={{
                    flex: 1,
                    fontSize: "0.75rem",
                    py: 0.65,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "10px",
                    bgcolor: isMe ? "var(--mui-palette-common-white)" : "var(--mui-palette-brand-600)",
                    color: isMe ? "var(--mui-palette-brand-700)" : "var(--mui-palette-common-white)",
                    boxShadow: isMe ? "0 2px 6px rgba(0,0,0,0.18)" : "0 2px 6px rgba(37, 99, 235, 0.25)",
                    "&:hover": {
                      bgcolor: isMe ? "rgba(255, 255, 255, 0.92)" : "var(--mui-palette-brand-700)",
                    },
                  }}
                >
                  {tr("Chỉ đường", "Directions")}
                </Button>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Modal xem bản đồ toàn màn hình */}
      <LocationViewModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        location={location}
        messageId={message._id}
        isMe={isMe}
      />
    </>
  );
}