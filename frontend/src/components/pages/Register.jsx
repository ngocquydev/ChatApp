import { useState, useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  IconButton,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress,
  CssBaseline,
  Avatar,
  AvatarGroup,
  LinearProgress,
} from "@mui/material";
import { useMotionValue, useTransform, animate } from "motion/react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Check,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import useSocialAuth from "../../hooks/useSocialAuth";
import registerData from "@/data/registerData";

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Vui lòng nhập họ và tên")
      .regex(/^[a-zA-ZÀ-ỹ\s]+$/, "Tên chỉ được chứa chữ cái và khoảng trắng"),

    email: z
      .string()
      .min(1, "Vui lòng nhập địa chỉ email")
      .email("Định dạng email không hợp lệ"),

    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^(0[3|5|7|8|9])+([0-9]{8})$/.test(val),
        "Số điện thoại không hợp lệ (Ví dụ: 0987654321)",
      ),

    password: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu")
      .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự")
      .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ cái thường")
      .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ cái hoa")
      .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một chữ số")
      .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"),

    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),

    terms: z.boolean().refine((val) => val === true, {
      message: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp!",
    path: ["confirmPassword"],
  });

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.41 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.875 11.85v-8.38H7.078V12h3.047V9.413c0-3.007 1.792-4.672 4.533-4.672 1.312 0 2.686.234 2.686.234v2.953h-1.514c-1.49 0-1.955.925-1.955 1.875V12h3.328l-.532 3.47h-2.796v8.38A12.003 12.003 0 0 0 24 12Z"
      />
    </svg>
  );
}

