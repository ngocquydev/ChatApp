"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  IconButton,
  InputAdornment,
  Divider,
  Alert,
  CircularProgress,
  CssBaseline,
  Avatar,
  AvatarGroup,
} from "@mui/material";
import { useMotionValue, useTransform, animate } from "motion/react";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { getLoginData } from "@/data/loginData";
import { useAuthStore } from "../../store/useAuthStore";
import useSocialAuth from "../../hooks/useSocialAuth";
import TurnstileWidget, { TurnstileRef } from "../common/TurnstileWidget";
import { GoogleIcon, FacebookIcon } from "../common/SocialIcons";
import ColorModeToggle from "../common/ColorModeToggle";
import LanguageToggle from "../common/LanguageToggle";
import BrandLogo from "../common/BrandLogo";
import { useTranslation } from "@/i18n/useTranslation";

function createLoginSchema(tr: (viText: string, enText: string) => string) {
  return z.object({
    email: z
      .string()
      .min(1, tr("Vui lòng nhập địa chỉ email", "Please enter your email address"))
      .email(tr("Định dạng email không hợp lệ", "Invalid email format")),

    password: z
      .string()
      .min(1, tr("Vui lòng nhập mật khẩu", "Please enter your password"))
      .min(8, tr("Mật khẩu phải chứa ít nhất 8 ký tự", "Password must be at least 8 characters"))
      .regex(/[a-z]/, tr("Mật khẩu phải chứa ít nhất một chữ cái thường", "Password must contain at least one lowercase letter"))
      .regex(/[A-Z]/, tr("Mật khẩu phải chứa ít nhất một chữ cái hoa", "Password must contain at least one uppercase letter"))
      .regex(/[0-9]/, tr("Mật khẩu phải chứa ít nhất một chữ số", "Password must contain at least one digit"))
      .regex(/[^a-zA-Z0-9]/, tr("Mật khẩu phải chứa ít nhất một ký tự đặc biệt", "Password must contain at least one special character")),
  });
}

type LoginFormData = {
  email: string;
  password: string;
};

