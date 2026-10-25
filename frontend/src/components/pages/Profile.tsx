"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Switch,
  FormControlLabel,
  Tooltip,
  Paper,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Key,
  Lock,
  Camera,
  Check,
  Copy,
  Edit3,
  Share2,
  LogOut,
  Calendar,
  Sparkles,
  BadgeCheck,
  Activity,
  Bell,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Laptop,
  Globe,
  Sliders,
  MessageSquare,
  Users,
  CheckCircle2,
  Palette,
  ExternalLink,
  ShieldCheck,
  Newspaper,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuthStore } from "../../store/useAuthStore";
import AuthGuard from "../common/AuthGuard";
import MyPostsTab from "../posts/MyPostsTab";

// Thứ tự các tab (khớp với thứ tự <Tab> bên dưới)
const TAB_POSTS = 0;
const TAB_OVERVIEW = 1;
const TAB_EDIT = 2;
const TAB_SECURITY = 3;
const TAB_SETTINGS = 4;

const PRESET_AVATARS = [
  { id: "1", label: "Felix", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" },
  { id: "2", label: "Luna", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna" },
  { id: "3", label: "Max", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Max" },
  { id: "4", label: "Sophia", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia" },
  { id: "5", label: "Cyber Echo", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberEcho" },
  { id: "6", label: "Aiden Bot", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Aiden" },
  { id: "7", label: "Oliver", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver" },
  { id: "8", label: "Kitsune", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Kitsune" },
];

const COVER_THEMES = [
  {
    id: "sunset",
    name: "Hoàng Hôn Tím",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-4f46e5) 0%, var(--mui-palette-tone-7c3aed) 45%, var(--mui-palette-tone-db2777) 80%, var(--mui-palette-tone-f97316) 100%)",
    accent: "var(--mui-palette-tone-7c3aed)",
  },
  {
    id: "aurora",
    name: "Cực Quang Xanh",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-0284c7) 0%, var(--mui-palette-tone-06b6d4) 45%, var(--mui-palette-tone-10b981) 85%, var(--mui-palette-tone-34d399) 100%)",
    accent: "var(--mui-palette-tone-06b6d4)",
  },
  {
    id: "midnight",
    name: "Dạ Khúc Huyền Bí",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-0f172a) 0%, var(--mui-palette-tone-1e1b4b) 50%, var(--mui-palette-tone-312e81) 100%)",
    accent: "var(--mui-palette-tone-6366f1)",
  },
  {
    id: "emerald",
    name: "Ngọc Lục Bảo",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-065f46) 0%, var(--mui-palette-tone-fx-059669) 50%, var(--mui-palette-tone-10b981) 100%)",
    accent: "var(--mui-palette-tone-10b981)",
  },
  {
    id: "crimson",
    name: "Hồng Ruby",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-881337) 0%, var(--mui-palette-tone-fx-be123c) 50%, var(--mui-palette-tone-f43f5e) 100%)",
    accent: "var(--mui-palette-tone-f43f5e)",
  },
];

