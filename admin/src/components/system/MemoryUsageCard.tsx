"use client";

import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import { HardDrive } from "lucide-react";
import { SystemHealthData } from "@/services/adminApi";

interface MemoryUsageCardProps {
  memory: SystemHealthData["memory"];
  isEn: boolean;
}

export function MemoryUsageCard({ memory, isEn }: MemoryUsageCardProps) {
  const heapPercent = memory.heapTotalMB > 0 ? Math.min(100, Math.round((memory.heapUsedMB / memory.heapTotalMB) * 100)) : 0;

  return (
    <Card
      sx={{
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        background: "background.paper",
        boxShadow: "none",
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: "action.hover",
              color: "var(--mui-palette-primary-main)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <HardDrive size={20} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {isEn ? "V8 Memory & RAM Allocation" : "Phân bổ Bộ nhớ RAM & V8 Heap"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isEn ? "Real-time Node.js process memory metrics" : "Thông số RAM thời gian thực của tiến trình máy chủ"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ my: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {isEn ? "Heap Usage (Used / Total)" : "Bộ nhớ Heap (Đang dùng / Tổng phân bổ)"}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {memory.heapUsedMB} MB / {memory.heapTotalMB} MB ({heapPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={heapPercent}
            sx={{
              height: 10,
              borderRadius: "5px",
              bgcolor: "action.hover",
              "& .MuiLinearProgress-bar": {
                borderRadius: "5px",
              },
            }}
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2, mt: 2 }}>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isEn ? "Heap Used" : "Heap đã dùng"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {memory.heapUsedMB} MB
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isEn ? "Heap Total" : "Tổng Heap"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {memory.heapTotalMB} MB
            </Typography>
          </Box>
          <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {isEn ? "Resident Set Size (RSS)" : "Bộ nhớ thường trú (RSS)"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {memory.rssMB} MB
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
