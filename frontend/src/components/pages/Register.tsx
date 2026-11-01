"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
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
  Calendar,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import useSocialAuth from "../../hooks/useSocialAuth";
import { getRegisterData } from "@/data/registerData";
import { GoogleIcon, FacebookIcon } from "../common/SocialIcons";
import ColorModeToggle from "../common/ColorModeToggle";
import LanguageToggle from "../common/LanguageToggle";
import BrandLogo from "../common/BrandLogo";
import { useTranslation } from "@/i18n/useTranslation";

function createRegisterSchema(tr: (viText: string, enText: string) => string) {
  return z
    .object({
      name: z
        .string()
        .min(1, tr("Vui lòng nhập họ và tên", "Please enter your full name"))
        .min(2, tr("Họ và tên phải có ít nhất 2 ký tự", "Full name must be at least 2 characters"))
        .regex(/^[a-zA-Z0-9À-ỹ\s._-]+$/, tr("Tên không được chứa ký tự đặc biệt không hợp lệ", "Name must not contain invalid special characters")),

      email: z
        .string()
        .min(1, tr("Vui lòng nhập địa chỉ email", "Please enter your email address"))
        .email(tr("Định dạng email không hợp lệ", "Invalid email format")),

      phone: z
        .string()
        .optional()
        .refine(
          (val) => !val || /^(0[3|5|7|8|9])+([0-9]{8})$/.test(val),
          tr("Số điện thoại không hợp lệ (Ví dụ: 0987654321)", "Invalid phone number (e.g., 0987654321)")
        ),

      dateOfBirth: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;
            const date = new Date(val);
            const now = new Date();
            return !isNaN(date.getTime()) && date <= now;
          },
          tr("Ngày sinh không hợp lệ hoặc không thể ở tương lai", "Invalid date of birth or cannot be in the future")
        ),

      password: z
        .string()
        .min(1, tr("Vui lòng nhập mật khẩu", "Please enter your password"))
        .min(8, tr("Mật khẩu phải chứa ít nhất 8 ký tự", "Password must be at least 8 characters"))
        .regex(/[a-z]/, tr("Mật khẩu phải chứa ít nhất một chữ cái thường", "Password must contain at least one lowercase letter"))
        .regex(/[A-Z]/, tr("Mật khẩu phải chứa ít nhất một chữ cái hoa", "Password must contain at least one uppercase letter"))
        .regex(/[0-9]/, tr("Mật khẩu phải chứa ít nhất một chữ số", "Password must contain at least one digit"))
        .regex(/[^a-zA-Z0-9]/, tr("Mật khẩu phải chứa ít nhất một ký tự đặc biệt", "Password must contain at least one special character")),

      confirmPassword: z.string().min(1, tr("Vui lòng xác nhận mật khẩu", "Please confirm your password")),

      terms: z.boolean().refine((val) => val === true, {
        message: tr(
          "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật",
          "You must agree to the Terms of Service and Privacy Policy"
        ),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tr("Mật khẩu xác nhận không khớp!", "Confirmation password does not match!"),
      path: ["confirmPassword"],
    });
}

type RegisterFormData = {
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};

