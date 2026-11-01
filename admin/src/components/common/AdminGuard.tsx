import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, CircularProgress } from "@mui/material";
import { ShieldOff, LogOut } from "lucide-react";
import EmptyState from "./EmptyState";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useTranslation } from "@/i18n/useTranslation";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { tr } = useTranslation();
  const { user, isCheckingAuth, isAuthenticated, logout } = useAdminAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isCheckingAuth, isAuthenticated, navigate]);

  if (isCheckingAuth) {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (user.role !== "admin") {
    return (
      <Box
        sx={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          bgcolor: "background.default",
        }}
      >
        <EmptyState
          icon={<ShieldOff size={40} />}
          title={tr("Truy cập bị từ chối", "Access Denied")}
          description={tr(
            "Tài khoản của bạn không có thẩm quyền truy cập cổng Quản trị viên hệ thống ChatApp.",
            "Your account does not have administrative privileges for the ChatApp system."
          )}
          action={
            <Button
              variant="contained"
              color="error"
              startIcon={<LogOut size={18} />}
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
            >
              {tr("Đăng xuất", "Log out")}
            </Button>
          }
        />
      </Box>
    );
  }

  return <>{children}</>;
}

