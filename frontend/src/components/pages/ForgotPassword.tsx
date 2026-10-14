"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import {
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

export default function ForgotPassword() {
  const router = useRouter();
  const { forgotPassword, verifyOtp, resetPassword } = useAuthStore();

  // Current Step: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Loading & Cooldown
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isCounting, setIsCounting] = useState(false);
  const [redirectCount, setRedirectCount] = useState(5);

  // OTP Inputs refs for auto-focus
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Toast notification state
  const [toast, setToast] = useState<{
    open: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({
    open: false,
    type: "info",
    message: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ open: true, message, type });
  };

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCounting && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsCounting(false);
    }
    return () => clearInterval(timer);
  }, [isCounting, countdown]);

  // Auto redirect countdown on Step 4
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    if (step === 4 && redirectCount > 0) {
      redirectTimer = setInterval(() => {
        setRedirectCount((prev) => prev - 1);
      }, 1000);
    } else if (step === 4 && redirectCount === 0) {
      router.push("/login");
    }
    return () => clearInterval(redirectTimer);
  }, [step, redirectCount, router]);

  // STEP 1: Handle Send OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      showToast("Vui lòng nhập địa chỉ email của bạn!", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast("Định dạng email không hợp lệ!", "error");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(cleanEmail);
      showToast("Mã xác thực đã được gửi tới email của bạn!", "success");
      setStep(2);
      setCountdown(60);
      setIsCounting(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể gửi mã xác thực. Vui lòng thử lại!";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Inputs (type, auto-advance, backspace, paste)
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);

    // Auto advance to next box
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // STEP 2: Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join("");
    if (otpCode.length < 6) {
      showToast("Vui lòng nhập đủ 6 chữ số mã xác thực!", "error");
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtp(email.trim().toLowerCase(), otpCode);
      setResetToken(res.resetToken);
      showToast("Xác thực OTP thành công! Vui lòng đặt mật khẩu mới.", "success");
      setStep(3);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Mã OTP không chính xác hoặc đã hết hạn!";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (isCounting) return;
    setIsLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      showToast("Đã gửi lại mã OTP mới tới email của bạn!", "success");
      setCountdown(60);
      setIsCounting(true);
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gửi lại mã thất bại. Vui lòng thử lại sau!";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Strength Calculation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 25;
    if (/\d/.test(pwd)) score += 25;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const passwordScore = calculatePasswordStrength(newPassword);

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: "Chưa nhập", color: "#94a3b8" };
    if (score <= 25) return { label: "Yếu", color: "#ef4444" };
    if (score <= 50) return { label: "Trung bình", color: "#f59e0b" };
    if (score <= 75) return { label: "Mạnh", color: "#3b82f6" };
    return { label: "Rất an toàn", color: "#10b981" };
  };

  // STEP 3: Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast("Mật khẩu mới phải có ít nhất 8 ký tự!", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp!", "error");
      return;
    }

    if (passwordScore < 75) {
      showToast("Mật khẩu cần có ít nhất chữ hoa, chữ thường, số và ký tự đặc biệt!", "error");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setStep(4);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể đặt lại mật khẩu. Vui lòng thử lại!";
      showToast(msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#090d16",
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.18) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(124, 58, 237, 0.18) 0px, transparent 50%),
          radial-gradient(at 50% 50%, rgba(14, 165, 233, 0.08) 0px, transparent 50%)
        `,
        px: 2,
        py: 6,
        position: "relative",
        "@keyframes fadeIn": {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: "28px",
          bgcolor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          p: { xs: 3.5, sm: 4.5 },
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent */}
        <Box
          sx={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            filter: "blur(50px)",
            opacity: 0.35,
          }}
        />

        {/* Brand Header */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "18px",
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              color: "#ffffff",
              boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.45)",
              mb: 2,
            }}
          >
            <KeyRound size={28} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            Khôi phục mật khẩu
          </Typography>
          <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
            {step === 1 && "Nhập email tài khoản của bạn để nhận mã xác thực"}
            {step === 2 && "Nhập mã OTP 6 chữ số đã được gửi tới email"}
            {step === 3 && "Thiết lập mật khẩu bảo mật mới cho tài khoản"}
            {step === 4 && "Hoàn tất! Mật khẩu của bạn đã được thay đổi"}
          </Typography>
        </Box>

        {/* Stepper Dots (1 -> 2 -> 3) */}
        {step < 4 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 3.5 }}>
            {[1, 2, 3].map((s) => (
              <Box
                key={s}
                sx={{
                  width: step === s ? 32 : 10,
                  height: 10,
                  borderRadius: "5px",
                  bgcolor: step === s ? "#3b82f6" : step > s ? "#10b981" : "rgba(255, 255, 255, 0.15)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </Box>
        )}

        {/* ================= STEP 1: NHẬP EMAIL ================= */}
        {step === 1 && (
          <Box sx={{ animation: "fadeIn 0.3s ease" }}>
            <form onSubmit={handleRequestOtp}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Địa chỉ email đăng ký"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
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
                      bgcolor: "rgba(30, 41, 59, 0.6)",
                      color: "#ffffff",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                      "&:hover fieldset": { borderColor: "#3b82f6" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                    },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
                  }}
                />

                <Box
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: "rgba(37, 99, 235, 0.08)",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                    display: "flex",
                    gap: 1.5,
                    alignItems: "flex-start",
                  }}
                >
                  <Sparkles size={18} color="#3b82f6" style={{ marginTop: 2, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: "#93c5fd", lineHeight: 1.5 }}>
                    Mã xác thực gồm 6 chữ số sẽ được gửi tới email của bạn. Mã có hiệu lực trong 5 phút.
                  </Typography>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  endIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <ArrowRight size={18} />}
                  sx={{
                    py: 1.4,
                    borderRadius: "14px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 8px 20px -4px rgba(37, 99, 235, 0.5)",
                  }}
                >
                  {isLoading ? "Đang gửi mã..." : "Gửi mã OTP qua Email"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 1 }}>
                  <Link
                    href="/login"
                    style={{
                      color: "#94a3b8",
                      textDecoration: "none",
                      fontSize: "0.875rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: 600,
                    }}
                  >
                    <ArrowLeft size={16} /> Quay lại trang Đăng nhập
                  </Link>
                </Box>
              </Box>
            </form>
          </Box>
        )}

        {/* ================= STEP 2: NHẬP MÃ OTP ================= */}
        {step === 2 && (
          <Box sx={{ animation: "fadeIn 0.3s ease" }}>
            <form onSubmit={handleVerifyOtp}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* Email Target Box */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "12px",
                    bgcolor: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#cbd5e1", fontWeight: 600 }}>
                    {email}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setStep(1)}
                    sx={{ textTransform: "none", fontSize: "0.75rem", color: "#3b82f6", p: 0.5 }}
                  >
                    Đổi email
                  </Button>
                </Box>

                {/* 6 OTP Inputs */}
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  {otpDigits.map((digit, idx) => (
                    <TextField
                      key={idx}
                      inputRef={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      slotProps={{
                        htmlInput: {
                          maxLength: 1,
                          style: {
                            textAlign: "center",
                            fontSize: "1.5rem",
                            fontWeight: 800,
                            color: "#ffffff",
                            padding: "12px 0",
                          },
                        },
                      }}
                      sx={{
                        width: { xs: 46, sm: 54 },
                        "& .MuiOutlinedInput-root": {
                          bgcolor: "rgba(30, 41, 59, 0.8)",
                          borderRadius: "14px",
                          "& fieldset": {
                            borderColor: digit ? "#3b82f6" : "rgba(255, 255, 255, 0.15)",
                          },
                          "&:hover fieldset": { borderColor: "#3b82f6" },
                          "&.Mui-focused fieldset": { borderColor: "#3b82f6", borderWidth: "2px" },
                        },
                      }}
                    />
                  ))}
                </Box>

                {/* Resend Cooldown Countdown */}
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                  {isCounting ? (
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      Chưa nhận được mã? Gửi lại sau{" "}
                      <strong style={{ color: "#3b82f6" }}>{countdown}s</strong>
                    </Typography>
                  ) : (
                    <Button
                      size="small"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      startIcon={<RotateCcw size={14} />}
                      sx={{
                        color: "#3b82f6",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                      }}
                    >
                      Gửi lại mã OTP
                    </Button>
                  )}
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading || otpDigits.join("").length < 6}
                  endIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <ArrowRight size={18} />}
                  sx={{
                    py: 1.4,
                    borderRadius: "14px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    boxShadow: "0 8px 20px -4px rgba(37, 99, 235, 0.5)",
                  }}
                >
                  {isLoading ? "Đang xác thực..." : "Xác nhận mã OTP"}
                </Button>

                <Box sx={{ textAlign: "center" }}>
                  <Button
                    onClick={() => setStep(1)}
                    startIcon={<ArrowLeft size={16} />}
                    sx={{ color: "#94a3b8", textTransform: "none", fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    Quay lại bước trước
                  </Button>
                </Box>
              </Box>
            </form>
          </Box>
        )}

        {/* ================= STEP 3: MẬT KHẨU MỚI ================= */}
        {step === 3 && (
          <Box sx={{ animation: "fadeIn 0.3s ease" }}>
            <form onSubmit={handleResetPassword}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* New Password */}
                <Box>
                  <TextField
                    fullWidth
                    label="Mật khẩu mới"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
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
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              edge="end"
                              size="small"
                              sx={{ color: "#94a3b8" }}
                            >
                              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        bgcolor: "rgba(30, 41, 59, 0.6)",
                        color: "#ffffff",
                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                        "&:hover fieldset": { borderColor: "#3b82f6" },
                        "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                      },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                      "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
                    }}
                  />

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <Box sx={{ mt: 1.5, px: 0.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          Độ mạnh:
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 700, color: getStrengthLabel(passwordScore).color }}
                        >
                          {getStrengthLabel(passwordScore).label}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={passwordScore}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "rgba(255, 255, 255, 0.1)",
                          "& .MuiLinearProgress-bar": {
                            bgcolor: getStrengthLabel(passwordScore).color,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>

                {/* Confirm Password */}
                <TextField
                  fullWidth
                  label="Xác nhận mật khẩu mới"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  error={Boolean(confirmPassword && confirmPassword !== newPassword)}
                  helperText={
                    confirmPassword && confirmPassword !== newPassword ? "Mật khẩu xác nhận không khớp!" : ""
                  }
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
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: "#94a3b8" }}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "rgba(30, 41, 59, 0.6)",
                      color: "#ffffff",
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
                      "&:hover fieldset": { borderColor: "#3b82f6" },
                      "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
                    },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#3b82f6" },
                  }}
                />

                {/* Checklist */}
                <Box sx={{ p: 1.5, borderRadius: "12px", bgcolor: "rgba(30, 41, 59, 0.5)", fontSize: "0.75rem" }}>
                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.5, fontWeight: 700 }}>
                    Yêu cầu mật khẩu:
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
                    <Box sx={{ color: newPassword.length >= 8 ? "#10b981" : "#64748b" }}>
                      ● Tối thiểu 8 ký tự
                    </Box>
                    <Box sx={{ color: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "#10b981" : "#64748b" }}>
                      ● Chữ hoa và chữ thường
                    </Box>
                    <Box sx={{ color: /\d/.test(newPassword) ? "#10b981" : "#64748b" }}>
                      ● Ít nhất một chữ số
                    </Box>
                    <Box sx={{ color: /[^a-zA-Z0-9]/.test(newPassword) ? "#10b981" : "#64748b" }}>
                      ● Ký tự đặc biệt (@, #, $...)
                    </Box>
                  </Box>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading || passwordScore < 75 || newPassword !== confirmPassword}
                  endIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <CheckCircle2 size={18} />}
                  sx={{
                    py: 1.4,
                    borderRadius: "14px",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 8px 20px -4px rgba(16, 185, 129, 0.5)",
                  }}
                >
                  {isLoading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </Button>
              </Box>
            </form>
          </Box>
        )}

        {/* ================= STEP 4: THÀNH CÔNG ================= */}
        {step === 4 && (
          <Box sx={{ animation: "fadeIn 0.35s ease" }}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  bgcolor: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2.5,
                }}
              >
                <CheckCircle2 size={44} />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, color: "#ffffff", mb: 1 }}>
                Đổi mật khẩu thành công!
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 3.5, lineHeight: 1.6 }}>
                Mật khẩu tài khoản của bạn đã được cập nhật an toàn. Mọi phiên đăng nhập cũ đã được thu hồi.
              </Typography>

              <Button
                fullWidth
                variant="contained"
                onClick={() => router.push("/login")}
                sx={{
                  py: 1.4,
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                }}
              >
                Đăng nhập ngay ({redirectCount}s)
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Global Snackbar Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.type}
          variant="filled"
          sx={{
            borderRadius: "14px",
            fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
