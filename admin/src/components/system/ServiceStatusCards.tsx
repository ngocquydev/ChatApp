"use client";

import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { Database, Zap, Share2, Radio } from "lucide-react";
import { SystemHealthData } from "@/services/adminApi";

interface ServiceStatusCardsProps {
  services: SystemHealthData["services"];
  isEn: boolean;
}

export function ServiceStatusCards({ services, isEn }: ServiceStatusCardsProps) {
  const isMongoOk = services.mongo.status === "connected" || services.mongo.readyState === 1;
  const isRedisOk = services.redis.status === "connected";
  const isNeo4jOk = services.neo4j.status === "connected";

  const cards = [
    {
      name: "MongoDB Database",
      desc: isEn ? "Primary document database (Accounts, Messages, Posts)" : "Cơ sở dữ liệu chính (Tài khoản, Tin nhắn, Bài viết)",
      icon: Database,
      status: isMongoOk ? (isEn ? "Connected" : "Hoạt động") : (isEn ? "Disconnected" : "Mất kết nối"),
      isOk: isMongoOk,
      detail: isEn ? `ReadyState: ${services.mongo.readyState}` : `Mã trạng thái: ${services.mongo.readyState}`,
      color: "var(--mui-palette-success-main)",
    },
    {
      name: "Redis Cache & Pub/Sub",
      desc: isEn ? "High-speed in-memory store for rate limits & sessions" : "Bộ nhớ cache phân tán, rate limit & phiên làm việc",
      icon: Zap,
      status: isRedisOk ? (isEn ? "Connected" : "Hoạt động") : (isEn ? "Disconnected" : "Mất kết nối"),
      isOk: isRedisOk,
      detail: `${isEn ? "Latency" : "Độ trễ"}: ${services.redis.latencyMs}ms`,
      color: "var(--mui-palette-error-main)",
    },
    {
      name: "Neo4j Graph Database",
      desc: isEn ? "Social graph relationships & fraud syndicate detection" : "Đồ thị mạng xã hội & truy vết quan hệ bất thường",
      icon: Share2,
      status: isNeo4jOk ? (isEn ? "Connected" : "Hoạt động") : (isEn ? "Standby / Disabled" : "Chờ / Tắt"),
      isOk: isNeo4jOk,
      detail: isNeo4jOk ? (isEn ? "Graph engine online" : "Graph engine sẵn sàng") : (isEn ? "Optional clustering" : "Cụm tùy chọn"),
      color: "var(--mui-palette-info-main)",
    },
    {
      name: "Realtime WebSocket",
      desc: isEn ? "Realtime chat message dispatch & presence sync" : "Điều phối tin nhắn thời gian thực & trạng thái online",
      icon: Radio,
      status: isEn ? "Operational" : "Hoạt động",
      isOk: true,
      detail: isEn ? "Socket.IO Gateway active" : "Cổng Socket.IO đang chạy",
      color: "var(--mui-palette-primary-main)",
    },
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        {isEn ? "Connected Services & Infrastructure" : "Dịch vụ & Cơ sở hạ tầng kết nối"}
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        {cards.map((service, idx) => {
          const Icon = service.icon;
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
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        bgcolor: "action.hover",
                        color: service.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {service.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {service.detail}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={service.status}
                    size="small"
                    color={service.isOk ? "success" : "default"}
                    sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  {service.desc}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
