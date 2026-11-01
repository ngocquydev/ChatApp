"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Divider,
  Tabs,
  Tab,
  Button,
  ButtonBase,
  IconButton,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Search,
  Circle,
  UserPlus,
  Users,
  MessageSquare,
  Check,
  X,
  Clock,
  MapPin,
  Compass,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { AURA_BOT_USER } from "@/constants/auraBot";
import { useTranslation } from "@/i18n/useTranslation";
import {
  useFriendStore,
  UserRelationResult,
} from "../../store/useFriendStore";
import { useChatStore, ChatUser } from "../../store/useChatStore";
import { useChatBoxStore } from "../../store/useChatBoxStore";

export interface FriendContact {
  id: number | string;
  name: string;
  avatar: string;
  role?: string;
  online: boolean;
}

export interface PersonCallProps {
  onSelectFriend?: (friend: ChatUser) => void;
}

const PERSON_CALL_TAB_STORAGE_KEY = "chatapp:person_call_tab";

function readStoredPersonCallTab(): number {
  if (typeof window === "undefined") return 0;
  try {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("personTab");
    if (tabParam === "find" || tabParam === "1") return 1;
    if (tabParam === "friends" || tabParam === "0") return 0;

    const raw = localStorage.getItem(PERSON_CALL_TAB_STORAGE_KEY);
    if (raw !== null) {
      const val = Number(raw);
      if (val === 0 || val === 1) return val;
    }
  } catch {
    // Bỏ qua nếu localStorage bị chặn
  }
  return 0;
}