function SmoothTypewriter({
  words = ["Bắt đầu hành trình mới!"],
}: {
  words?: string[];
}) {
  const [index, setIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const text = words[index];
    let timeoutId: ReturnType<typeof setTimeout>;
    let deleting: { stop: () => void } | undefined;

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
  }, [index, words, count, rounded]);

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
  const { language, tr } = useTranslation();
  const registerData = getRegisterData(language);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    user,
    isAuthenticated,
    isCheckingAuth,
    isLoggingIn,
    registerMe,
  } = useAuthStore();

  const [alertInfo, setAlertInfo] = useState<{
    open: boolean;
    type: "error" | "warning" | "info" | "success";
    message: string;
  }>({
    open: false,
    type: "info",
    message: "",
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(createRegisterSchema(tr)),
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
  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "", color: "inherit" };
    let score = 0;
    if (pwd.length >= 8) score += 20;
    if (/[a-z]/.test(pwd)) score += 20;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score <= 40) return { score, label: tr("Yếu", "Weak"), color: "var(--mui-palette-tone-ef4444)" };
    if (score <= 80) return { score, label: tr("Trung bình", "Medium"), color: "var(--mui-palette-tone-f59e0b)" };
    return { score, label: tr("Rất mạnh", "Very strong"), color: "var(--mui-palette-tone-10b981)" };
  };

  const strength = calculatePasswordStrength(watchedPassword || "");

  // Chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      router.replace("/");
    }
  }, [isAuthenticated, isCheckingAuth, user, router]);

  const onSubmit = async (data: RegisterFormData) => {
    setAlertInfo({ open: false, type: "info", message: "" });
    try {
      const payload: Record<string, string> = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      };
      if (data.phone && data.phone.trim()) {
        payload.phone = data.phone.trim();
      }
      if (data.dateOfBirth && data.dateOfBirth.trim()) {
        payload.dateOfBirth = data.dateOfBirth.trim();
      }

      await registerMe(payload);

      setAlertInfo({
        open: true,
        type: "success",
        message: tr("Đăng ký tài khoản thành công! Đang chuyển hướng...", "Account created successfully! Redirecting..."),
      });

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: unknown) {
      console.error("Lỗi đăng ký:", err);
      const error = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      let message = tr("Đăng ký không thành công. Vui lòng kiểm tra lại thông tin!", "Registration failed. Please check your information!");
      if (error.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
      } else if (error.message) {
        message = error.message;
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
        type:
          message === "Email này đã được đăng ký" ||
          message === "This email is already registered"
            ? "warning"
            : "error",
        message,
      }),
  });

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        width: "100%",
        overflowX: "hidden",
        bgcolor: "var(--mui-palette-background-paper)",
      }}
    >
      <CssBaseline />

      {/* Cột trái: Hero & Feature Showcase — luôn tối → ghim scheme sáng (data-light) */}
      <Box
        data-light=""
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, var(--mui-palette-tone-090d16) 0%, var(--mui-palette-tone-0f172a) 40%, var(--mui-palette-tone-1e1b4b) 100%)",
          color: "var(--mui-palette-common-white)",
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
          <BrandLogo size={52} />
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
            <Sparkles size={16} color="var(--mui-palette-tone-a855f7)" />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-200)", letterSpacing: "0.2px" }}
            >
              {registerData.badge}
            </Typography>
          </Box>

          <Typography
            variant="h3"
            component="h2"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-1px",
              mb: 2,
              color: "var(--mui-palette-common-white)",
            }}
          >
            {registerData.title}
          </Typography>

          <Box
            sx={{
              fontSize: "1.2rem",
              fontWeight: 500,
              color: "var(--mui-palette-brand-300)",
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
              color: "var(--mui-palette-neutral-400)",
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
                    <IconComp size={18} color="var(--mui-palette-tone-818cf8)" />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: "var(--mui-palette-neutral-300)", fontWeight: 500 }}
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
              <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-common-white)" }}>
                {registerData.position}
              </Typography>
              <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                {tr("Gia nhập ngay để trải nghiệm nền tảng", "Join now to experience the platform")}
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
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <LanguageToggle />
          <ColorModeToggle sx={{ color: "text.secondary" }} />
        </Box>
        <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: 480 } }}>
          {/* Logo hiển thị trên mobile */}
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 3 }}>
            <BrandLogo size={56} />
          </Box>

          {/* Header form */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                color: "var(--mui-palette-neutral-900)",
                letterSpacing: "-0.5px",
                mb: 1,
              }}
            >
              {registerData.form.title}
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)" }}>
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
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.name.label} *
              </Typography>
              <TextField
                fullWidth
                placeholder={registerData.form.name.placeholder}
                {...register("name")}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <User size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
                  },
                }}
              />
            </Box>

            {/* Email */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.email.label} *
              </Typography>
              <TextField
                fullWidth
                type="email"
                placeholder={registerData.form.email.placeholder}
                {...register("email")}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <Mail size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
                  },
                }}
              />
            </Box>

            {/* Số điện thoại */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.phone.label}
              </Typography>
              <TextField
                fullWidth
                type="tel"
                placeholder={registerData.form.phone.placeholder}
                {...register("phone")}
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <Phone size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
                  },
                }}
              />
            </Box>

            {/* Ngày sinh */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.dateOfBirth.label}
              </Typography>
              <TextField
                fullWidth
                type="date"
                placeholder={registerData.form.dateOfBirth.placeholder}
                {...register("dateOfBirth")}
                error={Boolean(errors.dateOfBirth)}
                helperText={errors.dateOfBirth?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <Calendar size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
                  },
                }}
              />
            </Box>

            {/* Mật khẩu */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.password.label} *
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder={registerData.form.password.placeholder}
                {...register("password")}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <Lock size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mr: 0.5 }}>
                        <IconButton
                          size="medium"
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          aria-label={
                            showPassword
                              ? tr("Ẩn mật khẩu", "Hide password")
                              : tr("Hiện mật khẩu", "Show password")
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={20} color="var(--mui-palette-neutral-500)" />
                          ) : (
                            <Eye size={20} color="var(--mui-palette-neutral-500)" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
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
                    <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                      {tr("Độ mạnh:", "Strength:")}
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
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "var(--mui-palette-neutral-200)",
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
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: "var(--mui-palette-neutral-700)",
                  mb: 0.75,
                  fontSize: "0.875rem",
                  display: "block",
                }}
              >
                {registerData.form.confirmPassword.label} *
              </Typography>
              <TextField
                fullWidth
                type={showConfirmPassword ? "text" : "password"}
                placeholder={registerData.form.confirmPassword.placeholder}
                {...register("confirmPassword")}
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword?.message}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                        <Lock size={20} color="var(--mui-palette-neutral-500)" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end" sx={{ mr: 0.5 }}>
                        <IconButton
                          size="medium"
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          aria-label={
                            showConfirmPassword
                              ? tr("Ẩn mật khẩu", "Hide password")
                              : tr("Hiện mật khẩu", "Show password")
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} color="var(--mui-palette-neutral-500)" />
                          ) : (
                            <Eye size={20} color="var(--mui-palette-neutral-500)" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 54,
                    borderRadius: "12px",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    fontSize: "1rem",
                    "& input": {
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 14px",
                      fontSize: "1rem",
                    },
                    "&:hover": { bgcolor: "var(--mui-palette-neutral-100)" },
                    "&.Mui-focused": {
                      bgcolor: "var(--mui-palette-background-paper)",
                      boxShadow: "none",
                    },
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
                      color: "var(--mui-palette-neutral-400)",
                      "&.Mui-checked": { color: "var(--mui-palette-tone-6366f1)" },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                    {registerData.form.termsText}{" "}
                    <Typography
                      component="span"
                      sx={{ color: "primary.main", fontWeight: 600, fontSize: "inherit", cursor: "pointer" }}
                    >
                      {registerData.form.termsLink}
                    </Typography>{" "}
                    {registerData.form.andText}{" "}
                    <Typography
                      component="span"
                      sx={{ color: "primary.main", fontWeight: 600, fontSize: "inherit", cursor: "pointer" }}
                    >
                      {registerData.form.privacyLink}
                    </Typography>
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
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <ArrowRight size={20} />
                )
              }
              sx={{
                height: 52,
                borderRadius: "12px",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 700,
                background:
                  "linear-gradient(135deg, var(--mui-palette-tone-fx-4f46e5) 0%, var(--mui-palette-tone-7c3aed) 100%)",
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, var(--mui-palette-tone-fx-4338ca) 0%, var(--mui-palette-tone-fx-6d28d9) 100%)",
                  boxShadow: "0 8px 24px rgba(99, 102, 241, 0.45)",
                },
              }}
            >
              {isSubmitting || isLoggingIn
                ? tr("Đang tạo tài khoản...", "Creating account...")
                : registerData.form.registerButton}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "var(--mui-palette-neutral-400)",
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
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <GoogleIcon />
                  )
                }
                sx={{
                  flex: 1,
                  height: 48,
                  borderRadius: "12px",
                  borderColor: "var(--mui-palette-neutral-200)",
                  color: "var(--mui-palette-neutral-800)",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  backgroundColor: "var(--mui-palette-background-paper)",
                  "&:hover": {
                    borderColor: "var(--mui-palette-neutral-300)",
                    backgroundColor: "var(--mui-palette-neutral-50)",
                  },
                }}
              >
                {isGoogleLoading ? tr("Đang xử lý...", "Processing...") : registerData.form.googleButton}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleFacebookLogin}
                disabled={isSubmitting || isLoggingIn || isGoogleLoading || isFacebookLoading}
                startIcon={
                  isFacebookLoading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <FacebookIcon />
                  )
                }
                sx={{
                  flex: 1,
                  height: 48,
                  borderRadius: "12px",
                  borderColor: "var(--mui-palette-neutral-200)",
                  color: "var(--mui-palette-neutral-800)",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  backgroundColor: "var(--mui-palette-background-paper)",
                  "&:hover": {
                    borderColor: "var(--mui-palette-neutral-300)",
                    backgroundColor: "var(--mui-palette-neutral-50)",
                  },
                }}
              >
                {isFacebookLoading ? tr("Đang xử lý...", "Processing...") : registerData.form.facebookButton}
              </Button>
            </Box>

            {/* Chuyển sang Đăng nhập */}
            <Box sx={{ textAlign: "center", mt: 3.5 }}>
              <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                {registerData.form.loginText}{" "}
                <Link
                  href="/login"
                  style={{
                    fontWeight: 700,
                    color: "var(--mui-palette-brand-600)",
                    marginLeft: 4,
                    textDecoration: "none",
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
