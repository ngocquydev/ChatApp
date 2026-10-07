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
} from "@mui/material";
import { useMotionValue, useTransform, animate } from "motion/react";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";

import login from "@/data/loginData";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Định dạng email không hợp lệ"),

  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .min(8, "Mật khẩu phải chứa ít nhất 8 ký tự")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất một chữ cái thường")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ cái hoa")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một chữ số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất một ký tự đặc biệt"),

  remember: z.boolean().default(false),
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

function SmoothTypewriter({ words = ["Chào mừng bạn!", "Hôm nay thế nào?"] }) {
  const [index, setIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");

  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const text = words[index];

    let timeoutId;
    let deleting;

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
  }, [index]);

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
export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [alertInfo, setAlertInfo] = useState({
    open: false,
    type: "info",
    message: "",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: localStorage.getItem("rememberedEmail") || "",
      password: "",
      remember: Boolean(localStorage.getItem("rememberedEmail")),
    },
  });

  const rememberValue = watch("remember");

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (token) {
      navigate("/", {
        replace: true,
      });
    }
  }, [navigate]);

  const onSubmit = async (data) => {
    setAlertInfo({
      open: false,
      type: "info",
      message: "",
    });

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(
          resData.message ||
            "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!",
        );
      }

      if (data.remember) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      localStorage.setItem(
        "authToken",
        resData.token || "jwt_token_placeholder",
      );

      if (resData.user) {
        localStorage.setItem("user", JSON.stringify(resData.user));
      }

      setAlertInfo({
        open: true,
        type: "success",
        message: "Đăng nhập thành công! Đang chuyển hướng...",
      });

      setTimeout(() => {
        navigate("/", {
          replace: true,
        });
      }, 1000);
    } catch (err) {
      setAlertInfo({
        open: true,
        type: "error",
        message:
          err.message || "Không thể kết nối tới máy chủ. Vui lòng thử lại sau!",
      });
    }
  };
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/facebook";
  };

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
      <Box
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
            "linear-gradient(135deg, #090d16 0%, #171836 50%, #1e40af 100%)",
          color: "#ffffff",
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
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "12px",
              bgcolor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 18px rgba(37,99,235,0.45)",
            }}
          >
            <Sparkles size={22} color="#ffffff" />
          </Box>

          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              letterSpacing: "-0.5px",
            }}
          >
            {login.logo}
          </Typography>
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
            <Sparkles size={14} color="#60a5fa" />

            <Typography
              variant="caption"
              sx={{
                color: "#93c5fd",
                fontWeight: 600,
              }}
            >
              {login.badge}
            </Typography>
          </Box>

          <Typography
            variant="h2"
            fontWeight={800}
            sx={{
              fontSize: {
                sm: "2.2rem",
                md: "2.9rem",
              },
              lineHeight: 1.2,
              mb: 2.5,
              background: "linear-gradient(180deg, #FFFFFF 0%, #cbd5e1 100%)",
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
                  <Icon size={18} color="#4ade80" />

                  <Typography
                    variant="body2"
                    sx={{
                      color: "#e2e8f0",
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
                color: "#f1f5f9",
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
                    bgcolor: "#3b82f6",
                    fontSize: "0.85rem",
                  }}
                >
                  {login.avatar}
                </Avatar>

                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {login.author}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#94a3b8",
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
            color: "#64748b",
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
          backgroundColor: "#ffffff",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 440,
            p: {
              xs: 3,
              sm: 4,
            },
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          }}
        >
          {/* Header */}

          <Box
            sx={{
              mb: 3.5,
            }}
          >
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                color: "#0f172a",
                letterSpacing: "-0.5px",
                mb: 1,
              }}
            >
              {login.form.title}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: "#64748b",
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
              variant="caption"
              fontWeight={600}
              sx={{
                color: "#334155",
              }}
            >
              {login.form.email.label}
            </Typography>

            <TextField
              margin="dense"
              required
              fullWidth
              id="email"
              placeholder={login.form.email.placeholder}
              autoComplete="email"
              autoFocus
              {...register("email")}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              sx={{
                mb: 2,

                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",

                  "&:hover fieldset": {
                    borderColor: "#94a3b8",
                  },

                  "&.Mui-focused": {
                    backgroundColor: "#ffffff",
                  },
                },
              }}
              slotProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail size={18} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
            />

            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: "#334155",
              }}
            >
              {login.form.password.label}
            </Typography>

            <TextField
              margin="dense"
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
                mb: 1.5,

                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  backgroundColor: "#f8fafc",

                  "&:hover fieldset": {
                    borderColor: "#94a3b8",
                  },

                  "&.Mui-focused": {
                    backgroundColor: "#ffffff",
                  },
                },
              }}
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
                        aria-label={
                          showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                        }
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        size="small"
                        type="button"
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
                    checked={rememberValue}
                    onChange={(e) => setValue("remember", e.target.checked)}
                    sx={{
                      color: "#cbd5e1",

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
                      color: "#475569",
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
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                underline="hover"
                sx={{
                  fontWeight: 600,
                  color: "primary.main",
                  fontSize: "0.875rem",
                }}
              >
                {login.labelForget}
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              endIcon={!isSubmitting && <ArrowRight size={18} />}
              sx={{
                py: 1.35,
                borderRadius: "10px",
                textTransform: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                background: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease-in-out",

                "&:hover": {
                  boxShadow: "0 6px 20px rgba(37, 99, 235, 0.45)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={22} color="inherit" />
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
                  color: "#94a3b8",
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
                startIcon={<GoogleIcon />}
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
                  transition: "all 0.15s ease",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {login.form.googleButton}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleFacebookLogin}
                startIcon={<FacebookIcon />}
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
                  transition: "all 0.15s ease",

                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                  },
                }}
              >
                {login.form.facebookButton}
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
                  color: "#64748b",
                }}
              >
                {login.form.registerText}

                <Link
                  component={RouterLink}
                  to="/register"
                  underline="hover"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    ml: 0.5,
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
