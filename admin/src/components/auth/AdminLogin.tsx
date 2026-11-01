import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import { Shield, ShieldCheck, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import BrandLogo from "../common/BrandLogo";
import ColorModeToggle from "../common/ColorModeToggle";
import LanguageToggle from "../common/LanguageToggle";
import TurnstileWidget, { TurnstileRef } from "../common/TurnstileWidget";
import { useTranslation } from "@/i18n/useTranslation";

export default function AdminLogin() {
  const { tr } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isCheckingAuth, isLoggingIn, login } = useAdminAuthStore();

  const [email, setEmail] = useState(() => import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || "");
  const [password, setPassword] = useState(() => import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || "");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const turnstileRef = useRef<TurnstileRef | null>(null);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
  }, []);

  useEffect(() => {
    if (!isCheckingAuth && isAuthenticated && user?.role === "admin") {
      navigate("/", { replace: true });
    }
  }, [isCheckingAuth, isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage(tr("Vui lòng nhập đầy đủ email và mật khẩu", "Please enter both email and password"));
      return;
    }

    const isDev =
      process.env.NODE_ENV !== "production" ||
      (typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"));
    const token = turnstileToken || (isDev ? "dev_bypass_turnstile" : "");

    if (!token) {
      setErrorMessage(
        tr(
          "Vui lòng hoàn thành xác minh bảo mật Turnstile trước khi tiếp tục.",
          "Please complete the Turnstile security check before continuing."
        )
      );
      return;
    }

    try {
      await login({
        email: email.trim(),
        password,
        turnstileToken: token,
      });
      navigate("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.message ||
        tr("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.", "Login failed. Please check your credentials.");
      setErrorMessage(msg);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: { xs: 2, sm: 3 },
        position: "relative",
      }}
    >
      {/* Top Controls */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <LanguageToggle />
        <ColorModeToggle />
      </Box>

      {/* Main Container */}
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: "20px",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 20px 40px -15px rgba(0, 0, 0, 0.7)"
              : "0 20px 40px -15px rgba(37, 99, 235, 0.12)",
          overflow: "hidden",
        }}
      >
        {/* Header Ribbon */}
        <Box
          sx={{
            p: 3,
            pb: 2,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "action.hover" : "neutral.50"),
          }}
        >
          <BrandLogo size="medium" />

          <Chip
            icon={<Shield size={14} />}
            label={tr("CỔNG QUẢN TRỊ BẢO MẬT", "SECURE ADMIN PORTAL")}
            size="small"
            color="primary"
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: 0.5,
              borderRadius: "8px",
            }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
            {tr(
              "Đăng nhập tài khoản Quản trị viên để quản lý hệ thống ChatApp.",
              "Sign in with administrator credentials to manage the ChatApp system."
            )}
          </Typography>
        </Box>

        {/* Form Body */}
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 }, pt: 3 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px" }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
            <TextField
              label={tr("Email quản trị viên", "Administrator Email")}
              type="email"
              fullWidth
              size="medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoggingIn}
              required
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} color="var(--mui-palette-neutral-400)" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label={tr("Mật khẩu", "Password")}
              type={showPassword ? "text" : "password"}
              fullWidth
              size="medium"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoggingIn}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} color="var(--mui-palette-neutral-400)" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={tr("Ẩn/Hiện mật khẩu", "Toggle password visibility")}
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Cloudflare Turnstile */}
            <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
              <TurnstileWidget
                ref={turnstileRef}
                action="admin_login"
                theme="auto"
                onSuccess={handleTurnstileSuccess}
                onExpire={handleTurnstileExpire}
                onError={handleTurnstileError}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={isLoggingIn}
              startIcon={
                isLoggingIn ? <CircularProgress size={18} color="inherit" /> : <ShieldCheck size={20} />
              }
              sx={{
                py: 1.4,
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "0.95rem",
                textTransform: "none",
              }}
            >
              {isLoggingIn ? tr("Đang xác thực…", "Authenticating…") : tr("Đăng nhập Hệ thống", "Sign in to Console")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Footer Notice */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 3, textAlign: "center", maxWidth: 400, opacity: 0.8 }}
      >
        {tr(
          "Hệ thống giám sát bảo mật liên tục. Mọi nỗ lực truy cập trái phép đều được ghi nhận vào nhật ký an ninh.",
          "Continuously monitored secure system. Unauthorized access attempts are recorded in security logs."
        )}
      </Typography>
    </Box>
  );
}
