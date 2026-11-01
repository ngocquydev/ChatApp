"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Typography,
} from "@mui/material";
import { RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { adminApi, SystemHealthData } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";
import { SystemMetricsGrid } from "./SystemMetricsGrid";
import { ServiceStatusCards } from "./ServiceStatusCards";
import { MemoryUsageCard } from "./MemoryUsageCard";

export default function SystemHealthView() {
  const [system, setSystem] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isEnglish: isEn } = useTranslation();

  const loadHealth = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.getSystemHealth();
      setSystem(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : (isEn ? "Failed to load system metrics" : "Không tải được dữ liệu hệ thống"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEn]);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHealth();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !system) {
    return (
      <Card sx={{ p: 4, textAlign: "center", borderRadius: "16px" }}>
        <AlertTriangle size={48} color="var(--mui-palette-error-main)" style={{ margin: "0 auto 16px" }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          {error || (isEn ? "No system data available" : "Không có dữ liệu hệ thống")}
        </Typography>
        <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2, borderRadius: "10px" }}>
          {isEn ? "Retry" : "Thử lại"}
        </Button>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {isEn ? "System Health & Infrastructure" : "Trạng thái Hệ thống & Dịch vụ"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {isEn
              ? "Real-time Node.js runtime metrics, memory allocation, and connected microservices."
              : "Theo dõi thời gian thực runtime NestJS, bộ nhớ RAM, cơ sở dữ liệu và microservices kết nối."}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ borderRadius: "10px" }}
        >
          {refreshing ? (isEn ? "Refreshing..." : "Đang làm mới...") : (isEn ? "Refresh Metrics" : "Làm mới dữ liệu")}
        </Button>
      </Box>

      {/* 4 Metric cards */}
      <SystemMetricsGrid system={system} isEn={isEn} />

      {/* Memory allocation */}
      <MemoryUsageCard memory={system.memory} isEn={isEn} />

      {/* Connected microservices */}
      <ServiceStatusCards services={system.services} isEn={isEn} />

      {/* Security & Deployment Notes */}
      <Card
        sx={{
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          background: "background.paper",
          boxShadow: "none",
        }}
      >
        <Box sx={{ display: "flex", gap: 2, p: 2.5, alignItems: "flex-start" }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              bgcolor: "action.hover",
              color: "var(--mui-palette-success-main)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={20} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {isEn ? "Cloudflare Zero Trust & Tunnel Integration" : "Tích hợp Cloudflare Zero Trust & Tunnel"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {isEn
                ? "Inbound traffic is protected by Cloudflare Edge WAF, DDoS mitigation, and encrypted Cloudflared Tunnel directly to internal Docker network."
                : "Lưu lượng truy cập bên ngoài được bảo vệ bởi Cloudflare Edge WAF, chống tấn công DDoS tự động và Cloudflared Tunnel mã hóa trực tiếp vào mạng nội bộ Docker."}
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
