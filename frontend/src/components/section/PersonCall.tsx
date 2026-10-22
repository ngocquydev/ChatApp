"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  Avatar,
  Badge,
  InputAdornment,
  Divider,
  Tabs,
  Tab,
  Button,
  IconButton,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Search,
  Circle,
  UserPlus,
  Users,
  MessageSquare,
  Check,
  X,
  Clock,
  UserCheck,
  MapPin,
  Compass,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  useFriendStore,
  UserRelationResult,
  FriendRecommendationResult,
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

const OnlineBadge = styled(Badge)<{ isonline?: string }>(({ theme, isonline }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: isonline === "true" ? "#22c55e" : "#94a3b8",
    color: isonline === "true" ? "#22c55e" : "#94a3b8",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation:
        isonline === "true" ? "ripple 1.4s infinite ease-in-out" : "none",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": { transform: "scale(.8)", opacity: 1 },
    "100%": { transform: "scale(2.2)", opacity: 0 },
  },
}));

function PersonCall({ onSelectFriend }: PersonCallProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [searchFriend, setSearchFriend] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const { onlineUserIds, startConversationWithUser } = useChatStore();
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
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ Geolocation API");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await updateLocation(latitude, longitude);
      },
      (err) => {
        console.warn("Không thể lấy tọa độ hiện tại:", err);
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

  // Danh sách bạn bè thật đã lọc theo từ khóa
  const filteredFriends = friends.filter((f) => {
    const name = f.friend?.name || "";
    const email = f.friend?.email || "";
    const q = searchFriend.toLowerCase().trim();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
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
        flex: { xs: 0, md: 3, lg: 3 },
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        bgcolor: "#ffffff",
        p: 2,
        position: "fixed",
        right: 0,
        top: "64px",
        width: { md: "25%", lg: "20%" },
        borderLeft: "1px solid #e2e8f0",
        zIndex: 10,
      }}
    >
      {/* Header & Tabs */}
      <Box sx={{ mb: 1.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => {
            setActiveTab(val);
            setSearchQuery("");
            clearSearchResults();
          }}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              textTransform: "none",
              fontSize: "0.85rem",
              fontWeight: 700,
              p: 1,
            },
          }}
        >
          <Tab
            icon={<Users size={16} />}
            iconPosition="start"
            label={`Bạn bè (${friends.length})`}
          />
          <Tab
            icon={<UserPlus size={16} />}
            iconPosition="start"
            label="Tìm bạn"
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
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b" }}>
              NGƯỜI LIÊN HỆ
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                bgcolor: "#f0fdf4",
                color: "#166534",
                px: 1,
                py: 0.25,
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              <Circle size={7} fill="#22c55e" color="#22c55e" />
              {onlineFriendsCount} Online
            </Box>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder="Tìm trong danh sách bạn..."
            value={searchFriend}
            onChange={(e) => setSearchFriend(e.target.value)}
            sx={{
              mb: 1.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: "#f8fafc",
                fontSize: "0.85rem",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} color="#94a3b8" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
            {isLoadingFriends && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!isLoadingFriends && friends.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                <Users size={36} color="#94a3b8" style={{ marginBottom: 8 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#475569", mb: 0.5 }}>
                  Chưa có bạn bè nào
                </Typography>
                <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 2 }}>
                  Hãy tìm kiếm bạn bè trên hệ thống để kết nối và trò chuyện!
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UserPlus size={14} />}
                  onClick={() => setActiveTab(1)}
                  sx={{ textTransform: "none", borderRadius: "8px", fontWeight: 600 }}
                >
                  Tìm bạn ngay
                </Button>
              </Box>
            )}

            {!isLoadingFriends && friends.length > 0 && filteredFriends.length === 0 && (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Không tìm thấy bạn bè khớp với &quot;{searchFriend}&quot;
                </Typography>
              </Box>
            )}

            {!isLoadingFriends &&
              filteredFriends.map((f) => {
                const friend = f.friend;
                if (!friend) return null;
                const isOnline = onlineUserIds.includes(friend._id);

                return (
                  <Box
                    key={f.friendshipId || friend._id}
                    onClick={() => handleStartChat(friend)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 1,
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      mb: 0.5,
                      "&:hover": {
                        bgcolor: "#eff6ff",
                      },
                    }}
                  >
                    <OnlineBadge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      isonline={isOnline ? "true" : "false"}
                    >
                      <Avatar
                        src={friend.avatar || ""}
                        sx={{ width: 38, height: 38, bgcolor: "#3b82f6", fontWeight: 700 }}
                      >
                        {(friend.name || "U")[0].toUpperCase()}
                      </Avatar>
                    </OnlineBadge>

                    <Box sx={{ ml: 1.5, flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: 600, color: "#1e293b", fontSize: "0.85rem" }}
                      >
                        {friend.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        noWrap
                        sx={{
                          color: isOnline ? "#22c55e" : "#94a3b8",
                          display: "block",
                          fontSize: "0.75rem",
                          fontWeight: isOnline ? 600 : 400,
                        }}
                      >
                        {isOnline ? "Đang hoạt động" : "Offline"}
                      </Typography>
                    </Box>

                    <Tooltip title="Nhắn tin">
                      <IconButton
                        size="small"
                        sx={{ color: "#3b82f6" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChat(friend);
                        }}
                      >
                        <MessageSquare size={16} />
                      </IconButton>
                    </Tooltip>
                  </Box>
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
              placeholder="Nhập tên hoặc email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  bgcolor: "#f8fafc",
                  fontSize: "0.85rem",
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={15} color="#3b82f6" />
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

          <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5, position: "relative" }}>
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
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "1px solid #bfdbfe",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Compass size={20} color="#2563eb" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.82rem" }}>
                        Tìm bạn bè quanh đây
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#475569", fontSize: "0.72rem", display: "block" }}>
                        {userLocation ? "Đã định vị vị trí hiện tại của bạn" : "Ưu tiên người ở gần, có bạn chung & uy tín"}
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
                      bgcolor: "#2563eb",
                      boxShadow: "none",
                      "&:hover": { bgcolor: "#1d4ed8" },
                    }}
                  >
                    {isLocating ? "Đang định vị..." : (userLocation ? "Cập nhật lại vị trí" : "Bật định vị & Gợi ý quanh đây")}
                  </Button>
                </Box>

                {/* Tiêu đề danh sách gợi ý */}
                <Box sx={{ mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Sparkles size={16} color="#3b82f6" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}>
                      Những người bạn có thể biết
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                    {recommendations.length} gợi ý
                  </Typography>
                </Box>

                {isLoadingRecommendations && (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={22} />
                  </Box>
                )}

                {!isLoadingRecommendations && recommendations.length === 0 && (
                  <Box sx={{ textAlign: "center", py: 3, px: 2 }}>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      Chưa có gợi ý nào mới. Hãy thử bật định vị hoặc tìm kiếm theo tên!
                    </Typography>
                  </Box>
                )}

                {!isLoadingRecommendations &&
                  recommendations.map((rec) => (
                    <Box
                      key={rec._id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1.2,
                        borderRadius: "10px",
                        bgcolor: "#ffffff",
                        mb: 1,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: "#93c5fd",
                          bgcolor: "#f8fafc",
                        },
                      }}
                    >
                      <Avatar
                        src={rec.avatar || ""}
                        sx={{ width: 40, height: 40, bgcolor: "#3b82f6", fontWeight: 700 }}
                      >
                        {(rec.name || "U")[0].toUpperCase()}
                      </Avatar>

                      <Box sx={{ ml: 1.2, flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}
                        >
                          {rec.name}
                        </Typography>

                        {/* Badge lý do / bạn chung / khoảng cách */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.3 }}>
                          {rec.mutualFriendsCount > 0 && (
                            <Chip
                              size="small"
                              icon={<Users size={11} />}
                              label={`${rec.mutualFriendsCount} bạn chung`}
                              sx={{
                                height: 18,
                                fontSize: "0.68rem",
                                bgcolor: "#eff6ff",
                                color: "#2563eb",
                                "& .MuiChip-icon": { color: "#2563eb" },
                              }}
                            />
                          )}

                          {rec.distanceKm !== undefined && (
                            <Chip
                              size="small"
                              icon={<MapPin size={11} />}
                              label={
                                rec.distanceKm < 1
                                  ? `${Math.round(rec.distanceKm * 1000)}m`
                                  : `${rec.distanceKm.toFixed(1)} km`
                              }
                              sx={{
                                height: 18,
                                fontSize: "0.68rem",
                                bgcolor: "#ecfdf5",
                                color: "#059669",
                                "& .MuiChip-icon": { color: "#059669" },
                              }}
                            />
                          )}

                          {rec.mutualFriendsCount === 0 && rec.distanceKm === undefined && rec.friendsCount >= 5 && (
                            <Chip
                              size="small"
                              icon={<ShieldCheck size={11} />}
                              label="Tài khoản uy tín"
                              sx={{
                                height: 18,
                                fontSize: "0.68rem",
                                bgcolor: "#f1f5f9",
                                color: "#475569",
                                "& .MuiChip-icon": { color: "#475569" },
                              }}
                            />
                          )}
                        </Box>
                      </Box>

                      {/* Hành động */}
                      <Box sx={{ ml: 0.5 }}>
                        {rec.relationStatus === "none" && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSendRequest(rec._id)}
                            startIcon={<UserPlus size={13} />}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.74rem",
                              py: 0.4,
                              px: 1,
                              borderRadius: "8px",
                              boxShadow: "none",
                            }}
                          >
                            Kết bạn
                          </Button>
                        )}

                        {rec.relationStatus === "pending_sent" && (
                          <Tooltip title="Nhấp để hủy lời mời">
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              onClick={() => handleCancelRequest(rec.requestId)}
                              startIcon={<Clock size={13} />}
                              sx={{
                                textTransform: "none",
                                fontSize: "0.72rem",
                                py: 0.4,
                                px: 0.8,
                                borderRadius: "8px",
                                color: "#64748b",
                              }}
                            >
                              Đã gửi
                            </Button>
                          </Tooltip>
                        )}

                        {rec.relationStatus === "friends" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => handleStartChat(rec as any)}
                            startIcon={<MessageSquare size={13} />}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.74rem",
                              py: 0.4,
                              px: 0.8,
                              borderRadius: "8px",
                            }}
                          >
                            Nhắn tin
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
                <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                  Đang tìm kiếm người dùng...
                </Typography>
              </Box>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                  Không tìm thấy người dùng nào phù hợp với &quot;{searchQuery}&quot;
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
                  bgcolor: "#f8fafc",
                  mb: 1,
                  border: "1px solid #e2e8f0",
                }}
              >
                <Avatar
                  src={user.avatar || ""}
                  sx={{ width: 38, height: 38, bgcolor: "#3b82f6", fontWeight: 700 }}
                >
                  {(user.name || "U")[0].toUpperCase()}
                </Avatar>

                <Box sx={{ ml: 1.2, flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem" }}
                  >
                    {user.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ color: "#64748b", display: "block", fontSize: "0.72rem" }}
                  >
                    {user.email}
                  </Typography>
                </Box>

                {/* Quan hệ & Hành động */}
                <Box sx={{ ml: 0.5 }}>
                  {user.relationStatus === "none" && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleSendRequest(user._id)}
                      startIcon={<UserPlus size={13} />}
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        py: 0.4,
                        px: 1,
                        borderRadius: "8px",
                      }}
                    >
                      Kết bạn
                    </Button>
                  )}

                  {user.relationStatus === "pending_sent" && (
                    <Tooltip title="Nhấp để hủy lời mời">
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
                          color: "#64748b",
                        }}
                      >
                        Đã gửi
                      </Button>
                    </Tooltip>
                  )}

                  {user.relationStatus === "pending_received" && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleRespond(user.requestId || "", "accept")}
                        sx={{ bgcolor: "#eff6ff", p: 0.5 }}
                      >
                        <Check size={14} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRespond(user.requestId || "", "reject")}
                        sx={{ bgcolor: "#fef2f2", p: 0.5 }}
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
                      Nhắn tin
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
