"use client";

import {
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Typography,
} from "@mui/material";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  HardDrive,
  Server,
  Zap,
} from "lucide-react";
import { SystemHealthData } from "@/services/adminApi";

interface MemoryUsageCardProps {
  memory: SystemHealthData["memory"];
  isEn: boolean;
}

export function MemoryUsageCard({ memory, isEn }: MemoryUsageCardProps) {
  const systemTotalMB = memory.systemTotalMB || 16384;
  const systemUsedMB = memory.systemUsedMB || Math.round(systemTotalMB * 0.5);
  const systemFreeMB = memory.systemFreeMB || Math.max(0, systemTotalMB - systemUsedMB);
  const systemUsagePercent =
    memory.systemUsagePercent !== undefined
      ? memory.systemUsagePercent
      : Math.min(100, Math.round((systemUsedMB / systemTotalMB) * 100));

  const heapLimitMB = memory.heapLimitMB || Math.max(4096, memory.heapTotalMB * 2);
  const heapLimitPercent =
    memory.heapLimitPercent !== undefined
      ? memory.heapLimitPercent
      : Math.min(100, Math.round((memory.heapUsedMB / heapLimitMB) * 100));

  const status = memory.status || (systemUsagePercent >= 85 ? "critical" : systemUsagePercent >= 75 ? "warning" : "healthy");

  const formatMem = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  const systemTotalDisplay = formatMem(systemTotalMB);
  const systemUsedDisplay = formatMem(systemUsedMB);
  const systemFreeDisplay = formatMem(systemFreeMB);

  const upgradePlan = memory.upgradePlan || {
    currentTotalRamGB: Math.round(systemTotalMB / 1024),
    recommendedAddRamGB: Math.round(systemTotalMB / 1024) <= 4 ? 4 : Math.round(systemTotalMB / 1024) <= 8 ? 8 : 16,
    targetTotalRamGB: Math.round(systemTotalMB / 1024) + (Math.round(systemTotalMB / 1024) <= 4 ? 4 : 8),
    suggestedNodeFlag: `--max-old-space-size=${Math.round(Math.min(systemTotalMB * 0.75, 8192))}`,
  };

  const getBarColor = (percent: number) => {
    if (percent >= 85) return "error";
    if (percent >= 75) return "warning";
    return "success";
  };

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: status === "critical" ? "error.main" : status === "warning" ? "warning.main" : "divider",
        background: "background.paper",
        boxShadow: "none",
        transition: "border-color 0.3s ease",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header with Title & Status Badge */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: status === "critical" ? "error.light" : status === "warning" ? "warning.light" : "action.hover",
                color: status === "critical" ? "error.main" : status === "warning" ? "warning.main" : "var(--mui-palette-primary-main)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Cpu size={24} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {isEn ? "Server RAM & Upgrade Warning" : "Bộ Nhớ RAM Máy Chủ & Cảnh Báo Nâng Cấp"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isEn
                  ? "Real-time physical server RAM, V8 heap headroom, and upgrade recommendations"
                  : "Theo dõi dung lượng RAM vật lý máy chủ, trần V8 Heap và khuyến nghị nâng cấp phần cứng"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {status === "critical" && (
              <Chip
                icon={<AlertTriangle size={15} />}
                label={isEn ? "CRITICAL: RAM Upgrade Required" : "NGUY CẤP: CẦN NÂNG CẤP RAM"}
                color="error"
                sx={{ fontWeight: 800, px: 0.5 }}
              />
            )}
            {status === "warning" && (
              <Chip
                icon={<AlertCircle size={15} />}
                label={isEn ? "WARNING: High RAM Load" : "CẢNH BÁO: TẢI RAM CAO"}
                color="warning"
                sx={{ fontWeight: 700, px: 0.5 }}
              />
            )}
            {status === "healthy" && (
              <Chip
                icon={<CheckCircle2 size={15} />}
                label={isEn ? "HEALTHY: RAM Normal" : "ỔN ĐỊNH: RAM BÌNH THƯỜNG"}
                color="success"
                sx={{ fontWeight: 700, px: 0.5 }}
              />
            )}
          </Box>
        </Box>

        {/* 2 Progress bars */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mb: 3 }}>
          {/* Progress 1: Physical Server RAM */}
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Server size={16} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {isEn ? "Combined Cloud RAM (Render + Redis)" : "Tổng RAM Đám Mây (Render + Redis)"}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: status === "critical" ? "error.main" : status === "warning" ? "warning.main" : "text.primary",
                }}
              >
                {systemUsedDisplay} / {systemTotalDisplay} ({systemUsagePercent}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={systemUsagePercent}
              color={getBarColor(systemUsagePercent)}
              sx={{
                height: 12,
                borderRadius: "6px",
                bgcolor: "background.paper",
                "& .MuiLinearProgress-bar": { borderRadius: "6px" },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isEn ? `Free RAM: ${systemFreeDisplay} (${100 - systemUsagePercent}%)` : `RAM còn trống: ${systemFreeDisplay} (${100 - systemUsagePercent}%)`}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isEn ? `Thresholds: 75% Warning • 85% Critical` : `Ngưỡng: 75% Cảnh báo • 85% Nguy cấp`}
              </Typography>
            </Box>
          </Box>

          {/* Progress 2: Node.js V8 Process Heap */}
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HardDrive size={16} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {isEn ? "Node.js Process V8 Heap vs OOM Crash Limit" : "Bộ Nhớ Heap Tiến Trình Node.js vs Giới Hạn Sập OOM"}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  color: getBarColor(heapLimitPercent) === "error" ? "error.main" : "text.primary",
                }}
              >
                {memory.heapUsedMB} MB / {heapLimitMB} MB ({heapLimitPercent}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={heapLimitPercent}
              color={getBarColor(heapLimitPercent)}
              sx={{
                height: 10,
                borderRadius: "5px",
                bgcolor: "background.paper",
                "& .MuiLinearProgress-bar": { borderRadius: "5px" },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isEn ? `Allocated Heap: ${memory.heapTotalMB} MB • RSS: ${memory.rssMB} MB` : `Heap đã cấp phát: ${memory.heapTotalMB} MB • Thường trú (RSS): ${memory.rssMB} MB`}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isEn ? `Crash Limit: ${heapLimitMB} MB` : `Giới hạn trần OOM: ${heapLimitMB} MB`}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 4 Metric grid */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {isEn ? "Total Cloud RAM" : "Tổng RAM Cloud"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
              {systemTotalDisplay}
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {isEn ? "Used Cloud RAM" : "RAM Đang Dùng"}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                mt: 0.5,
                color: status === "critical" ? "error.main" : status === "warning" ? "warning.main" : "inherit",
              }}
            >
              {systemUsedDisplay}
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {isEn ? "Free RAM Available" : "RAM Còn Trống"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: "success.main" }}>
              {systemFreeDisplay}
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {isEn ? "Resident Set (RSS)" : "Thường Trú (RSS)"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
              {memory.rssMB} MB
            </Typography>
          </Box>
        </Box>

        {/* Cloud Infrastructure Breakdown (Render + Redis) */}
        {memory.cloudBreakdown && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
            <Box sx={{ p: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Render Cloud Backend
                </Typography>
                <Chip size="small" label={`${memory.cloudBreakdown.render.percent}%`} color={getBarColor(memory.cloudBreakdown.render.percent)} sx={{ fontWeight: 700, height: 20 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {memory.cloudBreakdown.render.usedMB} MB / {memory.cloudBreakdown.render.totalMB} MB
              </Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Upstash Cloud Redis
                </Typography>
                <Chip size="small" label={`${memory.cloudBreakdown.redis.percent}%`} color={getBarColor(memory.cloudBreakdown.redis.percent)} sx={{ fontWeight: 700, height: 20 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {memory.cloudBreakdown.redis.usedMB} MB / {memory.cloudBreakdown.redis.totalMB} MB
              </Typography>
            </Box>
          </Box>
        )}

        {/* Upgrade Recommendation & Action Plan Banner */}
        <Alert
          severity={status === "critical" ? "error" : status === "warning" ? "warning" : "info"}
          variant="outlined"
          sx={{
            borderRadius: "14px",
            borderWidth: "1.5px",
            "& .MuiAlert-icon": { alignItems: "center" },
          }}
        >
          <AlertTitle sx={{ fontWeight: 800, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
            {status === "critical"
              ? isEn
                ? "🚨 CRITICAL ALERT: SERVER RAM NEARING CAPACITY!"
                : "🚨 CẢNH BÁO NGUY CẤP: RAM MÁY CHỦ SẮP HẾT!"
              : status === "warning"
              ? isEn
                ? "⚠️ WARNING: HIGH MEMORY UTILIZATION"
                : "⚠️ CẢNH BÁO: TẢI BỘ NHỚ RAM ĐANG TĂNG CAO"
              : isEn
              ? "✅ MEMORY CAPACITY SUFFICIENT"
              : "✅ NĂNG LỰC BỘ NHỚ HOẠT ĐỘNG ỔN ĐỊNH"}
          </AlertTitle>

          <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
            {isEn ? memory.recommendationEn || memory.alertMessageEn : memory.recommendation || memory.alertMessage}
          </Typography>

          <Divider sx={{ my: 1.5, borderColor: "divider" }} />

          {/* Actionable Hardware Upgrade Plan */}
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <Zap size={16} />
              {isEn ? "Hardware Scaling & Action Plan:" : "Kế Hoạch Nâng Cấp Phần Cứng Khuyến Nghị:"}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {isEn ? "Current RAM" : "RAM Hiện Tại"}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {upgradePlan.currentTotalRamGB} GB
                </Typography>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {isEn ? "Recommended Addition" : "Khuyến Nghị Bổ Sung"}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "primary.main" }}>
                  +{upgradePlan.recommendedAddRamGB} GB RAM
                </Typography>
              </Box>

              <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {isEn ? "Target RAM Capacity" : "Dung Lượng Đích Sau Nâng"}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: "success.main" }}>
                  {upgradePlan.targetTotalRamGB} GB RAM
                </Typography>
              </Box>
            </Box>

            <Typography variant="caption" component="div" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
              <strong>1. {isEn ? "Server Upgrade:" : "Nâng cấp VPS / Server:"}</strong>{" "}
              {isEn
                ? `Upgrade host memory to at least ${upgradePlan.targetTotalRamGB} GB RAM via your cloud provider (AWS, DigitalOcean, Hetzner, Vietnix...).`
                : `Nâng cấp gói máy chủ lên tối thiểu ${upgradePlan.targetTotalRamGB} GB RAM tại nhà cung cấp Cloud/VPS để đảm bảo tài nguyên cho người dùng chat.`}
              <br />
              <strong>2. {isEn ? "Node.js V8 Heap Flag:" : "Tăng trần V8 Heap:"}</strong>{" "}
              {isEn
                ? `Add environment variable NODE_OPTIONS="${upgradePlan.suggestedNodeFlag}" to unlock full heap allocation.`
                : `Thêm biến môi trường NODE_OPTIONS="${upgradePlan.suggestedNodeFlag}" để mở rộng trần heap Node.js tận dụng hết RAM vật lý.`}
              <br />
              <strong>3. {isEn ? "Horizontal Scaling:" : "Scale Cụm Ngang (Cluster):"}</strong>{" "}
              {isEn
                ? "Deploy multiple instances with PM2 or Docker Swarm to distribute memory and CPU load evenly."
                : "Triển khai cụm nhiều tiến trình với PM2 Cluster hoặc Docker Swarm để chia tải RAM đều trên các nhân CPU."}
            </Typography>
          </Box>
        </Alert>
      </CardContent>
    </Card>
  );
}
