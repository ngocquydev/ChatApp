"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Chip,
} from "@mui/material";
import {
  Users,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  RefreshCw,
  ArrowRight,
  Database,
  Activity,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { adminApi, AdminStats } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";
import { ADMIN_REPORTS_COPY } from "@/i18n/adminReports";

export default function DashboardView() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isEnglish: isEn, tr } = useTranslation();

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : (isEn ? "Failed to load admin stats" : "Không tải được thống kê hệ thống"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isEn]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${sec % 60}s`;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return (
      <Card sx={{ p: 4, textAlign: "center", borderRadius: "16px" }}>
        <AlertTriangle size={48} color="var(--mui-palette-error-main)" style={{ margin: "0 auto 16px" }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          {error || (isEn ? "No data available" : "Không có dữ liệu")}
        </Typography>
        <Button variant="contained" onClick={handleRefresh} sx={{ mt: 2, borderRadius: "10px" }}>
          {isEn ? "Retry" : "Thử lại"}
        </Button>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
      {/* Tiêu đề trang & Nút tải lại */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            {isEn ? "System Overview" : "Tổng quan Hệ thống"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {isEn
              ? "Comprehensive analytics, moderation status, and real-time operational health."
              : "Theo dõi toàn diện người dùng, kiểm duyệt, bảo mật mạng và sức khỏe hạ tầng thời gian thực."}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={handleRefresh}
          disabled={refreshing}
          startIcon={<RefreshCw size={16} className={refreshing ? "spin" : ""} />}
          sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600 }}
        >
          {isEn ? "Refresh data" : "Làm mới dữ liệu"}
        </Button>
      </Box>

      {/* 4 Thẻ thống kê cốt lõi */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2.5 }}>
        {/* Người dùng */}
        <Card sx={{ borderRadius: "16px", height: "100%", border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isEn ? "Total Users" : "Tổng thành viên"}
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={20} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {stats.users.total.toLocaleString()}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, minWidth: 0 }}>
              <Chip
                label={`${stats.users.active.toLocaleString()} ${isEn ? "active" : "hoạt động"}`}
                size="small"
                color="success"
                variant="outlined"
                sx={{ minHeight: 20, height: "auto", maxWidth: "100%", fontSize: "0.7rem", fontWeight: 600, "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere" } }}
              />
              {stats.users.banned > 0 && (
                <Chip
                  label={`${stats.users.banned.toLocaleString()} ${isEn ? "banned" : "bị cấm"}`}
                  size="small"
                  color="error"
                  sx={{ minHeight: 20, height: "auto", maxWidth: "100%", fontSize: "0.7rem", fontWeight: 600, "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere" } }}
                />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Bài viết & Tương tác */}
        <Card sx={{ borderRadius: "16px", height: "100%", border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isEn ? "Posts & Feed" : "Bài viết & Tương tác"}
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "secondary.main",
                  color: "secondary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={20} />
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {stats.posts.total.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {stats.posts.comments.toLocaleString()} {isEn ? "comments recorded" : "bình luận trên toàn hệ thống"}
            </Typography>
          </CardContent>
        </Card>

        {/* Bảo mật WAF */}
        <Card sx={{ borderRadius: "16px", height: "100%", border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isEn ? "Security & WAF" : "Bảo mật & Tường lửa"}
              </Typography>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: stats.security.underAttack ? "error.main" : "info.main",
                  color: "common.white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {stats.security.underAttack ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {stats.security.underAttack ? "ATTACK" : "SECURE"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.8, minWidth: 0 }}>
              <Chip
                label={stats.security.underAttack ? (isEn ? "Under Attack" : "Đang bị tấn công") : (isEn ? "Normal" : "Bình thường")}
                size="small"
                color={stats.security.underAttack ? "error" : "success"}
                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                {stats.security.activeBans.toLocaleString()} {isEn ? "banned IPs" : "IP đang bị cấm"}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Máy chủ & Tài nguyên */}
        <Card
          sx={{
            borderRadius: "16px",
            height: "100%",
            border: "1px solid",
            borderColor: stats.system.memory.status === "critical" ? "error.main" : stats.system.memory.status === "warning" ? "warning.main" : "divider",
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {isEn ? "Server RAM & Resources" : "RAM Máy Chủ & Tài Nguyên"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                {stats.system.memory.status === "critical" ? (
                  <Chip size="small" color="error" label={isEn ? "Upgrade RAM" : "Cần nâng cấp"} sx={{ fontWeight: 800, height: 22 }} />
                ) : stats.system.memory.status === "warning" ? (
                  <Chip size="small" color="warning" label={isEn ? "High Load" : "Tải cao"} sx={{ fontWeight: 700, height: 22 }} />
                ) : (
                  <Chip size="small" color="success" label={isEn ? "Stable" : "Ổn định"} sx={{ fontWeight: 700, height: 22 }} />
                )}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    bgcolor: stats.system.memory.status === "critical" ? "error.main" : "warning.main",
                    color: "background.paper",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Cpu size={20} />
                </Box>
              </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              {stats.system.memory.systemUsagePercent !== undefined ? `${stats.system.memory.systemUsagePercent}% RAM` : `${stats.system.memory.heapUsedMB} MB`}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
              {stats.system.memory.systemUsedMB !== undefined && stats.system.memory.systemTotalMB
                ? `${stats.system.memory.systemTotalMB >= 1024 ? `${(stats.system.memory.systemUsedMB / 1024).toFixed(1)} / ${(stats.system.memory.systemTotalMB / 1024).toFixed(1)} GB` : `${stats.system.memory.systemUsedMB} / ${stats.system.memory.systemTotalMB} MB`} • Heap: ${stats.system.memory.heapUsedMB} MB`
                : `Heap: ${stats.system.memory.heapUsedMB} MB • Uptime: ${formatUptime(stats.system.uptimeSeconds)}`}
            </Typography>
            {stats.system.memory.cloudBreakdown && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5, fontSize: "0.72rem", overflowWrap: "anywhere" }}>
                Render: {stats.system.memory.cloudBreakdown.render.usedMB}/{stats.system.memory.cloudBreakdown.render.totalMB} MB • Redis: {stats.system.memory.cloudBreakdown.redis.usedMB}/{stats.system.memory.cloudBreakdown.redis.totalMB} MB
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Trạng thái dịch vụ & Lối tắt nhanh */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2.5 }}>
        {/* Cột trái: Trạng thái kết nối dịch vụ */}
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <Activity size={20} />
              {isEn ? "Services Connectivity" : "Tình trạng Dịch vụ & Cơ sở Dữ liệu"}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Database size={18} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>MongoDB Database</Typography>
                    <Typography variant="caption" color="text.secondary">{isEn ? "User profiles, posts, chats" : "Lưu trữ tài khoản, bài viết, chat"}</Typography>
                  </Box>
                </Box>
                <Chip
                  label={stats.system.services.mongo === "connected" ? "Connected" : "Disconnected"}
                  size="small"
                  color={stats.system.services.mongo === "connected" ? "success" : "error"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Activity size={18} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Redis Cache & Sets</Typography>
                    <Typography variant="caption" color="text.secondary">{isEn ? "Token bucket rate limit, sessions" : "Bộ nhớ đệm, rate limit, blacklist"}</Typography>
                  </Box>
                </Box>
                <Chip
                  label={stats.system.services.redis === "connected" ? "Connected" : "Disconnected"}
                  size="small"
                  color={stats.system.services.redis === "connected" ? "success" : "error"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Bot size={18} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Neo4j Graph Database</Typography>
                    <Typography variant="caption" color="text.secondary">{isEn ? "Friends-of-friends & centrality" : "Đồ thị quan hệ kết bạn 2-hops"}</Typography>
                  </Box>
                </Box>
                <Chip
                  label={stats.system.services.neo4j === "connected" ? "Connected" : "Standby"}
                  size="small"
                  color={stats.system.services.neo4j === "connected" ? "success" : "warning"}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Cột phải: Lối tắt điều hướng nhanh */}
        <Card sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", height: "100%" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              {isEn ? "Quick Management Tools" : "Công cụ Quản trị Nhanh"}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                component={Link}
                to="/users"
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                sx={{
                  justifyContent: "space-between",
                  py: 1.2,
                  px: 2,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {isEn ? "Manage Users & Permissions" : "Quản lý Người dùng & Phân quyền"}
              </Button>
              <Button
                component={Link}
                to="/posts"
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                sx={{
                  justifyContent: "space-between",
                  py: 1.2,
                  px: 2,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {isEn ? "Moderate Posts & Comments" : "Kiểm duyệt Bài viết & Bình luận"}
              </Button>
              <Button
                component={Link}
                to="/reports"
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                sx={{
                  justifyContent: "space-between",
                  py: 1.2,
                  px: 2,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {tr(ADMIN_REPORTS_COPY.title)}
              </Button>
              <Button
                component={Link}
                to="/security"
                variant="outlined"
                endIcon={<ArrowRight size={16} />}
                sx={{
                  justifyContent: "space-between",
                  py: 1.2,
                  px: 2,
                  borderRadius: "10px",
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {isEn ? "Cloudflare WAF & Under Attack" : "Tường lửa Cloudflare & Bật Chống Tấn công"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