function SmoothTypewriter({ words = ["Bắt đầu hành trình mới!"] }) {
  const [index, setIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const text = words[index];
    let timeoutId;
    let deleting;

    const typing = animate(count, text.length, {
      type: "tween",
      duration: text.length * 0.08,
      ease: "linear",
      onComplete: () => {
        timeoutId = setTimeout(() => {
          deleting = animate(count, 0, {
            type: "tween",
            duration: text.length * 0.04,
            ease: "linear",
            onComplete: () => {
              setIndex((prev) => (prev + 1) % words.length);
            },
          });
        }, 1000);
      },
    });

    const unsubscribe = rounded.on("change", (latest) => {
      setCurrentText(text.slice(0, latest));
    });

    return () => {
      clearTimeout(timeoutId);
      typing.stop();
      deleting?.stop();
      unsubscribe();
    };
  }, [index, words]);

  return (
    <span
      style={{
        display: "inline-block",
        minWidth: "280px",
        whiteSpace: "nowrap",
      }}
    >
      {currentText}
    </span>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    isAuthenticated,
    isCheckingAuth,
    isLoggingIn,
    registerMe,
  } = useAuthStore();

  const [alertInfo, setAlertInfo] = useState({
    open: false,
    type: "info",
    message: "",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const watchedPassword = watch("password", "");

  // Tính điểm độ mạnh mật khẩu (0 - 100)
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "inherit" };
    let score = 0;
    if (pwd.length >= 8) score += 20;
    if (/[a-z]/.test(pwd)) score += 20;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score <= 40) return { score, label: "Yếu", color: "#ef4444" };
    if (score <= 80) return { score, label: "Trung bình", color: "#f59e0b" };
    return { score, label: "Rất mạnh", color: "#10b981" };
  };

  const strength = calculatePasswordStrength(watchedPassword);

  // Chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isCheckingAuth, navigate]);

  const onSubmit = async (data) => {
    setAlertInfo({ open: false, type: "info", message: "" });
    try {
      await registerMe({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });

      setAlertInfo({
        open: true,
        type: "success",
        message: "Đăng ký tài khoản thành công! Đang chuyển hướng...",
      });

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      let message = "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin!";
      if (err.response?.data?.message) {
        message = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }

      setAlertInfo({
        open: true,
        type: "error",
        message,
      });
    }
  };

  const {
    handleGoogleLogin,
    handleFacebookLogin,
    isGoogleLoading,
    isFacebookLoading,
  } = useSocialAuth({
    onError: (message) =>
      setAlertInfo({
        open: true,
        type: message === "Email này đã được đăng ký" ? "warning" : "error",
        message,
      }),
  });

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        bgcolor: "#ffffff",
      }}
    >
      <CssBaseline />

      {/* Cột trái: Hero & Feature Showcase */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #090d16 0%, #0f172a 40%, #1e1b4b 100%)",
          color: "#ffffff",
          p: { md: 6, lg: 8 },
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Glow orbs */}
        <Box
          sx={{
            position: "absolute",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0) 70%)",
            top: "-10%",
            left: "-10%",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(168,85,247,0) 70%)",
            bottom: "-15%",
            right: "-10%",
            filter: "blur(70px)",
            pointerEvents: "none",
          }}
        />

        {/* Header trái: Logo */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                background:
                  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
              }}
            >
              <Sparkles size={22} color="#ffffff" />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.5px",
                background: "linear-gradient(to right, #ffffff, #cbd5e1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {registerData.logo}
            </Typography>
          </Box>
        </Box>

        {/* Content giữa: Badge, Tiêu đề, Typewriter & Features */}
        <Box sx={{ position: "relative", zIndex: 1, my: "auto", py: 4 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 2,
              py: 0.8,
              borderRadius: "999px",
              bgcolor: "rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              mb: 3,
            }}
          >
            <Sparkles size={16} color="#a855f7" />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "#e2e8f0", letterSpacing: "0.2px" }}
            >
              {registerData.badge}
            </Typography>
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-1px",
              mb: 2,
              color: "#ffffff",
            }}
          >
            {registerData.title}
          </Typography>

          <Box
            sx={{
              fontSize: "1.2rem",
              fontWeight: 500,
              color: "#93c5fd",
              mb: 3,
              minHeight: "36px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <SmoothTypewriter words={registerData.quote} />
          </Box>

          <Typography
            variant="body1"
            sx={{
              color: "#94a3b8",
              lineHeight: 1.7,
              maxWidth: 500,
              mb: 4,
            }}
          >
            {registerData.description}
          </Typography>

          {/* Danh sách tính năng */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {registerData.features.map((feature, idx) => {
              const IconComp = feature.icon;
              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "10px",
                      bgcolor: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} color="#818cf8" />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "#cbd5e1", fontWeight: 500 }}
                  >
                    {feature.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Footer trái: Community card */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2,
              borderRadius: "16px",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              maxWidth: 420,
            }}
          >
            <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 34, height: 34 } }}>
              <Avatar src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop" />
              <Avatar src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop" />
              <Avatar src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop" />
              <Avatar src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop" />
            </AvatarGroup>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#ffffff" }}>
                {registerData.position}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                Gia nhập ngay để trải nghiệm nền tảng
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Cột phải: Form đăng ký */}
      <Box
        sx={{
          flex: { xs: 1, md: "0 0 540px", lg: "0 0 600px" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: { xs: 3, sm: 5, md: 6 },
          overflowY: "auto",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 440 }}>
          {/* Header form */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                mb: 1,
              }}
            >
              {registerData.form.title}
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {registerData.form.description}
            </Typography>
          </Box>

          {/* Alert thông báo */}
          {alertInfo.open && (
            <Alert
              severity={alertInfo.type}
              onClose={() => setAlertInfo({ ...alertInfo, open: false })}
              sx={{ mb: 3, borderRadius: "10px" }}
            >
              {alertInfo.message}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Họ và tên */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.6,
                  display: "block",
                }}
              >
                {registerData.form.name.label} *
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={registerData.form.name.placeholder}
                {...register("name")}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    "&:hover": { bgcolor: "#f1f5f9" },
                    "&.Mui-focused": { bgcolor: "#ffffff" },
                  },
                }}
              />
            </Box>

            {/* Email */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.6,
                  display: "block",
                }}
              >
                {registerData.form.email.label} *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder={registerData.form.email.placeholder}
                {...register("email")}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    "&:hover": { bgcolor: "#f1f5f9" },
                    "&.Mui-focused": { bgcolor: "#ffffff" },
                  },
                }}
              />
            </Box>

            {/* Số điện thoại */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.6,
                  display: "block",
                }}
              >
                {registerData.form.phone.label}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="tel"
                placeholder={registerData.form.phone.placeholder}
                {...register("phone")}
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    "&:hover": { bgcolor: "#f1f5f9" },
                    "&.Mui-focused": { bgcolor: "#ffffff" },
                  },
                }}
              />
            </Box>

            {/* Mật khẩu */}
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.6,
                  display: "block",
                }}
              >
                {registerData.form.password.label} *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type={showPassword ? "text" : "password"}
                placeholder={registerData.form.password.placeholder}
                {...register("password")}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          aria-label={
                            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} color="#94a3b8" />
                          ) : (
                            <Eye size={18} color="#94a3b8" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    "&:hover": { bgcolor: "#f1f5f9" },
                    "&.Mui-focused": { bgcolor: "#ffffff" },
                  },
                }}
              />

              {/* Thanh độ mạnh mật khẩu */}
              {watchedPassword && (
                <Box sx={{ mt: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "#64748b" }}>
                      Độ mạnh:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: strength.color }}
                    >
                      {strength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={strength.score}
                    sx={{
                      height: 5,
                      borderRadius: 3,
                      bgcolor: "#e2e8f0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: strength.color,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Xác nhận mật khẩu */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.6,
                  display: "block",
                }}
              >
                {registerData.form.confirmPassword.label} *
              </Typography>
              <TextField
                fullWidth
                size="small"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={registerData.form.confirmPassword.placeholder}
                {...register("confirmPassword")}
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          aria-label={
                            showConfirmPassword
                              ? "Ẩn mật khẩu"
                              : "Hiện mật khẩu"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} color="#94a3b8" />
                          ) : (
                            <Eye size={18} color="#94a3b8" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    bgcolor: "#f8fafc",
                    "&:hover": { bgcolor: "#f1f5f9" },
                    "&.Mui-focused": { bgcolor: "#ffffff" },
                  },
                }}
              />
            </Box>

            {/* Checkbox điều khoản */}
            <Box sx={{ mb: 2.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    {...register("terms")}
                    sx={{
                      color: "#94a3b8",
                      "&.Mui-checked": { color: "#6366f1" },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "#64748b" }}>
                    {registerData.form.termsText}{" "}
                    <Link
                      component={RouterLink}
                      to="#"
                      sx={{ color: "primary.main", fontWeight: 600 }}
                    >
                      {registerData.form.termsLink}
                    </Link>{" "}
                    {registerData.form.andText}{" "}
                    <Link
                      component={RouterLink}
                      to="#"
                      sx={{ color: "primary.main", fontWeight: 600 }}
                    >
                      {registerData.form.privacyLink}
                    </Link>
                  </Typography>
                }
              />
              {errors.terms && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 0.5, ml: 1 }}
                >
                  {errors.terms.message}
                </Typography>
              )}
            </Box>

            {/* Nút Đăng ký */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting || isLoggingIn}
              endIcon={
                isSubmitting || isLoggingIn ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <ArrowRight size={18} />
                )
              }
              sx={{
                py: 1.3,
                borderRadius: "10px",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.45)",
                },
              }}
            >
              {isSubmitting || isLoggingIn
                ? "Đang tạo tài khoản..."
                : registerData.form.registerButton}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "#94a3b8",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                {registerData.form.divider}
              </Typography>
            </Divider>

            {/* Nút mạng xã hội */}
            <Box sx={{ display: "flex", gap: 1.5, width: "100%" }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogleLogin}
                disabled={isSubmitting || isLoggingIn || isGoogleLoading || isFacebookLoading}
                startIcon={
                  isGoogleLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <GoogleIcon />
                  )
                }
                sx={{
                  flex: 1,
                  py: 1.2,
                  borderRadius: "10px",
                  borderColor: "#e2e8f0",
                  color: "#1e293b",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  backgroundColor: "#ffffff",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {isGoogleLoading ? "Đang xử lý..." : registerData.form.googleButton}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleFacebookLogin}
                disabled={isSubmitting || isLoggingIn || isGoogleLoading || isFacebookLoading}
                startIcon={
                  isFacebookLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <FacebookIcon />
                  )
                }
                sx={{
                  flex: 1,
                  py: 1.2,
                  borderRadius: "10px",
                  borderColor: "#e2e8f0",
                  color: "#1e293b",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  backgroundColor: "#ffffff",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {isFacebookLoading ? "Đang xử lý..." : registerData.form.facebookButton}
              </Button>
            </Box>

            {/* Chuyển sang Đăng nhập */}
            <Box sx={{ textAlign: "center", mt: 3.5 }}>
              <Typography variant="body2" sx={{ color: "#64748b" }}>
                {registerData.form.loginText}{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  underline="hover"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    ml: 0.5,
                  }}
                >
                  {registerData.form.loginButton}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
