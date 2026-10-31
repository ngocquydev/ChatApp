"use client";

import { Box, Chip, Typography } from "@mui/material";
import { Timer } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { LIVE_DURATION_OPTIONS, formatLiveDuration } from "@/utils/liveLocation";

interface LiveDurationSelectorProps {
  value: number;
  onChange: (minutes: number) => void;
}

/**
 * Thanh chọn thời lượng chia sẻ vị trí trực tiếp (15 phút · 1 giờ · 8 giờ · 1 ngày).
 * Đặt cố định phía trên bản đồ để người dùng không phải cuộn qua bản đồ
 * (cuộn trên bản đồ sẽ phóng to/thu nhỏ map thay vì cuộn hộp thoại).
 */
export default function LiveDurationSelector({ value, onChange }: LiveDurationSelectorProps) {
  const { tr } = useTranslation();

  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "var(--mui-palette-success-lighter, rgba(16, 185, 129, 0.08))",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
        <Timer size={18} color="var(--mui-palette-tone-10b981)" style={{ flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
            {tr("Thời gian chia sẻ trực tiếp", "Live sharing duration")}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.3 }}>
            {tr(
              "Bạn bè sẽ thấy bạn di chuyển trên bản đồ theo thời gian thực",
              "Participants will see your movement on the map in real time",
            )}
          </Typography>
        </Box>
      </Box>

      <Box
        role="radiogroup"
        aria-label={tr("Thời lượng chia sẻ", "Sharing duration")}
        sx={{ display: "flex", gap: 1, flexWrap: "wrap", flexShrink: 0 }}
      >
        {LIVE_DURATION_OPTIONS.map((minutes) => {
          const selected = value === minutes;
          return (
            <Chip
              key={minutes}
              role="radio"
              aria-checked={selected}
              label={formatLiveDuration(minutes, tr)}
              clickable
              size="small"
              color={selected ? "success" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => onChange(minutes)}
              sx={{ fontWeight: 700, fontSize: "0.8rem", px: 0.5 }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

