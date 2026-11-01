"use client";

import { Box, Card, CardContent, Typography } from "@mui/material";
import { Clock, Cpu, Server, Hash } from "lucide-react";
import { SystemHealthData } from "@/services/adminApi";

interface SystemMetricsGridProps {
  system: SystemHealthData;
  isEn: boolean;
}

export function SystemMetricsGrid({ system, isEn }: SystemMetricsGridProps) {
  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const metrics = [
    {
      title: isEn ? "Uptime" : "Thời gian hoạt động",
      value: formatUptime(system.uptimeSeconds),
      icon: Clock,
      color: "var(--mui-palette-success-main)",
      desc: isEn ? "Continuous server runtime" : "Thời gian máy chủ chạy liên tục",
    },
    {
      title: isEn ? "Runtime Node.js" : "Môi trường Node.js",
      value: system.nodeVersion,
      icon: Cpu,
      color: "var(--mui-palette-primary-main)",
      desc: `${system.platform} (${system.architecture})`,
    },
    {
      title: isEn ? "Process ID" : "Mã tiến trình (PID)",
      value: `#${system.pid}`,
      icon: Hash,
      color: "var(--mui-palette-info-main)",
      desc: isEn ? "Active OS process id" : "Tiến trình NestJS trên OS",
    },
    {
      title: isEn ? "Framework & Architecture" : "Kiến trúc hệ thống",
      value: "NestJS 11",
      icon: Server,
      color: "var(--mui-palette-warning-main)",
      desc: isEn ? "Modular MVC & Microservices" : "Hệ vi dịch vụ phân tán",
    },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
      {metrics.map((item, idx) => {
        const Icon = item.icon;
        return (
          <Card
            key={idx}
            sx={{
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              background: "background.paper",
              boxShadow: "none",
              height: "100%",
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {item.value}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {item.desc}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
