import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function ProtectedRoute() {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();

  // Đang kiểm tra token / cookie khi vừa mount hoặc F5 trang
  if (isCheckingAuth) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f8fafc",
          gap: 2,
        }}
      >
        <CircularProgress size={42} thickness={4} sx={{ color: "#2563eb" }} />
        <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 500 }}>
          Đang xác thực phiên làm việc...
        </Typography>
      </Box>
    );
  }

  // Chưa đăng nhập thì chuyển hướng về /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Đã đăng nhập -> cho phép render trang con
  return <Outlet />;
}