function PersonCall({ onSelectFriend }: PersonCallProps) {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchFriend, setSearchFriend] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const { tr } = useTranslation();

  const handleTabChange = (val: number) => {
    setActiveTab(val);
    try {
      localStorage.setItem(PERSON_CALL_TAB_STORAGE_KEY, String(val));
    } catch {
      // Bỏ qua nếu localStorage bị chặn
    }
  };

  useEffect(() => {
    const stored = readStoredPersonCallTab();
    setActiveTab((prev) => (prev !== stored ? stored : prev));
  }, []);

  const {
    friends,
    isLoadingFriends,
    fetchFriends,
    searchResults,
    isSearching,
    searchUsers,
    sendFriendRequest,
    cancelRequest,
    respondToRequest,
    clearSearchResults,
    recommendations,
    isLoadingRecommendations,
    isLocating,
    userLocation,
    fetchRecommendations,
    updateLocation,
  } = useFriendStore();

  const { onlineUserIds } = useChatStore();
  const { openChat } = useChatBoxStore();

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Tự động tải danh sách gợi ý bạn bè khi mở tab "Tìm bạn"
  useEffect(() => {
    if (activeTab === 1 && recommendations.length === 0) {
      fetchRecommendations();
    }
  }, [activeTab, recommendations.length, fetchRecommendations]);

  const handleRequestLocation = () => {
    setGeoNotice(null);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoNotice(tr("Trình duyệt của bạn không hỗ trợ định vị vị trí.", "Your browser does not support geolocation."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await updateLocation(latitude, longitude);
      },
      (err) => {
        console.warn("Không thể lấy tọa độ hiện tại:", err);
        setGeoNotice(tr("Không lấy được vị trí hiện tại. Đang hiển thị gợi ý mặc định.", "Could not get current location. Showing default suggestions."));
        fetchRecommendations();
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Debounced search khi gõ ở tab "Tìm bạn mới"
  useEffect(() => {
    if (activeTab !== 1) return;
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, searchUsers]);

  // Danh sách bạn bè thật đã lọc theo từ khóa (chỉ theo tên)
  const filteredFriends = friends.filter((f) => {
    const name = f.friend?.name || "";
    const q = searchFriend.toLowerCase().trim();
    return name.toLowerCase().includes(q);
  });

  const onlineFriendsCount = friends.filter((f) =>
    onlineUserIds.includes(f.friend?._id)
  ).length;

  const handleStartChat = (targetUser: ChatUser) => {
    if (onSelectFriend) {
      onSelectFriend(targetUser);
    }
    // Mở hộp thoại tin nhắn nổi ở góc phải phong cách Facebook
    openChat(targetUser);
  };

  const handleSendRequest = async (userId: string) => {
    await sendFriendRequest(userId);
  };

  const handleCancelRequest = async (requestId?: string) => {
    if (requestId) {
      await cancelRequest(requestId);
    }
  };

  const handleRespond = async (requestId: string, action: "accept" | "reject") => {
    await respondToRequest(requestId, action);
  };

  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        height: "calc(100dvh - 64px)",
        bgcolor: "var(--mui-palette-background-paper)",
        p: { md: 2, lg: 2.2 },
        position: "fixed",
        right: 0,
        top: "64px",
        width: { md: 340, lg: 360, xl: 380 },
        borderLeft: "1px solid var(--mui-palette-neutral-200)",
        zIndex: 10,
        boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.02)",
      }}
    >
      {/* Header & Tabs */}
      <Box sx={{ mb: 1.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => {
            handleTabChange(val);
            setSearchQuery("");
            clearSearchResults();
          }}
          variant="fullWidth"
          sx={{
            minHeight: 42,
            "& .MuiTab-root": {
              minHeight: 42,
              textTransform: "none",
              fontSize: "0.86rem",
              fontWeight: 700,
              py: 0.8,
              px: 1.2,
              gap: 0.8,
            },
            "& .MuiTabs-indicator": {
              height: 3,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Tab
            icon={<Users size={16} />}
            iconPosition="start"
            label={tr(`Bạn bè (${friends.length})`, `Friends (${friends.length})`)}
          />
          <Tab
            icon={<UserPlus size={16} />}
            iconPosition="start"
            label={tr("Tìm bạn", "Find Friends")}
          />
        </Tabs>
      </Box>

      {/* TAB 0: DANH SÁCH BẠN BÈ THẬT */}
      {activeTab === 0 && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
              px: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-500)" }}>
              {tr("NGƯỜI LIÊN HỆ", "CONTACTS")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                bgcolor: "var(--mui-palette-tone-f0fdf4)",
                color: "var(--mui-palette-tone-166534)",
                px: 1,
                py: 0.25,
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              <Circle size={7} fill="var(--mui-palette-tone-22c55e)" color="var(--mui-palette-tone-22c55e)" />
              {onlineFriendsCount} Online
            </Box>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={tr("Tìm trong danh sách bạn...", "Search in friends list...")}
            value={searchFriend}
            onChange={(e) => setSearchFriend(e.target.value)}
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: "var(--mui-palette-neutral-50)",
                fontSize: "0.85rem",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} color="var(--mui-palette-neutral-400)" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Divider sx={{ mb: 1 }} />

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 0.5,
              "&::-webkit-scrollbar": {
                width: "5px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "var(--mui-palette-neutral-300)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "var(--mui-palette-neutral-400)",
              },
            }}
          >
            {isLoadingFriends && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!isLoadingFriends && friends.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                <Users size={36} color="var(--mui-palette-neutral-400)" style={{ marginBottom: 8 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-600)", mb: 0.5 }}>
                  {tr("Chưa có bạn bè nào", "No friends yet")}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)", display: "block", mb: 2 }}>
                  {tr("Hãy tìm kiếm bạn bè trên hệ thống để kết nối và trò chuyện!", "Search for friends on the platform to connect and chat!")}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UserPlus size={14} />}
                  onClick={() => handleTabChange(1)}
                  sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600 }}
                >
                  {tr("Tìm bạn ngay", "Find friends now")}
                </Button>
              </Box>
            )}

            {!isLoadingFriends && friends.length > 0 && filteredFriends.length === 0 && (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                  {tr(`Không tìm thấy bạn bè khớp với "${searchFriend}"`, `No friends matching "${searchFriend}"`)}
                </Typography>
              </Box>
            )}

            {!isLoadingFriends && (!searchFriend.trim() || "aura ai".includes(searchFriend.trim().toLowerCase())) && (
              <ButtonBase
                component="div"
                aria-label={tr("Trò chuyện với Aura AI", "Chat with Aura AI")}
                onClick={() => handleStartChat(AURA_BOT_USER)}
                sx={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  mb: 0.75,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                  "&:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <PresenceAvatar
                  name="Aura AI"
                  src="/assets/avatars/aura-bot.svg"
                  online={true}
                  size={38}
                />

                <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 700, color: "text.primary", fontSize: "0.85rem" }}
                    >
                      Aura AI
                    </Typography>
                    <VerifiedBadge size={14} />
                  </Box>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: "primary.main", fontWeight: 600, display: "block", fontSize: "0.72rem" }}
                  >
                    {tr("Trợ lý ảo AI • Sẵn sàng", "AI Assistant • Ready")}
                  </Typography>
                </Box>
              </ButtonBase>
            )}

            {!isLoadingFriends &&
              filteredFriends.map((f) => {
                const friend = f.friend;
                if (!friend) return null;
                const isOnline = onlineUserIds.includes(friend._id);

                return (
                  <ButtonBase
                    component="div"
                    key={f.friendshipId || friend._id}
                    aria-label={tr(`Trò chuyện với ${friend.name}`, `Chat with ${friend.name}`)}
                    onClick={() => handleStartChat(friend)}
                    sx={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      p: 1,
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      mb: 0.5,
                      "&:hover": {
                        bgcolor: "var(--mui-palette-brand-50)",
                      },
                    }}
                  >
                    <PresenceAvatar
                      name={friend.name}
                      src={friend.avatar}
                      online={isOnline}
                      size={38}
                    />

                    <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: 600, color: "var(--mui-palette-neutral-800)", fontSize: "0.85rem" }}
                      >
                        {friend.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          color: isOnline ? "var(--mui-palette-tone-22c55e)" : "var(--mui-palette-neutral-400)",
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: isOnline ? 600 : 400,
                        }}
                      >
                        {isOnline ? tr("Đang hoạt động", "Online") : tr("Ngoại tuyến", "Offline")}
                      </Typography>
                    </Box>

                    <Tooltip title={tr("Nhắn tin", "Message")}>
                      <IconButton
                        size="small"
                        aria-label={tr(`Nhắn tin với ${friend.name}`, `Message ${friend.name}`)}
                        sx={{ color: "var(--mui-palette-brand-500)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChat(friend);
                        }}
                      >
                        <MessageSquare size={16} />
                      </IconButton>
                    </Tooltip>
                  </ButtonBase>
                );
              })}
          </Box>
        </>
      )}

      {/* TAB 1: TÌM BẠN MỚI TRÊN TOÀN HỆ THỐNG */}
      {activeTab === 1 && (
        <>
          <Box sx={{ mb: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={tr("Nhập tên người dùng cần tìm…", "Enter username to search…")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  bgcolor: "var(--mui-palette-neutral-50)",
                  fontSize: "0.85rem",
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={15} color="var(--mui-palette-brand-500)" />
                    </InputAdornment>
                  ),
                  endAdornment: isSearching ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null,
                },
              }}
            />
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 0.5,
              position: "relative",
              "&::-webkit-scrollbar": {
                width: "5px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "var(--mui-palette-neutral-300)",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "var(--mui-palette-neutral-400)",
              },
            }}
          >
            {isSearching && searchResults.length > 0 && (
              <LinearProgress sx={{ mb: 1, height: 2, borderRadius: 1 }} />
            )}

            {!searchQuery.trim() && (
              <>
                {/* Khối định vị địa lý quanh đây */}
                <Box
                  sx={{
                    p: 1.5,
                    mb: 2,
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, var(--mui-palette-brand-50) 0%, var(--mui-palette-brand-100) 100%)",
                    border: "1px solid var(--mui-palette-brand-200)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Compass size={20} color="var(--mui-palette-brand-600)" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "var(--mui-palette-brand-900)", fontSize: "0.82rem" }}>
                        {tr("Tìm bạn bè quanh đây", "Find friends nearby")}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-600)", fontSize: "0.72rem", display: "block" }}>
                        {userLocation
                          ? tr("Đã định vị vị trí hiện tại của bạn", "Current location detected")
                          : tr("Ưu tiên người ở gần, có bạn chung & uy tín", "Prioritizes nearby people, mutual friends & trusted users")}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="contained"
                    disabled={isLocating}
                    onClick={handleRequestLocation}
                    startIcon={isLocating ? <CircularProgress size={13} color="inherit" /> : <MapPin size={13} />}
                    sx={{
                      textTransform: "none",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      py: 0.5,
                      borderRadius: "8px",
                      bgcolor: "var(--mui-palette-brand-600)",
                      boxShadow: "none",
                      "&:hover": { bgcolor: "var(--mui-palette-brand-700)" },
                    }}
                  >
                    {isLocating
                      ? tr("Đang định vị…", "Locating…")
                      : userLocation
                      ? tr("Cập nhật lại vị trí", "Update location")
                      : tr("Bật định vị & Gợi ý quanh đây", "Enable location & Nearby suggestions")}
                  </Button>
                  {geoNotice && (
                    <Alert severity="info" onClose={() => setGeoNotice(null)} sx={{ py: 0, px: 1, fontSize: "0.72rem" }}>
                      {geoNotice}
                    </Alert>
                  )}
                </Box>

                {/* Tiêu đề danh sách gợi ý */}
                <Box
                  sx={{
                    mb: 1.2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth: 0 }}>
                    <Sparkles size={16} color="var(--mui-palette-brand-500)" style={{ flexShrink: 0 }} />
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 700, color: "var(--mui-palette-neutral-800)", fontSize: "0.85rem" }}
                    >
                      {tr("Những người bạn có thể biết", "People you may know")}
                    </Typography>
                  </Box>
                  <Chip
                    label={tr(`${recommendations.length} gợi ý`, `${recommendations.length} suggestions`)}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: "var(--mui-palette-brand-50)",
                      color: "var(--mui-palette-brand-600)",
                      border: "1px solid var(--mui-palette-brand-100)",
                      flexShrink: 0,
                    }}
                  />
                </Box>

                {isLoadingRecommendations && recommendations.length === 0 && (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={22} />
                  </Box>
                )}

                {!isLoadingRecommendations && recommendations.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 3, px: 2 }}>
                    <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                      {tr("Chưa có gợi ý nào mới. Hãy thử bật định vị hoặc tìm kiếm theo tên!", "No new suggestions yet. Try enabling location or searching by name!")}
                    </Typography>
                  </Box>
                )}

                {recommendations.map((rec) => (
                    <Box
                      key={rec._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1.2,
                        borderRadius: "12px",
                        bgcolor: "var(--mui-palette-background-paper)",
                        mb: 1,
                        border: "1px solid var(--mui-palette-neutral-200)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "var(--mui-palette-brand-300)",
                          bgcolor: "var(--mui-palette-neutral-50)",
                        },
                      }}
                    >
                      <ButtonBase
                        component={NextLink}
                        href={`/profile/${rec._id}`}
                        aria-label={tr(`Xem trang cá nhân của ${rec.name}`, `View ${rec.name}'s profile`)}
                        sx={{ borderRadius: "50%", flexShrink: 0 }}
                      >
                        <PresenceAvatar
                          name={rec.name}
                          src={rec.avatar}
                          size={40}
                          hidePresence
                        />
                      </ButtonBase>

                      <Box sx={{ ml: 1.2, flex: 1, minWidth: 0 }}>
                        <Typography
                          component={NextLink}
                          href={`/profile/${rec._id}`}
                          variant="subtitle2"
                          noWrap
                          sx={{
                            display: "block",
                            textDecoration: "none",
                            fontWeight: 700,
                            color: "var(--mui-palette-neutral-800)",
                            fontSize: "0.86rem",
                            lineHeight: 1.3,
                            "&:hover": { color: "primary.main", textDecoration: "underline" },
                          }}
                        >
                          {rec.name}
                        </Typography>

                        {/* Badge lý do / bạn chung / khoảng cách */}
                        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.5, mt: 0.3 }}>
                          {rec.mutualFriendsCount > 0 && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.4,
                                bgcolor: "var(--mui-palette-brand-50)",
                                color: "var(--mui-palette-brand-600)",
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Users size={12} />
                              <span>{tr(`${rec.mutualFriendsCount} bạn chung`, `${rec.mutualFriendsCount} mutual friends`)}</span>
                            </Box>
                          )}

                          {rec.distanceKm !== undefined && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.4,
                                bgcolor: "var(--mui-palette-tone-ecfdf5)",
                                color: "var(--mui-palette-tone-059669)",
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <MapPin size={12} />
                              <span>
                                {rec.distanceKm < 1
                                  ? `${Math.round(rec.distanceKm * 1000)}m`
                                  : `${rec.distanceKm.toFixed(1)} km`}
                              </span>
                            </Box>
                          )}

                          {rec.mutualFriendsCount === 0 && rec.distanceKm === undefined && rec.friendsCount >= 5 && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.4,
                                bgcolor: "var(--mui-palette-neutral-100)",
                                color: "var(--mui-palette-neutral-600)",
                                px: 0.8,
                                py: 0.2,
                                borderRadius: "6px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              <ShieldCheck size={12} />
                              <span>{tr("Tài khoản uy tín", "Trusted account")}</span>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      {/* Hành động */}
                      <Box sx={{ ml: 1, flexShrink: 0 }}>
                        {rec.relationStatus === "none" && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSendRequest(rec._id)}
                            startIcon={<UserPlus size={13} />}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              py: 0.45,
                              px: 1.2,
                              borderRadius: "8px",
                              boxShadow: "none",
                              whiteSpace: "nowrap",
                              bgcolor: "var(--mui-palette-brand-600)",
                              "&:hover": { bgcolor: "var(--mui-palette-brand-700)" },
                            }}
                          >
                            {tr("Kết bạn", "Add friend")}
                          </Button>
                        )}

                        {rec.relationStatus === "pending_sent" && (
                          <Tooltip title={tr("Nhấp để hủy lời mời", "Click to cancel request")}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={() => handleCancelRequest(rec.requestId)}
                              startIcon={<Clock size={13} />}
                              sx={{
                                textTransform: "none",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                py: 0.45,
                                px: 1,
                                borderRadius: "8px",
                                color: "var(--mui-palette-neutral-500)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tr("Đã gửi", "Requested")}
                            </Button>
                          </Tooltip>
                        )}

                        {rec.relationStatus === "friends" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleStartChat(rec as unknown as ChatUser)}
                            startIcon={<MessageSquare size={13} />}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              py: 0.45,
                              px: 1,
                              borderRadius: "8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tr("Nhắn tin", "Message")}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
              </>
            )}

            {searchQuery.trim() && isSearching && searchResults.length === 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4, gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="caption" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                  {tr("Đang tìm kiếm người dùng...", "Searching users...")}
                </Typography>
              </Box>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "var(--mui-palette-neutral-400)" }}>
                  {tr(`Không tìm thấy người dùng nào phù hợp với "${searchQuery}"`, `No users found matching "${searchQuery}"`)}
                </Typography>
              </Box>
            )}

            {searchResults.map((user: UserRelationResult) => (
              <Box
                key={user._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderRadius: "10px",
                  bgcolor: "var(--mui-palette-neutral-50)",
                  mb: 1,
                  border: "1px solid var(--mui-palette-neutral-200)",
                }}
              >
                <ButtonBase
                  component={NextLink}
                  href={`/profile/${user._id}`}
                  aria-label={tr(`Xem trang cá nhân của ${user.name}`, `View ${user.name}'s profile`)}
                  sx={{ borderRadius: "50%", flexShrink: 0 }}
                >
                  <PresenceAvatar
                    name={user.name}
                    src={user.avatar}
                    size={40}
                    hidePresence
                  />
                </ButtonBase>

                <Box sx={{ ml: 1.2, flex: 1, minWidth: 0 }}>
                  <Typography
                    component={NextLink}
                    href={`/profile/${user._id}`}
                    variant="subtitle2"
                    noWrap
                    sx={{
                      display: "block",
                      textDecoration: "none",
                      fontWeight: 700,
                      color: "var(--mui-palette-neutral-800)",
                      fontSize: "0.86rem",
                      "&:hover": { color: "primary.main", textDecoration: "underline" },
                    }}
                  >
                    {user.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: "var(--mui-palette-neutral-500)", display: "block", fontSize: "0.74rem" }}
                  >
                    {user.bio || tr("Thành viên", "Member")}
                  </Typography>
                </Box>

                {/* Quan hệ & Hành động */}
                <Box sx={{ ml: 1, flexShrink: 0 }}>
                  {user.relationStatus === "none" && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSendRequest(user._id)}
                      startIcon={<UserPlus size={13} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        py: 0.45,
                        px: 1.2,
                        borderRadius: "8px",
                        boxShadow: "none",
                        whiteSpace: "nowrap",
                        bgcolor: "var(--mui-palette-brand-600)",
                        "&:hover": { bgcolor: "var(--mui-palette-brand-700)" },
                      }}
                    >
                      {tr("Kết bạn", "Add friend")}
                    </Button>
                  )}

                  {user.relationStatus === "pending_sent" && (
                    <Tooltip title={tr("Nhấp để hủy lời mời", "Click to cancel request")}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={() => handleCancelRequest(user.requestId)}
                        startIcon={<Clock size={13} />}
                        sx={{
                          textTransform: "none",
                          fontSize: "0.72rem",
                          py: 0.4,
                          px: 0.8,
                          borderRadius: "8px",
                          color: "var(--mui-palette-neutral-500)",
                        }}
                      >
                        {tr("Đã gửi", "Requested")}
                      </Button>
                    </Tooltip>
                  )}

                  {user.relationStatus === "pending_received" && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label={tr(`Đồng ý kết bạn với ${user.name}`, `Accept friend request from ${user.name}`)}
                        onClick={() => handleRespond(user.requestId || "", "accept")}
                        sx={{ bgcolor: "var(--mui-palette-brand-50)", p: 0.5 }}
                      >
                        <Check size={14} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={tr(`Từ chối kết bạn với ${user.name}`, `Decline friend request from ${user.name}`)}
                        onClick={() => handleRespond(user.requestId || "", "reject")}
                        sx={{ bgcolor: "var(--mui-palette-tone-fef2f2)", p: 0.5 }}
                      >
                        <X size={14} />
                      </IconButton>
                    </Box>
                  )}

                  {user.relationStatus === "friends" && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => handleStartChat(user)}
                      startIcon={<MessageSquare size={13} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        py: 0.4,
                        px: 0.8,
                        borderRadius: "8px",
                      }}
                    >
                      {tr("Nhắn tin", "Message")}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export default PersonCall;
