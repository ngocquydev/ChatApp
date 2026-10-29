"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Compass, MapPin, Search, Sparkles, UserCheck, UserPlus, Users, X } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ExploreUserCard, { ExploreCardData } from "@/components/explore/ExploreUserCard";
import { buildExploreItems } from "@/components/explore/exploreHelpers";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { ChatUser, useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { APP_BAR_HEIGHT, v } from "@/theme/tokens";

export default function Explore() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ text: string; severity: "success" | "info" | "warning" } | null>(null);

  const {
    friends,
    receivedRequests,
    sentRequests,
    recommendations,
    searchResults,
    isLoadingFriends,
    isLoadingRequests,
    isLoadingRecommendations,
    isSearching,
    isLocating,
    userLocation,
    fetchFriends,
    fetchRequests,
    fetchRecommendations,
    updateLocation,
    searchUsers,
    clearSearchResults,
    sendFriendRequest,
    cancelRequest,
    respondToRequest,
  } = useFriendStore();

  const { onlineUserIds, startConversationWithUser } = useChatStore();
  const { openChat } = useChatBoxStore();

  useEffect(() => {
    void fetchRecommendations();
    void fetchRequests();
    void fetchFriends();
  }, [fetchRecommendations, fetchRequests, fetchFriends]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      clearSearchResults();
      return;
    }
    const timer = setTimeout(() => void searchUsers(trimmed, { limit: 24 }), 300);
    return () => clearTimeout(timer);
  }, [query, searchUsers, clearSearchResults]);

  const handleRequestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setToast({ text: "Trình duyệt của bạn không hỗ trợ định vị vị trí.", severity: "warning" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = await updateLocation(pos.coords.latitude, pos.coords.longitude);
        setToast({
          text: ok ? "Đã cập nhật vị trí và làm mới gợi ý quanh đây." : "Không thể cập nhật vị trí lúc này.",
          severity: ok ? "success" : "warning",
        });
      },
      () => {
        setToast({ text: "Không lấy được vị trí hiện tại. Đang hiển thị gợi ý mặc định.", severity: "info" });
        void fetchRecommendations();
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const handleMessage = async (card: ExploreCardData) => {
    const target: ChatUser = { _id: card.id, name: card.name, avatar: card.avatar, bio: card.bio };
    if (typeof window !== "undefined" && window.innerWidth < 600) {
      await startConversationWithUser(target);
      router.push("/chat");
    } else {
      openChat(target);
    }
  };

  const isSearchingMode = query.trim().length > 0;
  const isBusy =
    isSearching ||
    (!isSearchingMode &&
      ((tab === 0 && isLoadingRecommendations) ||
        (tab === 1 && isLoadingRequests) ||
        (tab === 2 && isLoadingFriends)));

  const activeItems = useMemo(
    () =>
      buildExploreItems({
        isSearchingMode,
        tab,
        searchResults,
        recommendations,
        receivedRequests,
        sentRequests,
        friends,
        onlineUserIds,
      }),
    [isSearchingMode, tab, searchResults, recommendations, receivedRequests, sentRequests, friends, onlineUserIds],
  );

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: v.neutral[100], pt: `${APP_BAR_HEIGHT}px`, pb: 6 }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, sm: 3.5 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
            background: `linear-gradient(135deg, ${v.brand[50]} 0%, ${v.paper} 65%)`,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "stretch", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Compass size={22} color={v.brand[600]} aria-hidden />
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
                Khám phá bạn bè
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Tìm kiếm người quen, kết nối bạn bè quanh đây và quản lý lời mời kết bạn.
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={isLocating}
            onClick={handleRequestLocation}
            startIcon={isLocating ? <CircularProgress size={16} color="inherit" /> : <MapPin size={16} aria-hidden />}
            sx={{ borderRadius: "12px", py: 1, px: 2, alignSelf: { xs: "flex-start", md: "center" } }}
          >
            {isLocating ? "Đang định vị…" : userLocation ? "Cập nhật vị trí quanh đây" : "Tìm bạn bè quanh đây"}
          </Button>
        </Paper>

        <TextField
          fullWidth
          placeholder="Nhập tên hoặc email người dùng cần tìm…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2.5, "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: "12px" } }}
          slotProps={{
            htmlInput: { "aria-label": "Tìm kiếm người dùng trên hệ thống" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={v.brand[500]} aria-hidden />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="Xóa từ khóa tìm kiếm" onClick={() => setQuery("")}>
                    <X size={16} aria-hidden />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {!isSearchingMode && (
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Tab icon={<Sparkles size={16} aria-hidden />} iconPosition="start" label={`Gợi ý cho bạn (${recommendations.length})`} />
            <Tab
              icon={<UserPlus size={16} aria-hidden />}
              iconPosition="start"
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                  <span>Lời mời kết bạn</span>
                  {receivedRequests.length > 0 && (
                    <Chip label={receivedRequests.length} size="small" color="error" sx={{ height: 20, fontWeight: 700 }} />
                  )}
                </Box>
              }
            />
            <Tab icon={<Users size={16} aria-hidden />} iconPosition="start" label={`Bạn bè (${friends.length})`} />
          </Tabs>
        )}

        {isBusy ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} variant="rounded" height={96} sx={{ borderRadius: "16px" }} />
            ))}
          </Box>
        ) : activeItems.length === 0 ? (
          <EmptyState
            icon={isSearchingMode ? <Search size={24} /> : tab === 0 ? <Sparkles size={24} /> : tab === 1 ? <UserCheck size={24} /> : <Users size={24} />}
            title={
              isSearchingMode
                ? `Không tìm thấy “${query.trim()}”`
                : tab === 0
                  ? "Chưa có gợi ý kết bạn mới"
                  : tab === 1
                    ? "Không có lời mời kết bạn"
                    : "Chưa có bạn bè nào"
            }
            description={
              isSearchingMode
                ? "Hãy thử tìm bằng tên hiển thị khác hoặc kiểm tra lại chính tả."
                : tab === 0
                  ? "Hãy bật định vị quanh đây hoặc sử dụng ô tìm kiếm phía trên để kết nối với bạn bè."
                  : tab === 1
                    ? "Khi có người gửi lời mời kết bạn hoặc bạn gửi lời mời mới, danh sách sẽ hiển thị tại đây."
                    : "Hãy chuyển sang tab Gợi ý cho bạn để kết nối và trò chuyện cùng mọi người."
            }
          />
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            {activeItems.map((card) => (
              <ExploreUserCard
                key={`${card.id}-${card.requestId ?? card.relationStatus}`}
                user={card}
                onSendRequest={(id) => void sendFriendRequest(id)}
                onCancelRequest={(reqId) => reqId && void cancelRequest(reqId)}
                onRespondRequest={(reqId, action) => void respondToRequest(reqId, action)}
                onMessage={(c) => void handleMessage(c)}
              />
            ))}
          </Box>
        )}
      </Container>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ borderRadius: "12px" }}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
