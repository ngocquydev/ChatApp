"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  ButtonBase,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
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
  Users,
  CheckCircle2,
  Palette,
  ExternalLink,
  ShieldCheck,
  Newspaper,
  GraduationCap,
  Heart,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "@/i18n/useTranslation";
import { useAuthStore } from "../../store/useAuthStore";
import { useFriendStore } from "@/store/useFriendStore";
import api from "../../services/api";
import { uploadAvatar, uploadCover } from "@/services/postsApi";
import { RELATIONSHIP_STATUS_OPTIONS, getRelationshipLabel } from "@/utils/relationshipStatus";
import AuthGuard from "../common/AuthGuard";
import MyPostsTab from "../posts/MyPostsTab";
import AvatarCropDialog from "../profile/AvatarCropDialog";

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
    nameEn: "Purple Sunset",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-4f46e5) 0%, var(--mui-palette-tone-7c3aed) 45%, var(--mui-palette-tone-db2777) 80%, var(--mui-palette-tone-f97316) 100%)",
    accent: "var(--mui-palette-tone-7c3aed)",
  },
  {
    id: "aurora",
    name: "Cực Quang Xanh",
    nameEn: "Cyan Aurora",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-0284c7) 0%, var(--mui-palette-tone-06b6d4) 45%, var(--mui-palette-tone-10b981) 85%, var(--mui-palette-tone-34d399) 100%)",
    accent: "var(--mui-palette-tone-06b6d4)",
  },
  {
    id: "midnight",
    name: "Dạ Khúc Huyền Bí",
    nameEn: "Mystic Midnight",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-0f172a) 0%, var(--mui-palette-tone-1e1b4b) 50%, var(--mui-palette-tone-312e81) 100%)",
    accent: "var(--mui-palette-tone-6366f1)",
  },
  {
    id: "emerald",
    name: "Ngọc Lục Bảo",
    nameEn: "Emerald Green",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-fx-065f46) 0%, var(--mui-palette-tone-fx-059669) 50%, var(--mui-palette-tone-10b981) 100%)",
    accent: "var(--mui-palette-tone-10b981)",
  },
  {
    id: "crimson",
    name: "Hồng Ruby",
    nameEn: "Ruby Crimson",
    gradient: "linear-gradient(135deg, var(--mui-palette-tone-881337) 0%, var(--mui-palette-tone-fx-be123c) 50%, var(--mui-palette-tone-f43f5e) 100%)",
    accent: "var(--mui-palette-tone-f43f5e)",
  },
];