function ProfileContent() {
  const router = useRouter();
  const avatarInputId = useId();
  const { user, updateProfile, changePassword, logout } = useAuthStore();

  // Active Tab
  const [activeTab, setActiveTab] = useState(TAB_POSTS);

  // Edit Profile Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Avatar Modal State
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatarPreview, setSelectedAvatarPreview] = useState("");
  const [avatarTab, setAvatarTab] = useState(0); // 0: presets, 1: upload/url

  // Cover Theme Menu State
  const [coverMenuAnchor, setCoverMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  // Logout Dialog State
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Preferences State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [previewMsg, setPreviewMsg] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowPhoneSearch, setAllowPhoneSearch] = useState(true);

  // Toast / Feedback State
  const [toast, setToast] = useState<{
    open: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({
    open: false,
    type: "success",
    message: "",
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ open: true, message, type });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      if (user.dateOfBirth) {
        const rawDob = String(user.dateOfBirth);
        setDateOfBirth(rawDob.includes("T") ? rawDob.split("T")[0] : rawDob);
      } else {
        setDateOfBirth("");
      }
      setBio((user.bio as string) || "");
      setAvatarUrl(user.avatar || "");
      setSelectedAvatarPreview(user.avatar || "");
    }
  }, [user]);

  // Load saved cover theme from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("chatapp_cover_theme");
      if (savedTheme) {
        const idx = COVER_THEMES.findIndex((t) => t.id === savedTheme);
        if (idx !== -1) setCurrentCoverIndex(idx);
      }
    }
  }, []);

  const handleSelectCoverTheme = (index: number) => {
    setCurrentCoverIndex(index);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatapp_cover_theme", COVER_THEMES[index].id);
    }
    setCoverMenuAnchor(null);
    showToast(`Đã đổi chủ đề ảnh bìa sang: ${COVER_THEMES[index].name}`);
  };

  // Copy helpers
  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    }
  };

  const handleShareProfile = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://chatapp.io/profile";
    handleCopyText(url, "liên kết hồ sơ cá nhân");
  };

  // Handle Save Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Tên hiển thị không được để trống!", "error");
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
        bio: bio.trim(),
        avatar: avatarUrl.trim(),
      });
      showToast("Cập nhật thông tin hồ sơ thành công!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Có lỗi xảy ra khi cập nhật hồ sơ!";
      showToast(msg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Save Avatar from Dialog
  const handleConfirmAvatar = async () => {
    if (!selectedAvatarPreview) {
      showToast("Vui lòng chọn hoặc nhập ảnh đại diện!", "error");
      return;
    }
    setAvatarUrl(selectedAvatarPreview);
    setIsUpdating(true);
    try {
      await updateProfile({
        avatar: selectedAvatarPreview,
      });
      setIsAvatarDialogOpen(false);
      showToast("Ảnh đại diện đã được cập nhật thành công!");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể cập nhật ảnh đại diện!";
      showToast(msg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle File Upload for Avatar
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)!", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Kích thước file ảnh không được vượt quá 2MB!", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Password strength logic
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 25;
    if (/\d/.test(pwd)) score += 25;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const passwordStrength = calculatePasswordStrength(newPassword);

  const getPasswordStrengthLabel = (score: number) => {
    if (score === 0) return { label: "Chưa nhập", color: "var(--mui-palette-neutral-400)" };
    if (score <= 25) return { label: "Yếu", color: "var(--mui-palette-tone-ef4444)" };
    if (score <= 50) return { label: "Trung bình", color: "var(--mui-palette-tone-f59e0b)" };
    if (score <= 75) return { label: "Mạnh", color: "var(--mui-palette-brand-500)" };
    return { label: "Rất an toàn", color: "var(--mui-palette-tone-10b981)" };
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("Vui lòng nhập mật khẩu hiện tại!", "error");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      showToast("Mật khẩu mới phải có tối thiểu 8 ký tự!", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu xác nhận không khớp với mật khẩu mới!", "error");
      return;
    }

    if (passwordStrength < 75) {
      showToast("Mật khẩu mới cần có ít nhất chữ hoa, chữ thường, số và ký tự đặc biệt!", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      showToast("Đổi mật khẩu tài khoản thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại!";
      showToast(msg, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Logout
  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      showToast("Đã xảy ra lỗi khi đăng xuất!", "error");
    } finally {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  // Formatted date
  const joinDate = user?.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : "Tháng 10, 2026";

  const isGoogleLinked = Boolean(user?.firebaseUid);
  const activeCover = COVER_THEMES[currentCoverIndex] || COVER_THEMES[0];

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "var(--mui-palette-neutral-50)",
        pt: { xs: 9, sm: 10, md: 11 },
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* ================= HERO PROFILE CARD ================= */}
        <Card
          elevation={0}
          sx={{
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.07)",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            bgcolor: "var(--mui-palette-background-paper)",
            mb: 4,
          }}
        >
          {/* Cover Banner */}
          <Box
            sx={{
              height: { xs: 180, sm: 230, md: 260 },
              background: activeCover.gradient,
              position: "relative",
              overflow: "hidden",
              transition: "background 0.5s ease",
            }}
          >
            {/* Background Pattern Overlay */}
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                opacity: 0.12,
                backgroundImage:
                  "radial-gradient(var(--mui-palette-background-paper) 2px, transparent 2px), radial-gradient(var(--mui-palette-background-paper) 2px, transparent 2px)",
                backgroundSize: "32px 32px",
                backgroundPosition: "0 0, 16px 16px",
              }}
            />

            {/* Sparkles / Ambient glow */}
            <Box
              sx={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 250,
                height: 250,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.18)",
                filter: "blur(40px)",
              }}
            />

            {/* Cover Action: Switch Cover Theme */}
            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                display: "flex",
                gap: 1.5,
              }}
            >
              <Button
                variant="contained"
                size="small"
                onClick={(e) => setCoverMenuAnchor(e.currentTarget)}
                startIcon={<Palette size={16} />}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.22)",
                  backdropFilter: "blur(12px)",
                  color: "var(--mui-palette-common-white)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  "&:hover": {
                    bgcolor: "rgba(255, 255, 255, 0.35)",
                  },
                }}
              >
                Đổi ảnh bìa
              </Button>

              <Menu
                anchorEl={coverMenuAnchor}
                open={Boolean(coverMenuAnchor)}
                onClose={() => setCoverMenuAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "16px",
                      p: 1,
                      minWidth: 200,
                      boxShadow: "0 15px 30px rgba(0,0,0,0.12)",
                    },
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ px: 2, py: 1, fontWeight: 700, color: "var(--mui-palette-neutral-500)", display: "block" }}
                >
                  CHỦ ĐỀ ẢNH BÌA
                </Typography>
                {COVER_THEMES.map((theme, idx) => (
                  <MenuItem
                    key={theme.id}
                    onClick={() => handleSelectCoverTheme(idx)}
                    selected={idx === currentCoverIndex}
                    sx={{
                      borderRadius: "10px",
                      my: 0.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontWeight: idx === currentCoverIndex ? 700 : 500,
                    }}
                  >
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: theme.gradient,
                        border: "2px solid var(--mui-palette-background-paper)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      }}
                    />
                    {theme.name}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Box>

          {/* User Details & Identity Body */}
          <Box
            sx={{
              px: { xs: 2.5, sm: 4, md: 5 },
              pb: 4,
              pt: 0,
              position: "relative",
            }}
          >
            {/* Avatar & Action Row */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "center", sm: "flex-end" },
                justifyContent: "space-between",
                mt: { xs: -7, sm: -8, md: -9 },
                mb: 3,
                gap: 2,
              }}
            >
              {/* Avatar with Status Pulse */}
              <Box sx={{ position: "relative" }}>
                <Box
                  sx={{
                    position: "relative",
                    width: { xs: 110, sm: 130, md: 140 },
                    height: { xs: 110, sm: 130, md: 140 },
                    borderRadius: "50%",
                    p: "5px",
                    bgcolor: "var(--mui-palette-background-paper)",
                    boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
                    cursor: "pointer",
                    "&:hover .avatar-overlay": {
                      opacity: 1,
                    },
                  }}
                  onClick={() => setIsAvatarDialogOpen(true)}
                >
                  <Avatar
                    src={user?.avatar || ""}
                    alt={user?.name || "User"}
                    sx={{
                      width: "100%",
                      height: "100%",
                      bgcolor: activeCover.accent,
                      fontSize: "2.5rem",
                      fontWeight: 700,
                    }}
                  >
                    {(user?.name || "U").charAt(0).toUpperCase()}
                  </Avatar>

                  {/* Camera overlay on hover */}
                  <Box
                    className="avatar-overlay"
                    sx={{
                      position: "absolute",
                      inset: 5,
                      borderRadius: "50%",
                      bgcolor: "rgba(0, 0, 0, 0.45)",
                      backdropFilter: "blur(2px)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--mui-palette-common-white)",
                      opacity: 0,
                      transition: "opacity 0.25s ease",
                    }}
                  >
                    <Camera size={26} />
                    <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 600 }}>
                      Thay đổi
                    </Typography>
                  </Box>
                </Box>

                {/* Online Indicator Badge */}
                <Tooltip title="Đang trực tuyến" arrow>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 12,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      bgcolor: "var(--mui-palette-tone-10b981)",
                      border: "3.5px solid var(--mui-palette-background-paper)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        inset: -3.5,
                        borderRadius: "50%",
                        border: "2px solid var(--mui-palette-tone-10b981)",
                        animation: "pulse 2s infinite ease-in-out",
                      },
                      "@keyframes pulse": {
                        "0%": { transform: "scale(0.95)", opacity: 0.8 },
                        "70%": { transform: "scale(1.7)", opacity: 0 },
                        "100%": { transform: "scale(0.95)", opacity: 0 },
                      },
                    }}
                  />
                </Tooltip>
              </Box>

              {/* Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                  justifyContent: { xs: "center", sm: "flex-end" },
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <Button
                  variant="outlined"
                  onClick={handleShareProfile}
                  startIcon={<Share2 size={16} />}
                  sx={{
                    borderRadius: "12px",
                    borderColor: "var(--mui-palette-neutral-200)",
                    color: "var(--mui-palette-neutral-600)",
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    "&:hover": {
                      borderColor: "var(--mui-palette-neutral-300)",
                      bgcolor: "var(--mui-palette-neutral-100)",
                    },
                  }}
                >
                  Chia sẻ
                </Button>

                <Button
                  variant="contained"
                  onClick={() => setActiveTab(TAB_EDIT)}
                  startIcon={<Edit3 size={16} />}
                  sx={{
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, var(--mui-palette-brand-600) 0%, var(--mui-palette-brand-700) 100%)",
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.35)",
                    "&:hover": {
                      background: "linear-gradient(135deg, var(--mui-palette-brand-700) 0%, var(--mui-palette-tone-1e40af) 100%)",
                    },
                  }}
                >
                  Chỉnh sửa hồ sơ
                </Button>

                <Button
                  variant="text"
                  color="error"
                  onClick={() => setIsLogoutDialogOpen(true)}
                  startIcon={<LogOut size={16} />}
                  sx={{
                    borderRadius: "12px",
                    fontWeight: 600,
                    px: 1.5,
                    py: 1,
                    "&:hover": {
                      bgcolor: "rgba(239, 68, 68, 0.08)",
                    },
                  }}
                >
                  Đăng xuất
                </Button>
              </Box>
            </Box>

            {/* Name, Badges & Intro */}
            <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  gap: 1.5,
                  flexWrap: "wrap",
                  mb: 0.5,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    color: "var(--mui-palette-neutral-900)",
                    letterSpacing: "-0.02em",
                    fontSize: { xs: "1.65rem", sm: "2rem" },
                  }}
                >
                  {user?.name || "Người dùng ChatApp"}
                </Typography>

                <Tooltip title="Tài khoản đã xác thực" arrow>
                  <Box sx={{ display: "inline-flex", color: "var(--mui-palette-brand-600)" }}>
                    <CheckCircle2 size={24} fill="var(--mui-palette-brand-600)" color="var(--mui-palette-common-white)" />
                  </Box>
                </Tooltip>

                {user?.role === "admin" ? (
                  <Chip
                    icon={<Sparkles size={14} color="var(--mui-palette-common-white)" />}
                    label="Quản trị viên"
                    size="small"
                    sx={{
                      background: "linear-gradient(135deg, var(--mui-palette-tone-f59e0b) 0%, var(--mui-palette-tone-fx-d97706) 100%)",
                      color: "var(--mui-palette-common-white)",
                      fontWeight: 700,
                      borderRadius: "8px",
                      px: 0.5,
                    }}
                  />
                ) : (
                  <Chip
                    icon={<BadgeCheck size={14} color="var(--mui-palette-common-white)" />}
                    label="Thành viên chính thức"
                    size="small"
                    sx={{
                      background: "linear-gradient(135deg, var(--mui-palette-brand-500) 0%, var(--mui-palette-brand-700) 100%)",
                      color: "var(--mui-palette-common-white)",
                      fontWeight: 700,
                      borderRadius: "8px",
                      px: 0.5,
                    }}
                  />
                )}
              </Box>

              {/* Tag / Email / Phone Chips */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", sm: "flex-start" },
                  gap: 2,
                  flexWrap: "wrap",
                  color: "var(--mui-palette-neutral-500)",
                  fontSize: "0.875rem",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Mail size={15} />
                  <span>{user?.email || "chua_co_email@domain.com"}</span>
                </Box>

                {user?.phone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Phone size={15} />
                    <span>{user.phone as string}</span>
                  </Box>
                )}

                {user?.dateOfBirth && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Calendar size={15} />
                    <span>
                      Sinh nhật:{" "}
                      {new Date(user.dateOfBirth as string).toLocaleDateString("vi-VN")}
                    </span>
                  </Box>
                )}

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Calendar size={15} />
                  <span>Tham gia: {joinDate}</span>
                </Box>
              </Box>

              {/* Bio snippet */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  bgcolor: "var(--mui-palette-neutral-50)",
                  border: "1px dashed var(--mui-palette-neutral-300)",
                  maxWidth: { xs: "100%", md: 780 },
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: user?.bio ? "var(--mui-palette-neutral-700)" : "var(--mui-palette-neutral-400)",
                    fontStyle: user?.bio ? "normal" : "italic",
                    lineHeight: 1.6,
                  }}
                >
                  {user?.bio
                    ? (user.bio as string)
                    : "Chưa có tiểu sử giới thiệu. Nhấn vào 'Chỉnh sửa hồ sơ' để chia sẻ thêm về bạn với mọi người!"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {/* ================= 4 STATS METRICS ================= */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                bgcolor: "var(--mui-palette-background-paper)",
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 25px -10px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, var(--mui-palette-brand-500) 0%, var(--mui-palette-brand-700) 100%)",
                  color: "var(--mui-palette-common-white)",
                }}
              >
                <MessageSquare size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}>
                  Tin nhắn realtime
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--mui-palette-neutral-900)" }}>
                  1,420+
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                bgcolor: "var(--mui-palette-background-paper)",
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 25px -10px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, var(--mui-palette-tone-10b981) 0%, var(--mui-palette-tone-fx-059669) 100%)",
                  color: "var(--mui-palette-common-white)",
                }}
              >
                <Users size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}>
                  Bạn bè kết nối
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--mui-palette-neutral-900)" }}>
                  48 bạn bè
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                bgcolor: "var(--mui-palette-background-paper)",
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 25px -10px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, var(--mui-palette-tone-8b5cf6) 0%, var(--mui-palette-tone-fx-6d28d9) 100%)",
                  color: "var(--mui-palette-common-white)",
                }}
              >
                <ShieldCheck size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}>
                  Độ bảo mật
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--mui-palette-neutral-900)" }}>
                  98% Rất cao
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "18px",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                bgcolor: "var(--mui-palette-background-paper)",
                boxShadow: "0 8px 20px -8px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 25px -10px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, var(--mui-palette-tone-f59e0b) 0%, var(--mui-palette-tone-fx-d97706) 100%)",
                  color: "var(--mui-palette-common-white)",
                }}
              >
                <Zap size={24} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}>
                  Trạng thái
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "var(--mui-palette-tone-10b981)" }}>
                  Trực tuyến
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ================= MAIN TABS SECTION ================= */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: "24px",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            bgcolor: "var(--mui-palette-background-paper)",
            overflow: "hidden",
            boxShadow: "0 15px 35px -15px rgba(0,0,0,0.05)",
          }}
        >
          {/* Tabs Header */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 1.5, bgcolor: "var(--mui-palette-neutral-50)" }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  minHeight: 52,
                  px: 2.5,
                  color: "var(--mui-palette-neutral-500)",
                  "&.Mui-selected": {
                    color: "var(--mui-palette-brand-600)",
                    fontWeight: 700,
                  },
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  backgroundColor: "var(--mui-palette-brand-600)",
                },
              }}
            >
              <Tab icon={<Newspaper size={18} />} iconPosition="start" label="Bài viết" />
              <Tab icon={<UserIcon size={18} />} iconPosition="start" label="Tổng quan" />
              <Tab icon={<Edit3 size={18} />} iconPosition="start" label="Chỉnh sửa thông tin" />
              <Tab icon={<Shield size={18} />} iconPosition="start" label="Bảo mật & Mật khẩu" />
              <Tab icon={<Sliders size={18} />} iconPosition="start" label="Cài đặt & Tùy chọn" />
            </Tabs>
          </Box>

          {/* TAB 0: BÀI VIẾT (DÒNG THỜI GIAN) */}
          {activeTab === TAB_POSTS && (
            <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: "background.default" }}>
              <MyPostsTab />
            </Box>
          )}

          {/* TAB 1: TỔNG QUAN HỒ SƠ */}
          {activeTab === TAB_OVERVIEW && (
            <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Grid container spacing={3}>
                {/* Left: Chi tiết tài khoản */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2.5 }}>
                    Thông tin định danh
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    {/* Item: Full Name */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <UserIcon size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Họ và tên
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.name || "Chưa cập nhật"}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip label="Hiển thị công khai" size="small" sx={{ bgcolor: "var(--mui-palette-neutral-200)", fontSize: "0.75rem" }} />
                    </Box>

                    {/* Item: Email */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <Mail size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Địa chỉ Email
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.email || "Chưa có"}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={<Check size={14} />}
                        label="Đã xác thực"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                      />
                    </Box>

                    {/* Item: Phone */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <Phone size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Số điện thoại
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.phone ? (user.phone as string) : "Chưa thiết lập"}
                          </Typography>
                        </Box>
                      </Box>
                      {!user?.phone && (
                        <Button
                          size="small"
                          onClick={() => setActiveTab(TAB_EDIT)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Thêm số
                        </Button>
                      )}
                    </Box>

                    {/* Item: Date of Birth */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <Calendar size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Ngày sinh
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.dateOfBirth
                              ? new Date(user.dateOfBirth as string).toLocaleDateString("vi-VN")
                              : "Chưa thiết lập"}
                          </Typography>
                        </Box>
                      </Box>
                      {!user?.dateOfBirth && (
                        <Button
                          size="small"
                          onClick={() => setActiveTab(TAB_EDIT)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Cập nhật
                        </Button>
                      )}
                    </Box>

                    {/* Item: User ID */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <Key size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Mã định danh (User ID)
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: "monospace",
                              fontWeight: 600,
                              color: "var(--mui-palette-neutral-600)",
                            }}
                          >
                            {(user?._id || user?.id || "N/A") as string}
                          </Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Sao chép ID" arrow>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleCopyText(String(user?._id || user?.id || ""), "Mã định danh")
                          }
                          sx={{ color: "var(--mui-palette-neutral-500)" }}
                        >
                          <Copy size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Item: Account Type */}
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "14px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-neutral-500)" }}>
                          <Globe size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            Phương thức đăng nhập
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {isGoogleLinked ? "Google Account (Firebase OAuth)" : "Mật khẩu hệ thống ChatApp"}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={isGoogleLinked ? "Google" : "Standard"}
                        size="small"
                        color={isGoogleLinked ? "primary" : "default"}
                        sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                      />
                    </Box>
                  </Box>
                </Grid>

                {/* Right: Huy hiệu & Hoạt động gần đây */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2.5 }}>
                    Huy hiệu danh dự
                  </Typography>

                  <Grid container spacing={1.5} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "16px",
                          border: "1px solid var(--mui-palette-neutral-200)",
                          bgcolor: "var(--mui-palette-background-paper)",
                          textAlign: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.75rem", mb: 0.5 }}>🚀</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                          Tiên Phong
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          Thành viên mùa 1
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "16px",
                          border: "1px solid var(--mui-palette-neutral-200)",
                          bgcolor: "var(--mui-palette-background-paper)",
                          textAlign: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.75rem", mb: 0.5 }}>🛡️</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                          Bảo Mật Cao
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          Email & Token hợp lệ
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "16px",
                          border: "1px solid var(--mui-palette-neutral-200)",
                          bgcolor: "var(--mui-palette-background-paper)",
                          textAlign: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.75rem", mb: 0.5 }}>💬</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                          Sôi Nổi
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          Hoạt động tích cực
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "16px",
                          border: "1px solid var(--mui-palette-neutral-200)",
                          bgcolor: "var(--mui-palette-background-paper)",
                          textAlign: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                        }}
                      >
                        <Typography sx={{ fontSize: "1.75rem", mb: 0.5 }}>⭐</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                          VIP ChatApp
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          Được chứng thực
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Hoạt động gần đây */}
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2 }}>
                    Hoạt động gần đây
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "var(--mui-palette-tone-10b981)",
                          mt: 0.75,
                        }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)" }}>
                          Đăng nhập phiên làm việc hiện tại
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          Vừa xong • Trình duyệt web
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "var(--mui-palette-brand-500)",
                          mt: 0.75,
                        }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)" }}>
                          Đồng bộ trạng thái hồ sơ cá nhân
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          Hôm nay
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: "var(--mui-palette-tone-8b5cf6)",
                          mt: 0.75,
                        }}
                      />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)" }}>
                          Kết nối máy chủ Realtime Chat
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          Sẵn sàng trò chuyện
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* TAB 2: CHỈNH SỬA THÔNG TIN */}
          {activeTab === TAB_EDIT && (
            <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
              <form onSubmit={handleSaveProfile}>
                <Grid container spacing={3}>
                  {/* Left Column: Avatar preview card */}
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box
                      sx={{
                        p: 3,
                        borderRadius: "18px",
                        bgcolor: "var(--mui-palette-neutral-50)",
                        border: "1px solid var(--mui-palette-neutral-200)",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Avatar
                        src={avatarUrl || ""}
                        sx={{
                          width: 110,
                          height: 110,
                          mb: 2,
                          bgcolor: activeCover.accent,
                          fontSize: "2.5rem",
                          fontWeight: 700,
                          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                        }}
                      >
                        {(name || "U").charAt(0).toUpperCase()}
                      </Avatar>

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                        {name || "Họ và tên"}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", mb: 2.5 }}>
                        {user?.email}
                      </Typography>

                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setIsAvatarDialogOpen(true)}
                        startIcon={<Camera size={16} />}
                        sx={{
                          borderRadius: "10px",
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        Đổi ảnh đại diện
                      </Button>
                    </Box>
                  </Grid>

                  {/* Right Column: Fields */}
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2.5 }}>
                      Cập nhật hồ sơ
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                      {/* Name input */}
                      <TextField
                        fullWidth
                        label="Họ và tên hiển thị"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập họ và tên..."
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <UserIcon size={18} color="var(--mui-palette-neutral-500)" />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      {/* Phone input */}
                      <TextField
                        fullWidth
                        label="Số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ví dụ: 0987654321"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Phone size={18} color="var(--mui-palette-neutral-500)" />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />

                      {/* Date of Birth input */}
                      <TextField
                        fullWidth
                        label="Ngày sinh"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        slotProps={{
                          inputLabel: { shrink: true },
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <Calendar size={18} color="var(--mui-palette-neutral-500)" />
                              </InputAdornment>
                            ),
                          },
                          htmlInput: {
                            max: new Date().toISOString().split("T")[0],
                          },
                        }}
                      />

                      {/* Bio input */}
                      <TextField
                        fullWidth
                        label="Tiểu sử / Giới thiệu bản thân"
                        multiline
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Viết một vài dòng chia sẻ về sở thích, công việc hoặc phương châm của bạn..."
                        helperText={`${bio.length}/300 ký tự`}
                        slotProps={{
                          htmlInput: {
                            maxLength: 300,
                          },
                        }}
                      />

                      {/* Buttons */}
                      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={isUpdating}
                          startIcon={
                            isUpdating ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />
                          }
                          sx={{
                            borderRadius: "12px",
                            px: 3,
                            py: 1.2,
                            fontWeight: 700,
                            background: "linear-gradient(135deg, var(--mui-palette-brand-600) 0%, var(--mui-palette-brand-700) 100%)",
                            boxShadow: "0 8px 16px -4px rgba(37, 99, 235, 0.4)",
                          }}
                        >
                          {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>

                        <Button
                          type="button"
                          variant="outlined"
                          disabled={isUpdating}
                          onClick={() => {
                            if (user) {
                              setName(user.name || "");
                              setPhone(user.phone || "");
                              setBio((user.bio as string) || "");
                              setAvatarUrl(user.avatar || "");
                            }
                          }}
                          startIcon={<RotateCcw size={18} />}
                          sx={{
                            borderRadius: "12px",
                            px: 2.5,
                            fontWeight: 600,
                            borderColor: "var(--mui-palette-neutral-300)",
                            color: "var(--mui-palette-neutral-500)",
                          }}
                        >
                          Khôi phục ban đầu
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Box>
          )}

          {/* TAB 3: BẢO MẬT & MẬT KHẨU */}
          {activeTab === TAB_SECURITY && (
            <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Grid container spacing={4}>
                {/* Đổi mật khẩu nếu là tài khoản thường */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 1 }}>
                    Bảo mật tài khoản & Đổi mật khẩu
                  </Typography>
                  <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", mb: 3 }}>
                    Để bảo vệ an toàn cho tài khoản, hãy sử dụng mật khẩu mạnh kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.
                  </Typography>

                  {isGoogleLinked ? (
                    /* Google account info alert */
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: "16px",
                        bgcolor: "var(--mui-palette-brand-50)",
                        border: "1px solid var(--mui-palette-brand-200)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ color: "var(--mui-palette-brand-600)" }}>
                          <ShieldCheck size={28} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--mui-palette-brand-900)" }}>
                            Tài khoản liên kết an toàn qua Google Firebase
                          </Typography>
                          <Typography variant="body2" sx={{ color: "var(--mui-palette-brand-500)" }}>
                            Tài khoản của bạn được chứng thực và bảo vệ trực tiếp bởi hệ thống Google Security.
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-600)" }}>
                        Bạn không cần đổi mật khẩu tại đây. Mật khẩu và bảo mật 2 lớp của bạn được quản lý an toàn trên tài khoản Google của bạn.
                      </Typography>
                    </Paper>
                  ) : (
                    /* Standard change password form */
                    <form onSubmit={handleChangePassword}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                        <TextField
                          fullWidth
                          label="Mật khẩu hiện tại"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Nhập mật khẩu hiện tại của bạn"
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Lock size={18} color="var(--mui-palette-neutral-500)" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    edge="end"
                                    size="small"
                                  >
                                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />

                        <Box>
                          <TextField
                            fullWidth
                            label="Mật khẩu mới"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Tối thiểu 8 ký tự, chữ hoa, số & ký tự đặc biệt"
                            slotProps={{
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Key size={18} color="var(--mui-palette-neutral-500)" />
                                  </InputAdornment>
                                ),
                                endAdornment: (
                                  <InputAdornment position="end">
                                    <IconButton
                                      onClick={() => setShowNewPassword(!showNewPassword)}
                                      edge="end"
                                      size="small"
                                    >
                                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                  </InputAdornment>
                                ),
                              },
                            }}
                          />

                          {/* Password Strength Meter */}
                          {newPassword && (
                            <Box sx={{ mt: 1.5, px: 0.5 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-500)" }}>
                                  Độ an toàn mật khẩu:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: getPasswordStrengthLabel(passwordStrength).color,
                                  }}
                                >
                                  {getPasswordStrengthLabel(passwordStrength).label}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={passwordStrength}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: "var(--mui-palette-neutral-200)",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor: getPasswordStrengthLabel(passwordStrength).color,
                                    borderRadius: 3,
                                  },
                                }}
                              />
                            </Box>
                          )}
                        </Box>

                        <TextField
                          fullWidth
                          label="Xác nhận mật khẩu mới"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          error={Boolean(confirmPassword && confirmPassword !== newPassword)}
                          helperText={
                            confirmPassword && confirmPassword !== newPassword
                              ? "Mật khẩu xác nhận không khớp!"
                              : ""
                          }
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Key size={18} color="var(--mui-palette-neutral-500)" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    edge="end"
                                    size="small"
                                  >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />

                        <Box sx={{ mt: 1 }}>
                          <Button
                            type="submit"
                            variant="contained"
                            disabled={isChangingPassword}
                            startIcon={
                              isChangingPassword ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <ShieldCheck size={18} />
                              )
                            }
                            sx={{
                              borderRadius: "12px",
                              px: 3,
                              py: 1.2,
                              fontWeight: 700,
                              background: "linear-gradient(135deg, var(--mui-palette-tone-10b981) 0%, var(--mui-palette-tone-fx-059669) 100%)",
                              boxShadow: "0 8px 16px -4px rgba(16, 185, 129, 0.4)",
                            }}
                          >
                            {isChangingPassword ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                          </Button>
                        </Box>
                      </Box>
                    </form>
                  )}
                </Grid>

                {/* Right Column: Security Sessions */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2 }}>
                    Phiên đăng nhập & Thiết bị
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: "18px",
                      bgcolor: "var(--mui-palette-neutral-50)",
                      border: "1px solid var(--mui-palette-neutral-200)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "12px",
                          bgcolor: "var(--mui-palette-tone-e0f2fe)",
                          color: "var(--mui-palette-tone-0284c7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Laptop size={22} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)" }}>
                          Windows PC • Trình duyệt hiện tại
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-tone-10b981)", fontWeight: 600 }}>
                          ● Đang hoạt động
                        </Typography>
                      </Box>
                    </Box>

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                        Địa chỉ IP kết nối:
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        127.0.0.1 (Localhost)
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                        Thời gian hết hạn phiên:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-600)" }}>
                        7 ngày (Tự động gia hạn)
                      </Typography>
                    </Box>

                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => setIsLogoutDialogOpen(true)}
                      startIcon={<LogOut size={16} />}
                      sx={{
                        borderRadius: "10px",
                        mt: 1,
                        textTransform: "none",
                        fontWeight: 600,
                      }}
                    >
                      Đăng xuất phiên làm việc
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* TAB 4: CÀI ĐẶT & TÙY CHỌN */}
          {activeTab === TAB_SETTINGS && (
            <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 3 }}>
                Cài đặt & Tùy chọn trải nghiệm
              </Typography>

              <Grid container spacing={3}>
                {/* Thông báo */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: "18px",
                      bgcolor: "var(--mui-palette-neutral-50)",
                      border: "1px solid var(--mui-palette-neutral-200)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Bell size={20} color="var(--mui-palette-brand-600)" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                        Thông báo & Âm thanh
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={soundEnabled}
                            onChange={(e) => setSoundEnabled(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Âm thanh tin nhắn đến
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              Phát âm thanh thông báo mỗi khi có tin nhắn mới
                            </Typography>
                          </Box>
                        }
                      />

                      <Divider />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={pushEnabled}
                            onChange={(e) => setPushEnabled(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Thông báo đẩy trên trình duyệt
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              Nhận thông báo kể cả khi bạn không mở tab chat
                            </Typography>
                          </Box>
                        }
                      />

                      <Divider />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={previewMsg}
                            onChange={(e) => setPreviewMsg(e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Xem trước nội dung tin nhắn
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              Hiển thị nội dung chi tiết trong popup thông báo
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Paper>
                </Grid>

                {/* Quyền riêng tư */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      borderRadius: "18px",
                      bgcolor: "var(--mui-palette-neutral-50)",
                      border: "1px solid var(--mui-palette-neutral-200)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                      <Shield size={20} color="var(--mui-palette-tone-10b981)" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                        Quyền riêng tư
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showOnlineStatus}
                            onChange={(e) => setShowOnlineStatus(e.target.checked)}
                            color="success"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Hiển thị trạng thái Đang hoạt động
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              Cho phép bạn bè biết khi bạn đang trực tuyến
                            </Typography>
                          </Box>
                        }
                      />

                      <Divider />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={allowPhoneSearch}
                            onChange={(e) => setAllowPhoneSearch(e.target.checked)}
                            color="success"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Cho phép tìm kiếm qua số điện thoại
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              Bạn bè có thể tìm thấy bạn bằng số điện thoại
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* ================= DIALOG: CHỌN / ĐỔI ẢNH ĐẠI DIỆN ================= */}
        <Dialog
          open={isAvatarDialogOpen}
          onClose={() => setIsAvatarDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: "20px",
                p: 1,
              },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "var(--mui-palette-neutral-900)" }}>
            Thay đổi ảnh đại diện
          </DialogTitle>
          <DialogContent>
            {/* Live Preview Circle */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", my: 2 }}>
              <Avatar
                src={selectedAvatarPreview || ""}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: activeCover.accent,
                  fontSize: "2.2rem",
                  fontWeight: 700,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                }}
              >
                {(name || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="caption" sx={{ mt: 1, color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}>
                Xem trước ảnh đại diện
              </Typography>
            </Box>

            {/* Avatar Selection Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs
                value={avatarTab}
                onChange={(_, val) => setAvatarTab(val)}
                centered
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  },
                }}
              >
                <Tab label="Bộ sưu tập Avatar" />
                <Tab label="Tải ảnh lên / Nhập URL" />
              </Tabs>
            </Box>

            {/* Presets Grid */}
            {avatarTab === 0 && (
              <Grid container spacing={2} sx={{ py: 1 }}>
                {PRESET_AVATARS.map((avt) => {
                  const isSelected = selectedAvatarPreview === avt.url;
                  return (
                    <Grid size={{ xs: 3 }} key={avt.id}>
                      <Box
                        onClick={() => setSelectedAvatarPreview(avt.url)}
                        sx={{
                          p: 1,
                          borderRadius: "16px",
                          border: isSelected ? "2.5px solid var(--mui-palette-brand-600)" : "1.5px solid var(--mui-palette-neutral-200)",
                          bgcolor: isSelected ? "var(--mui-palette-brand-50)" : "var(--mui-palette-background-paper)",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "scale(1.05)",
                            borderColor: "var(--mui-palette-brand-300)",
                          },
                        }}
                      >
                        <Avatar src={avt.url} sx={{ width: 56, height: 56, mb: 0.5 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? "var(--mui-palette-brand-700)" : "var(--mui-palette-neutral-600)",
                            fontSize: "0.7rem",
                            textAlign: "center",
                          }}
                        >
                          {avt.label}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            {/* Upload or Direct URL */}
            {avatarTab === 1 && (
              <Box sx={{ py: 1, display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "16px",
                    border: "2px dashed var(--mui-palette-neutral-300)",
                    bgcolor: "var(--mui-palette-neutral-50)",
                    textAlign: "center",
                    cursor: "pointer",
                    "&:hover": {
                      borderColor: "var(--mui-palette-brand-600)",
                      bgcolor: "var(--mui-palette-brand-50)",
                    },
                  }}
                  component="label"
                  htmlFor={avatarInputId}
                >
                  <input
                    id={avatarInputId}
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                  <Camera size={32} color="var(--mui-palette-neutral-500)" style={{ margin: "0 auto 8px" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)" }}>
                    Nhấn vào đây để tải ảnh từ máy tính
                  </Typography>
                  <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                    PNG, JPG, WEBP tối đa 2MB
                  </Typography>
                </Box>

                <Divider>
                  <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                    HOẶC
                  </Typography>
                </Divider>

                <TextField
                  fullWidth
                  size="small"
                  label="Dán đường dẫn ảnh trực tiếp (URL)"
                  value={selectedAvatarPreview}
                  onChange={(e) => setSelectedAvatarPreview(e.target.value)}
                  placeholder="https://example.com/my-photo.jpg"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={() => setIsAvatarDialogOpen(false)}
              sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}
            >
              Hủy
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmAvatar}
              disabled={isUpdating}
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                px: 2.5,
              }}
            >
              {isUpdating ? "Đang lưu..." : "Xác nhận & Lưu"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ================= DIALOG: CONFIRM LOGOUT ================= */}
        <Dialog
          open={isLogoutDialogOpen}
          onClose={() => !isLoggingOut && setIsLogoutDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "20px",
                p: 1.5,
                maxWidth: 420,
              },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "var(--mui-palette-neutral-900)" }}>
            Xác nhận đăng xuất
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản{" "}
              <strong>{user?.name || user?.email}</strong>? Bạn sẽ cần đăng nhập lại để tiếp tục trò chuyện.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              disabled={isLoggingOut}
              onClick={() => setIsLogoutDialogOpen(false)}
              sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}
            >
              Ở lại
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={isLoggingOut}
              onClick={handleLogoutConfirm}
              startIcon={
                isLoggingOut ? <CircularProgress size={16} color="inherit" /> : <LogOut size={16} />
              }
              sx={{
                borderRadius: "10px",
                fontWeight: 700,
                px: 2.5,
              }}
            >
              {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ================= GLOBAL SNACKBAR TOAST ================= */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseToast}
            severity={toast.type}
            variant="filled"
            sx={{
              width: "100%",
              borderRadius: "14px",
              fontWeight: 600,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default function Profile() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