function SmoothTypewriter({
  words = ["Chào mừng bạn!", "Hôm nay thế nào?"],
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

    // Gõ chữ
    const typing = animate(count, text.length, {
      type: "tween",
      duration: text.length * 0.08,
      ease: "linear",

      onComplete: () => {
        // Dừng 1 giây
        timeoutId = setTimeout(() => {
          // Xóa chữ
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

    // Cập nhật text
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
        borderRight: "2px solid var(--mui-palette-brand-400)",
        paddingRight: "2px",
        animation: "blink 0.8s infinite",
      }}
    >
      {currentText}
    </span>
  );
}

export default function Login() {
  const { language, tr } = useTranslation();
  const login = getLoginData(language);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
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


  const {
    user,
    isAuthenticated,
    isCheckingAuth,
    isLoggingIn,
    loginMe,
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(createLoginSchema(tr)),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Tự động chuyển hướng nếu người dùng đã đăng nhập sẵn
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      router.replace("/");
    }
  }, [isAuthenticated, isCheckingAuth, user, router]);

  // Khôi phục email nếu người dùng đã tích chọn "Ghi nhớ đăng nhập" trước đó
  useEffect(() => {
    const savedEmail = localStorage.getItem("remember_email");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    const isDev =
      process.env.NODE_ENV !== "production" ||
      (typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"));
    const token = turnstileToken || (isDev ? "dev_bypass_turnstile" : "");

    if (!token) {
      setAlertInfo({
        open: true,
        type: "warning",
        message: tr(
          "Vui lòng hoàn thành xác minh bảo mật Cloudflare Turnstile trước khi đăng nhập!",
          "Please complete the Cloudflare Turnstile security check before signing in!"
        ),
      });
      return;
    }

    setAlertInfo({ open: false, type: "info", message: "" });
    try {
      const res = (await loginMe({
        email: data.email,
        password: data.password,
        turnstileToken: token,
      })) as { profile?: { role?: string }; user?: { role?: string } } | undefined;

      if (rememberMe) {
        localStorage.setItem("remember_email", data.email);
      } else {
        localStorage.removeItem("remember_email");
      }

      const role =
        res?.profile?.role ||
        res?.user?.role ||
        useAuthStore.getState().user?.role;
      const searchParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null;
      const redirect = searchParams?.get("redirect");

      if (redirect) {
        router.push(redirect);
      
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      // Reset Turnstile token khi đăng nhập thất bại để yêu cầu xác minh lại
      turnstileRef.current?.reset();
      setTurnstileToken("");

      const error = err as { response?: { data?: { message?: string | string[] } } };
      let message = tr("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!", "Sign in failed. Please check your credentials!");
      if (error.response?.data?.message) {
        message = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(", ")
          : error.response.data.message;
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
      {/* Hero luôn tối → ghim scheme sáng (data-light) để token không đảo ở dark mode */}
      <Box
        data-light=""
        sx={{
          flex: 1,
          display: {
            xs: "none",
            md: "flex",
          },
          flexDirection: "column",
          justifyContent: "space-between",
          p: {
            sm: 4,
            md: 8,
          },
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, var(--mui-palette-tone-090d16) 0%, var(--mui-palette-tone-171836) 50%, var(--mui-palette-tone-1e40af) 100%)",
          color: "var(--mui-palette-common-white)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "-15%",
            left: "-15%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            zIndex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <BrandLogo size={52} />
        </Box>

        <Box
          sx={{
            maxWidth: 540,
            zIndex: 1,
            my: "auto",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              px: 1.6,
              py: 0.6,
              mb: 3,
              borderRadius: "20px",
              bgcolor: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
            }}
          >
            <Sparkles size={14} color="var(--mui-palette-brand-400)" />

            <Typography
              variant="caption"
              sx={{
                color: "var(--mui-palette-brand-300)",
                fontWeight: 600,
              }}
            >
              {login.badge}
            </Typography>
          </Box>

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: {
                sm: "2.2rem",
                md: "2.9rem",
              },
              lineHeight: 1.2,
              mb: 2.5,
              background: "linear-gradient(180deg, var(--mui-palette-background-paper) 0%, var(--mui-palette-neutral-300) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {login.title}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "rgba(226, 232, 240, 0.8)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              mb: 4,
            }}
          >
            {login.description}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.8,
              mb: 4,
            }}
          >
            {login.features.map((item, index) => {
              const Icon = item.icon;

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Icon size={18} color="var(--mui-palette-tone-4ade80)" />

                  <Typography
                    variant="body2"
                    sx={{
                      color: "var(--mui-palette-neutral-200)",
                    }}
                  >
                    {item.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.07)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "var(--mui-palette-neutral-100)",
                fontStyle: "italic",
                mb: 2,
              }}
            >
              <SmoothTypewriter words={login.quote} />
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "var(--mui-palette-brand-500)",
                    fontSize: "0.85rem",
                  }}
                >
                  {login.avatar}
                </Avatar>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {login.author}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "var(--mui-palette-neutral-400)",
                    }}
                  >
                    {login.position}
                  </Typography>
                </Box>
              </Box>

              <AvatarGroup
                max={3}
                sx={{
                  "& .MuiAvatar-root": {
                    width: 26,
                    height: 26,
                    fontSize: "0.75rem",
                  },
                }}
              >
                <Avatar alt="User 1" />
                <Avatar alt="User 2" />
                <Avatar alt="User 3" />
              </AvatarGroup>
            </Box>
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: "var(--mui-palette-neutral-500)",
            zIndex: 1,
          }}
        >
          {login.copyright}
        </Typography>
      </Box>

      <Box
        component={Paper}
        elevation={0}
        square
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          p: {
            xs: 3,
            sm: 6,
            md: 8,
          },
          position: "relative",
          backgroundColor: "var(--mui-palette-background-paper)",
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
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", sm: 480 },
            p: {
              xs: 3,
              sm: 5,
            },
            borderRadius: "16px",
            border: "1px solid var(--mui-palette-neutral-200)",
            bgcolor: "var(--mui-palette-background-paper)",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          }}
        >
          {/* Logo hiển thị trên mobile */}
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 3 }}>
            <BrandLogo size={56} />
          </Box>

          {/* Header */}
          <Box
            sx={{
              mb: 3.5,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "var(--mui-palette-neutral-900)",
                letterSpacing: "-0.5px",
                mb: 1,
              }}
            >
              {login.form.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "var(--mui-palette-neutral-500)",
              }}
            >
              {login.form.description}
            </Typography>
          </Box>

          {alertInfo.open && (
            <Alert
              severity={alertInfo.type}
              onClose={() =>
                setAlertInfo((prev) => ({
                  ...prev,
                  open: false,
                }))
              }
              sx={{
                mb: 3,
                borderRadius: 2,
              }}
            >
              {alertInfo.message}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "var(--mui-palette-neutral-700)",
                fontSize: "0.875rem",
                mb: 0.75,
                display: "block",
              }}
            >
              {login.form.email.label}
            </Typography>

            <TextField
              required
              fullWidth
              id="email"
              placeholder={login.form.email.placeholder}
              autoComplete="email"
              {...register("email")}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  height: 54,
                  borderRadius: "12px",
                  backgroundColor: "var(--mui-palette-neutral-50)",
                  fontSize: "1rem",
                  "& input": {
                    height: "100%",
                    boxSizing: "border-box",
                    padding: "0 14px",
                    fontSize: "1rem",
                  },
                  "&:hover fieldset": {
                    borderColor: "var(--mui-palette-neutral-400)",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "var(--mui-palette-background-paper)",
                    boxShadow: "none",
                  },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ ml: 0.5, mr: 1 }}>
                      <Mail size={20} color="var(--mui-palette-neutral-500)" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "var(--mui-palette-neutral-700)",
                fontSize: "0.875rem",
                mb: 0.75,
                display: "block",
              }}
            >
              {login.form.password.label}
            </Typography>

            <TextField
              required
              fullWidth
              placeholder={login.form.password.placeholder}
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              {...register("password")}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  height: 54,
                  borderRadius: "12px",
                  backgroundColor: "var(--mui-palette-neutral-50)",
                  fontSize: "1rem",
                  "& input": {
                    height: "100%",
                    boxSizing: "border-box",
                    padding: "0 14px",
                    fontSize: "1rem",
                  },
                  "&:hover fieldset": {
                    borderColor: "var(--mui-palette-neutral-400)",
                  },
                  "&.Mui-focused": {
                    backgroundColor: "var(--mui-palette-background-paper)",
                    boxShadow: "none",
                  },
                },
              }}
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
                        aria-label={
                          showPassword
                            ? tr("Ẩn mật khẩu", "Hide password")
                            : tr("Hiện mật khẩu", "Show password")
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        size="medium"
                        type="button"
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
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: "var(--mui-palette-neutral-300)",
                      "&.Mui-checked": {
                        color: "primary.main",
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{
                      color: "var(--mui-palette-neutral-600)",
                      fontSize: "0.875rem",
                    }}
                  >
                    {login.labelRememberme}
                  </Typography>
                }
                sx={{
                  margin: 0,
                }}
              />

              <Link
                href="/forgot-password"
                style={{
                  fontWeight: 600,
                  color: "var(--mui-palette-brand-600)",
                  fontSize: "0.875rem",
                  textDecoration: "none",
                }}
              >
                {login.labelForget}
              </Link>
            </Box>

            {/* Cloudflare Turnstile Widget */}
            <TurnstileWidget
              ref={turnstileRef}
              onSuccess={handleTurnstileSuccess}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={
                isSubmitting ||
                isLoggingIn ||
                isGoogleLoading ||
                isFacebookLoading
              }
              endIcon={
                !isSubmitting &&
                !isLoggingIn && <ArrowRight size={18} />
              }
              sx={{
                height: 52,
                borderRadius: "12px",
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
                background: "linear-gradient(180deg, var(--mui-palette-brand-600) 0%, var(--mui-palette-brand-700) 100%)",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease-in-out",

                "&:hover": {
                  boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {isSubmitting || isLoggingIn ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                  }}
                >
                  <CircularProgress size={18} color="inherit" />
                  <span>{tr("Đang đăng nhập...", "Signing in...")}</span>
                </Box>
              ) : (
                login.form.loginButton
              )}
            </Button>

            <Divider
              sx={{
                my: 3,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "var(--mui-palette-neutral-400)",
                  px: 1,
                  fontWeight: 500,
                }}
              >
                {login.form.divider}
              </Typography>
            </Divider>

            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                width: "100%",
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogleLogin}
                disabled={
                  isSubmitting ||
                  isLoggingIn ||
                  isGoogleLoading ||
                  isFacebookLoading
                }
                startIcon={
                  isGoogleLoading ? (
                    <CircularProgress size={16} color="inherit" />
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
                  transition: "all 0.15s ease",

                  "&:hover": {
                    borderColor: "var(--mui-palette-neutral-300)",
                    backgroundColor: "var(--mui-palette-neutral-50)",
                  },
                }}
              >
                {isGoogleLoading ? tr("Đang xử lý...", "Processing...") : login.form.googleButton}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleFacebookLogin}
                disabled={
                  isSubmitting ||
                  isLoggingIn ||
                  isGoogleLoading ||
                  isFacebookLoading
                }
                startIcon={
                  isFacebookLoading ? (
                    <CircularProgress size={16} color="inherit" />
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
                  transition: "all 0.15s ease",

                  "&:hover": {
                    borderColor: "var(--mui-palette-neutral-300)",
                    backgroundColor: "var(--mui-palette-neutral-50)",
                  },
                }}
              >
                {isFacebookLoading ? tr("Đang xử lý...", "Processing...") : login.form.facebookButton}
              </Button>
            </Box>

            <Box
              sx={{
                textAlign: "center",
                mt: 3.5,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "var(--mui-palette-neutral-500)",
                }}
              >
                {login.form.registerText}

                <Link
                  href="/register"
                  style={{
                    fontWeight: 700,
                    color: "var(--mui-palette-brand-600)",
                    marginLeft: 4,
                    textDecoration: "none",
                  }}
                >
                  {login.form.registerButton}
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