function ProfileContent() {
  const router = useRouter();
  const { tr, language } = useTranslation();
  const avatarInputId = useId();
  const { user, updateProfile, changePassword, logout } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();

  useEffect(() => {
    void fetchFriends();
  }, [fetchFriends]);

  // Active Tab
  const [activeTab, setActiveTab] = useState(TAB_POSTS);

  // Edit Profile Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [school, setSchool] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
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
  const coverInputId = useId();
  const [coverMenuAnchor, setCoverMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentCoverIndex, setCurrentCoverIndex] = useState(0);

  // Avatar Crop Modal State
  const [cropModal, setCropModal] = useState<{ open: boolean; imageSrc: string | null }>({
    open: false,
    imageSrc: null,
  });
  const [isCroppingUpload, setIsCroppingUpload] = useState(false);

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
      setSchool((user.school as string) || "");
      setRelationshipStatus((user.relationshipStatus as string) || "");
      setAvatarUrl(user.avatar || "");
      setSelectedAvatarPreview(user.avatar || "");
    }
  }, [user]);

  // Nạp danh sách trường học từ API khi vào tab Chỉnh sửa
  useEffect(() => {
    let active = true;
    const loadInitialSchools = async () => {
      try {
        setIsLoadingSchools(true);
        const res = await api.get("/users/schools");
        if (active && Array.isArray(res.data)) {
          setSchoolOptions(res.data);
        }
      } catch {
        // Fallback
      } finally {
        if (active) setIsLoadingSchools(false);
      }
    };
    if (activeTab === TAB_EDIT) {
      void loadInitialSchools();
    }
    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleSearchSchools = async (query: string) => {
    try {
      setIsLoadingSchools(true);
      const res = await api.get(`/users/schools?q=${encodeURIComponent(query)}`);
      if (Array.isArray(res.data)) {
        setSchoolOptions(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingSchools(false);
    }
  };

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

  const handleSelectCoverTheme = async (index: number) => {
    setCurrentCoverIndex(index);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatapp_cover_theme", COVER_THEMES[index].id);
    }
    setCoverMenuAnchor(null);
    if (user?.cover) {
      try {
        await updateProfile({ cover: "" });
      } catch {
        // bỏ qua nếu lỗi
      }
    }
    showToast(
      tr(
        `Đã đổi chủ đề ảnh bìa sang: ${COVER_THEMES[index].name}`,
        `Cover theme changed to: ${COVER_THEMES[index].nameEn}`
      )
    );
  };

  // Copy helpers
  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(tr(`Đã sao chép ${label} vào bộ nhớ tạm!`, `Copied ${label} to clipboard!`));
    }
  };

  const handleShareProfile = () => {
    const url = typeof window !== "undefined" ? window.location.href : "https://chatapp.io/profile";
    handleCopyText(url, tr("liên kết hồ sơ cá nhân", "profile link"));
  };

  // Handle Save Profile
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast(tr("Tên hiển thị không được để trống!", "Display name cannot be empty!"), "error");
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
        bio: bio.trim(),
        school: school.trim(),
        relationshipStatus: relationshipStatus.trim(),
        avatar: avatarUrl.trim(),
      });
      showToast(tr("Cập nhật thông tin hồ sơ thành công!", "Profile updated successfully!"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        tr("Có lỗi xảy ra khi cập nhật hồ sơ!", "Failed to update profile!");
      showToast(msg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Save Avatar from Dialog
  const handleConfirmAvatar = async () => {
    if (!selectedAvatarPreview) {
      showToast(tr("Vui lòng chọn hoặc nhập ảnh đại diện!", "Please select or enter an avatar!"), "error");
      return;
    }
    setAvatarUrl(selectedAvatarPreview);
    setIsUpdating(true);
    try {
      await updateProfile({
        avatar: selectedAvatarPreview,
      });
      setIsAvatarDialogOpen(false);
      showToast(tr("Ảnh đại diện đã được cập nhật thành công!", "Profile picture updated successfully!"));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        tr("Không thể cập nhật ảnh đại diện!", "Failed to update profile picture!");
      showToast(msg, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle File Select for Avatar (Mở AvatarCropDialog kéo cắt giống Facebook)
  const handleFileSelectForCrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(tr("Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)!", "Please select an image file (PNG, JPG, WEBP)!"), "error");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast(tr("Kích thước file ảnh không được vượt quá 15MB!", "Image size must not exceed 15MB!"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropModal({ open: true, imageSrc: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Hoàn tất crop ảnh và lưu làm avatar
  const handleConfirmCropAvatar = async (croppedBlob: Blob) => {
    setIsCroppingUpload(true);
    showToast(tr("Đang tải ảnh đại diện…", "Uploading profile picture…"), "info");
    try {
      const url = await uploadAvatar(croppedBlob);
      setAvatarUrl(url);
      setSelectedAvatarPreview(url);
      await updateProfile({ avatar: url });
      setCropModal({ open: false, imageSrc: null });
      setIsAvatarDialogOpen(false);
      showToast(tr("Cập nhật ảnh đại diện thành công!", "Profile picture updated successfully!"));
    } catch {
      showToast(tr("Không thể tải ảnh lên Cloudinary. Vui lòng thử lại!", "Failed to upload image. Please try again!"), "error");
    } finally {
      setIsCroppingUpload(false);
    }
  };

  // Handle File Upload cho Ảnh bìa (Cover)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(tr("Vui lòng chọn file hình ảnh (PNG, JPG, WEBP)!", "Please select an image file (PNG, JPG, WEBP)!"), "error");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast(tr("Kích thước file ảnh bìa không được vượt quá 15MB!", "Cover image size must not exceed 15MB!"), "error");
      return;
    }

    setIsUpdating(true);
    setCoverMenuAnchor(null);
    showToast(tr("Đang tải ảnh bìa…", "Uploading cover photo…"), "info");
    try {
      const coverUrl = await uploadCover(file);
      await updateProfile({ cover: coverUrl });
      showToast(tr("Ảnh bìa trang cá nhân đã được cập nhật thành công!", "Cover photo updated successfully!"));
    } catch {
      showToast(tr("Không thể tải ảnh bìa lên. Vui lòng thử lại!", "Failed to upload cover photo. Please try again!"), "error");
    } finally {
      setIsUpdating(false);
    }
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
    if (score === 0) return { label: tr("Chưa nhập", "Not entered"), color: "var(--mui-palette-neutral-400)" };
    if (score <= 25) return { label: tr("Yếu", "Weak"), color: "var(--mui-palette-tone-ef4444)" };
    if (score <= 50) return { label: tr("Trung bình", "Medium"), color: "var(--mui-palette-tone-f59e0b)" };
    if (score <= 75) return { label: tr("Mạnh", "Strong"), color: "var(--mui-palette-brand-500)" };
    return { label: tr("Rất an toàn", "Very secure"), color: "var(--mui-palette-tone-10b981)" };
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast(tr("Vui lòng nhập mật khẩu hiện tại!", "Please enter your current password!"), "error");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      showToast(tr("Mật khẩu mới phải có tối thiểu 8 ký tự!", "New password must be at least 8 characters!"), "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast(tr("Mật khẩu xác nhận không khớp với mật khẩu mới!", "Password confirmation does not match!"), "error");
      return;
    }

    if (passwordStrength < 75) {
      showToast(tr("Mật khẩu mới cần có ít nhất chữ hoa, chữ thường, số và ký tự đặc biệt!", "New password needs uppercase, lowercase, number, and special character!"), "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      showToast(tr("Đổi mật khẩu tài khoản thành công!", "Password changed successfully!"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        tr("Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại!", "Failed to change password. Please check your current password!");
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
      showToast(tr("Đã xảy ra lỗi khi đăng xuất!", "Error logging out!"), "error");
    } finally {
      setIsLoggingOut(false);
      setIsLogoutDialogOpen(false);
    }
  };

  // Formatted date
  const joinDate = user?.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString(language === "en" ? "en-US" : "vi-VN", {
        month: "long",
        year: "numeric",
      })
    : tr("Tháng 10, 2026", "October 2026");

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
              background: user?.cover ? `url(${user.cover})` : activeCover.gradient,
              backgroundSize: "cover",
              backgroundPosition: "center",
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
                {tr("Đổi ảnh bìa", "Change cover")}
              </Button>

              <input
                id={coverInputId}
                type="file"
                hidden
                accept="image/*"
                onChange={handleCoverUpload}
              />

              <Menu
                anchorEl={coverMenuAnchor}
                open={Boolean(coverMenuAnchor)}
                onClose={() => setCoverMenuAnchor(null)}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "16px",
                      p: 1,
                      minWidth: 220,
                      boxShadow: "0 15px 30px rgba(0,0,0,0.12)",
                    },
                  },
                }}
              >
                <MenuItem
                  component="label"
                  htmlFor={coverInputId}
                  onClick={() => setCoverMenuAnchor(null)}
                  sx={{
                    borderRadius: "10px",
                    my: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Camera size={18} />
                  {tr("Tải ảnh từ máy tính", "Upload photo")}
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <Typography
                  variant="caption"
                  sx={{ px: 2, py: 1, fontWeight: 700, color: "var(--mui-palette-neutral-500)", display: "block" }}
                >
                  {tr("HOẶC CHỌN CHỦ ĐỀ MÀU", "OR CHOOSE COLOR THEME")}
                </Typography>
                {COVER_THEMES.map((theme, idx) => (
                  <MenuItem
                    key={theme.id}
                    onClick={() => void handleSelectCoverTheme(idx)}
                    selected={!user?.cover && idx === currentCoverIndex}
                    sx={{
                      borderRadius: "10px",
                      my: 0.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      fontWeight: !user?.cover && idx === currentCoverIndex ? 700 : 500,
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
                    {tr(theme.name, theme.nameEn)}
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
                      {tr("Thay đổi", "Change")}
                    </Typography>
                  </Box>
                </Box>

                {/* Online Indicator Badge */}
                <Tooltip title={tr("Đang trực tuyến", "Online")} arrow>
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
                  {tr("Chia sẻ", "Share")}
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
                  {tr("Chỉnh sửa hồ sơ", "Edit profile")}
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
                  {tr("Đăng xuất", "Log out")}
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
                  {user?.name || tr("Người dùng ChatApp", "ChatApp User")}
                </Typography>

                <Tooltip title={tr("Tài khoản đã xác thực", "Verified account")} arrow>
                  <Box sx={{ display: "inline-flex", color: "var(--mui-palette-brand-600)" }}>
                    <CheckCircle2 size={24} fill="var(--mui-palette-brand-600)" color="var(--mui-palette-common-white)" />
                  </Box>
                </Tooltip>

                {user?.role === "admin" ? (
                  <Chip
                    icon={<Sparkles size={14} color="var(--mui-palette-common-white)" />}
                    label={tr("Quản trị viên", "Administrator")}
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
                    label={tr("Thành viên chính thức", "Official Member")}
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

              {/* Tag / Email / Phone Chips - Chuyển sang dạng dọc */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: { xs: "center", sm: "flex-start" },
                  gap: 1.25,
                  color: "var(--mui-palette-neutral-600)",
                  fontSize: "0.875rem",
                  mt: 1,
                  mb: 2.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Mail size={16} />
                  <span>{user?.email || "chua_co_email@domain.com"}</span>
                </Box>

                {user?.phone && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Phone size={16} />
                    <span>{user.phone as string}</span>
                  </Box>
                )}

                {user?.dateOfBirth && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Calendar size={16} />
                    <span suppressHydrationWarning>
                      {tr("Sinh nhật:", "Birthday:")}{" "}
                      {new Date(user.dateOfBirth as string).toLocaleDateString(language === "en" ? "en-US" : "vi-VN")}
                    </span>
                  </Box>
                )}

                {user?.school && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <GraduationCap size={16} color="var(--mui-palette-brand-500)" />
                    <span>{user.school as string}</span>
                  </Box>
                )}

                {user?.relationshipStatus && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Heart size={16} color="var(--mui-palette-error-main)" fill="currentColor" />
                    <span>{getRelationshipLabel(user.relationshipStatus as string, language === "en" ? "en" : "vi")}</span>
                  </Box>
                )}

                <ButtonBase
                  onClick={() => router.push("/chat")}
                  aria-label={tr("Xem danh sách bạn bè", "View friends list")}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    borderRadius: "8px",
                    px: 0.5,
                    py: 0.25,
                    ml: { xs: 0, sm: -0.5 },
                    color: "var(--mui-palette-neutral-700)",
                    "&:hover": { color: "var(--mui-palette-brand-600)" },
                  }}
                >
                  <Users size={16} color="var(--mui-palette-brand-500)" />
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.875rem", color: "inherit" }}>
                    {friends.length}{" "}
                    <Box component="span" sx={{ fontWeight: 500, color: "var(--mui-palette-neutral-500)" }}>
                      {tr("bạn bè", "friends")}
                    </Box>
                  </Typography>
                </ButtonBase>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={16} />
                  <span suppressHydrationWarning>
                    {tr("Tham gia:", "Joined:")} {joinDate}
                  </span>
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
                    : tr(
                        "Chưa có tiểu sử giới thiệu. Nhấn vào 'Chỉnh sửa hồ sơ' để chia sẻ thêm về bạn với mọi người!",
                        "No bio yet. Click 'Edit profile' to share more about yourself!"
                      )}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>

        {/* ================= MAIN TABS SECTION ================= */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: "24px",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            bgcolor: "var(--mui-palette-background-paper)",
            overflow: "visible",
            boxShadow: "0 15px 35px -15px rgba(0,0,0,0.05)",
          }}
        >
          {/* Tabs Header */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              px: 3,
              pt: 1.5,
              bgcolor: "var(--mui-palette-neutral-50)",
              borderRadius: "24px 24px 0 0",
            }}
          >
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
              <Tab icon={<Newspaper size={18} />} iconPosition="start" label={tr("Bài viết", "Posts")} />
              <Tab icon={<UserIcon size={18} />} iconPosition="start" label={tr("Tổng quan", "Overview")} />
              <Tab icon={<Edit3 size={18} />} iconPosition="start" label={tr("Chỉnh sửa thông tin", "Edit Info")} />
              <Tab icon={<Shield size={18} />} iconPosition="start" label={tr("Bảo mật & Mật khẩu", "Security & Password")} />
              <Tab icon={<Sliders size={18} />} iconPosition="start" label={tr("Cài đặt & Tùy chọn", "Settings & Preferences")} />
            </Tabs>
          </Box>

          {/* TAB 0: BÀI VIẾT (DÒNG THỜI GIAN) */}
          {activeTab === TAB_POSTS && (
            <Box sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: "background.default", borderRadius: "0 0 24px 24px" }}>
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
                    {tr("Thông tin định danh", "Identity Information")}
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
                            {tr("Họ và tên", "Full name")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.name || tr("Chưa cập nhật", "Not updated")}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip label={tr("Hiển thị công khai", "Public")} size="small" sx={{ bgcolor: "var(--mui-palette-neutral-200)", fontSize: "0.75rem" }} />
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
                            {tr("Địa chỉ Email", "Email address")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.email || tr("Chưa có", "Not set")}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        icon={<Check size={14} />}
                        label={tr("Đã xác thực", "Verified")}
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
                            {tr("Số điện thoại", "Phone number")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.phone ? (user.phone as string) : tr("Chưa thiết lập", "Not set")}
                          </Typography>
                        </Box>
                      </Box>
                      {!user?.phone && (
                        <Button
                          size="small"
                          onClick={() => setActiveTab(TAB_EDIT)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          {tr("Thêm số", "Add phone")}
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
                            {tr("Ngày sinh", "Date of birth")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.dateOfBirth
                              ? new Date(user.dateOfBirth as string).toLocaleDateString(language === "en" ? "en-US" : "vi-VN")
                              : tr("Chưa thiết lập", "Not set")}
                          </Typography>
                        </Box>
                      </Box>
                      {!user?.dateOfBirth && (
                        <Button
                          size="small"
                          onClick={() => setActiveTab(TAB_EDIT)}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          {tr("Cập nhật", "Update")}
                        </Button>
                      )}
                    </Box>

                    {/* Item: School / Education */}
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
                        <Box sx={{ color: "var(--mui-palette-brand-500)" }}>
                          <GraduationCap size={20} />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            {tr("Trường học / Học vấn", "Education / School")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {user?.school ? (user.school as string) : tr("Chưa thiết lập", "Not set")}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => setActiveTab(TAB_EDIT)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {user?.school ? tr("Chỉnh sửa", "Edit") : tr("Thêm trường học", "Add school")}
                      </Button>
                    </Box>

                    {/* Item: Relationship Status */}
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
                        <Box sx={{ color: "var(--mui-palette-error-main)" }}>
                          <Heart size={20} fill="currentColor" />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 500 }}>
                            {tr("Tình trạng mối quan hệ", "Relationship status")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {getRelationshipLabel(user?.relationshipStatus as string, language === "en" ? "en" : "vi") ||
                              tr("Chưa thiết lập", "Not set")}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        onClick={() => setActiveTab(TAB_EDIT)}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                      >
                        {user?.relationshipStatus ? tr("Chỉnh sửa", "Edit") : tr("Thiết lập", "Set status")}
                      </Button>
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
                            {tr("Mã định danh (User ID)", "User ID")}
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
                      <Tooltip title={tr("Sao chép ID", "Copy ID")} arrow>
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleCopyText(String(user?._id || user?.id || ""), tr("Mã định danh", "User ID"))
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
                            {tr("Phương thức đăng nhập", "Sign-in method")}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)" }}>
                            {isGoogleLinked ? "Google Account (Firebase OAuth)" : tr("Mật khẩu hệ thống ChatApp", "ChatApp System Password")}
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
                    {tr("Huy hiệu danh dự", "Honor Badges")}
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
                          {tr("Tiên Phong", "Pioneer")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          {tr("Thành viên mùa 1", "Season 1 Member")}
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
                          {tr("Bảo Mật Cao", "High Security")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          {tr("Email & Token hợp lệ", "Valid Email & Token")}
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
                          {tr("Sôi Nổi", "Active")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)", display: "block" }}>
                          {tr("Hoạt động tích cực", "High engagement")}
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
                          {tr("Được chứng thực", "Verified VIP")}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Hoạt động gần đây */}
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2 }}>
                    {tr("Hoạt động gần đây", "Recent Activity")}
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
                          {tr("Đăng nhập phiên làm việc hiện tại", "Signed in to current session")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          {tr("Vừa xong • Trình duyệt web", "Just now • Web browser")}
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
                          {tr("Đồng bộ trạng thái hồ sơ cá nhân", "Synced personal profile status")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          {tr("Hôm nay", "Today")}
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
                          {tr("Kết nối máy chủ Realtime Chat", "Connected to Realtime Chat server")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                          {tr("Sẵn sàng trò chuyện", "Ready to chat")}
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
                        {name || tr("Họ và tên", "Full name")}
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
                        {tr("Đổi ảnh đại diện", "Change avatar")}
                      </Button>
                    </Box>
                  </Grid>

                  {/* Right Column: Fields */}
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2.5 }}>
                      {tr("Cập nhật hồ sơ", "Update Profile")}
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                      {/* Name input */}
                      <TextField
                        fullWidth
                        label={tr("Họ và tên hiển thị", "Display name")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tr("Nhập họ và tên...", "Enter full name...")}
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
                        label={tr("Số điện thoại", "Phone number")}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={tr("Ví dụ: 0987654321", "E.g., 0987654321")}
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
                        label={tr("Ngày sinh", "Date of birth")}
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

                      {/* School / Education input with API Autocomplete */}
                      <Autocomplete
                        freeSolo
                        options={schoolOptions}
                        loading={isLoadingSchools}
                        value={school}
                        onChange={(_e, newValue) => {
                          setSchool(newValue || "");
                        }}
                        onInputChange={(_e, newInputValue, reason) => {
                          if (reason === "input") {
                            setSchool(newInputValue);
                            if (newInputValue.length >= 2) {
                              void handleSearchSchools(newInputValue);
                            } else if (newInputValue.length === 0) {
                              void handleSearchSchools("");
                            }
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={tr("Trường học / Học vấn", "School / Education")}
                            placeholder={tr("Chọn hoặc tìm kiếm trường học...", "Select or search school...")}
                            helperText={tr("Gợi ý tự động từ API trường học, bạn có thể chọn hoặc tự nhập", "Auto-suggested from universities API, you can select or type")}
                            slotProps={{
                              ...params.slotProps,
                              input: {
                                ...params.slotProps.input,
                                startAdornment: (
                                  <>
                                    <InputAdornment position="start">
                                      <GraduationCap size={18} color="var(--mui-palette-neutral-500)" />
                                    </InputAdornment>
                                    {params.slotProps.input.startAdornment}
                                  </>
                                ),
                                endAdornment: (
                                  <>
                                    {isLoadingSchools ? <CircularProgress color="inherit" size={18} /> : null}
                                    {params.slotProps.input.endAdornment}
                                  </>
                                ),
                              },
                              htmlInput: {
                                ...params.slotProps.htmlInput,
                                maxLength: 150,
                              },
                            }}
                          />
                        )}
                      />

                      {/* Relationship Status select */}
                      <FormControl fullWidth>
                        <InputLabel id="relationship-status-select-label">
                          {tr("Tình trạng mối quan hệ", "Relationship status")}
                        </InputLabel>
                        <Select
                          labelId="relationship-status-select-label"
                          value={relationshipStatus}
                          onChange={(e) => setRelationshipStatus(e.target.value)}
                          label={tr("Tình trạng mối quan hệ", "Relationship status")}
                          startAdornment={
                            <InputAdornment position="start">
                              <Heart size={18} color="var(--mui-palette-error-main)" />
                            </InputAdornment>
                          }
                          sx={{ borderRadius: "12px" }}
                        >
                          <MenuItem value="">
                            <em>{tr("Chưa chọn / Để trống", "None / Unspecified")}</em>
                          </MenuItem>
                          {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {language === "en" ? opt.labelEn : opt.labelVi}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Bio input */}
                      <TextField
                        fullWidth
                        label={tr("Tiểu sử / Giới thiệu bản thân", "Bio / About me")}
                        multiline
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={tr(
                          "Viết một vài dòng chia sẻ về sở thích, công việc hoặc phương châm của bạn...",
                          "Write a few lines about your hobbies, work, or motto..."
                        )}
                        helperText={`${bio.length}/300 ${tr("ký tự", "characters")}`}
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
                          {isUpdating ? tr("Đang lưu...", "Saving...") : tr("Lưu thay đổi", "Save changes")}
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
                              setSchool((user.school as string) || "");
                              setRelationshipStatus((user.relationshipStatus as string) || "");
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
                          {tr("Khôi phục ban đầu", "Reset")}
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
                    {tr("Bảo mật tài khoản & Đổi mật khẩu", "Account Security & Change Password")}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", mb: 3 }}>
                    {tr(
                      "Để bảo vệ an toàn cho tài khoản, hãy sử dụng mật khẩu mạnh kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.",
                      "To protect your account, use a strong password combining uppercase, lowercase, numbers, and special characters."
                    )}
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
                            {tr("Tài khoản liên kết an toàn qua Google Firebase", "Account securely linked via Google Firebase")}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "var(--mui-palette-brand-500)" }}>
                            {tr(
                              "Tài khoản của bạn được chứng thực và bảo vệ trực tiếp bởi hệ thống Google Security.",
                              "Your account is authenticated and protected directly by Google Security."
                            )}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-600)" }}>
                        {tr(
                          "Bạn không cần đổi mật khẩu tại đây. Mật khẩu và bảo mật 2 lớp của bạn được quản lý an toàn trên tài khoản Google của bạn.",
                          "You do not need to change your password here. Your password and 2FA are managed securely on your Google account."
                        )}
                      </Typography>
                    </Paper>
                  ) : (
                    /* Standard change password form */
                    <form onSubmit={handleChangePassword}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                        <TextField
                          fullWidth
                          label={tr("Mật khẩu hiện tại", "Current password")}
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder={tr("Nhập mật khẩu hiện tại của bạn", "Enter your current password")}
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
                            label={tr("Mật khẩu mới", "New password")}
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={tr(
                              "Tối thiểu 8 ký tự, chữ hoa, số & ký tự đặc biệt",
                              "At least 8 characters, uppercase, number & special char"
                            )}
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
                                  {tr("Độ an toàn mật khẩu:", "Password strength:")}
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
                          label={tr("Xác nhận mật khẩu mới", "Confirm new password")}
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={tr("Nhập lại mật khẩu mới", "Re-enter new password")}
                          error={Boolean(confirmPassword && confirmPassword !== newPassword)}
                          helperText={
                            confirmPassword && confirmPassword !== newPassword
                              ? tr("Mật khẩu xác nhận không khớp!", "Passwords do not match!")
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
                            {isChangingPassword ? tr("Đang xử lý...", "Processing...") : tr("Cập nhật mật khẩu", "Update password")}
                          </Button>
                        </Box>
                      </Box>
                    </form>
                  )}
                </Grid>

                {/* Right Column: Security Sessions */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-900)", mb: 2 }}>
                    {tr("Phiên đăng nhập & Thiết bị", "Active Sessions & Devices")}
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
                          {tr("Windows PC • Trình duyệt hiện tại", "Windows PC • Current browser")}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "var(--mui-palette-tone-10b981)", fontWeight: 600 }}>
                          {tr("● Đang hoạt động", "● Active now")}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider />

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                        {tr("Địa chỉ IP kết nối:", "Connected IP:")}
                      </Typography>
                      <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                        127.0.0.1 (Localhost)
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                        {tr("Thời gian hết hạn phiên:", "Session expiration:")}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-600)" }}>
                        {tr("7 ngày (Tự động gia hạn)", "7 days (Auto-renew)")}
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
                      {tr("Đăng xuất phiên làm việc", "Sign out of session")}
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
                {tr("Cài đặt & Tùy chọn trải nghiệm", "Settings & Experience Preferences")}
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
                        {tr("Thông báo & Âm thanh", "Notifications & Sounds")}
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
                              {tr("Âm thanh tin nhắn đến", "Incoming message sound")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              {tr("Phát âm thanh thông báo mỗi khi có tin nhắn mới", "Play a notification sound when a new message arrives")}
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
                              {tr("Thông báo đẩy trên trình duyệt", "Browser push notifications")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              {tr("Nhận thông báo kể cả khi bạn không mở tab chat", "Receive notifications even when the chat tab is not active")}
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
                              {tr("Xem trước nội dung tin nhắn", "Preview message content")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              {tr("Hiển thị nội dung chi tiết trong popup thông báo", "Show detailed message content in notification popups")}
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
                        {tr("Quyền riêng tư", "Privacy")}
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
                              {tr("Hiển thị trạng thái Đang hoạt động", "Show Active Status")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              {tr("Cho phép bạn bè biết khi bạn đang trực tuyến", "Let friends know when you are online")}
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
                              {tr("Cho phép tìm kiếm qua số điện thoại", "Allow search by phone number")}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-500)" }}>
                              {tr("Bạn bè có thể tìm thấy bạn bằng số điện thoại", "Friends can find you using your phone number")}
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
            {tr("Thay đổi ảnh đại diện", "Change Profile Picture")}
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
                {tr("Xem trước ảnh đại diện", "Avatar preview")}
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
                <Tab label={tr("Bộ sưu tập Avatar", "Preset Avatars")} />
                <Tab label={tr("Tải ảnh lên / Nhập URL", "Upload / Enter URL")} />
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
                    onChange={handleFileSelectForCrop}
                  />
                  <Camera size={32} color="var(--mui-palette-neutral-500)" style={{ margin: "0 auto 8px" }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)" }}>
                    {tr("Nhấn vào đây để tải ảnh từ máy tính (kéo cắt giống Facebook)", "Click here to upload from your computer (crop like Facebook)")}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                    {tr("Hỗ trợ kéo vị trí, thu phóng theo ý muốn", "Drag to position and zoom freely")}
                  </Typography>
                </Box>

                <Divider>
                  <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                    {tr("HOẶC", "OR")}
                  </Typography>
                </Divider>

                <TextField
                  fullWidth
                  size="small"
                  label={tr("Dán đường dẫn ảnh trực tiếp (URL)", "Paste direct image URL")}
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
              {tr("Hủy", "Cancel")}
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
              {isUpdating ? tr("Đang lưu...", "Saving...") : tr("Xác nhận & Lưu", "Confirm & Save")}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ================= DIALOG: CẮT ẢNH ĐẠI DIỆN GIỐNG FACEBOOK ================= */}
        <AvatarCropDialog
          open={cropModal.open}
          imageSrc={cropModal.imageSrc}
          onClose={() => setCropModal({ open: false, imageSrc: null })}
          onConfirmCrop={handleConfirmCropAvatar}
          loading={isCroppingUpload}
        />

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
            {tr("Xác nhận đăng xuất", "Confirm Logout")}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-500)", lineHeight: 1.6 }}>
              {tr("Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ", "Are you sure you want to log out of ")}
              <strong>{user?.name || user?.email}</strong>
              {tr("? Bạn sẽ cần đăng nhập lại để tiếp tục trò chuyện.", "? You will need to sign in again to continue chatting.")}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              disabled={isLoggingOut}
              onClick={() => setIsLogoutDialogOpen(false)}
              sx={{ color: "var(--mui-palette-neutral-500)", fontWeight: 600 }}
            >
              {tr("Ở lại", "Stay")}
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
              {isLoggingOut ? tr("Đang đăng xuất...", "Logging out...") : tr("Đăng xuất", "Log out")}
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
