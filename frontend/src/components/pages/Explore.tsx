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
import { useTranslation } from "@/i18n/useTranslation";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { ChatUser, useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { APP_BAR_HEIGHT, v } from "@/theme/tokens";
import LeftSidebar from "@/components/layout/LeftSidebar";

const EXPLORE_TAB_STORAGE_KEY = "chatapp:explore_tab";

function readStoredExploreTab(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(EXPLORE_TAB_STORAGE_KEY);
    if (raw !== null) {
      const val = Number(raw);
      if (val >= 0 && val <= 2) return val;
    }
  } catch {
    // Bỏ qua lỗi storage
  }
  return 0;
}

export default function Explore() {
  const router = useRouter();
  const { tr, language } = useTranslation();
  const [tab, setTab] = useState<number>(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ text: string; severity: "success" | "info" | "warning" } | null>(null);

  useEffect(() => {
    const stored = readStoredExploreTab();
    setTab((prev) => (prev !== stored ? stored : prev));
  }, []);

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
      setToast({
        text: tr("Trình duyệt của bạn không hỗ trợ định vị vị trí.", "Your browser does not support geolocation."),
        severity: "warning",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const ok = await updateLocation(pos.coords.latitude, pos.coords.longitude);
        setToast({
          text: ok
            ? tr("Đã cập nhật vị trí và làm mới gợi ý quanh đây.", "Location updated and nearby suggestions refreshed.")
            : tr("Không thể cập nhật vị trí lúc này.", "Could not update location right now."),
          severity: ok ? "success" : "warning",
        });
      },
      () => {
        setToast({
          text: tr("Không lấy được vị trí hiện tại. Đang hiển thị gợi ý mặc định.", "Could not get current location. Showing default suggestions."),
          severity: "info",
        });
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
        language,
      }),
    [isSearchingMode, tab, searchResults, recommendations, receivedRequests, sentRequests, friends, onlineUserIds, language],
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: v.neutral[100],
        pt: { xs: "78px", sm: "84px", md: "88px" },
      }}
    >
      <LeftSidebar />
      <Box
        sx={{
          flex: 1,
          ml: { md: "280px", lg: "320px", xl: "350px" },
          p: { xs: 2, sm: 3 },
          minWidth: 0,
          pb: 6,
        }}
      >
        <Container maxWidth="lg" sx={{ pt: { xs: 1, sm: 2 } }}>
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
                {tr("Khám phá bạn bè", "Explore Friends")}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {tr(
                "Tìm kiếm người quen, kết nối bạn bè quanh đây và quản lý lời mời kết bạn.",
                "Find people you know, connect with friends nearby, and manage friend requests."
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={isLocating}
            onClick={handleRequestLocation}
            startIcon={isLocating ? <CircularProgress size={16} color="inherit" /> : <MapPin size={16} aria-hidden />}
            sx={{ borderRadius: "12px", py: 1, px: 2, alignSelf: { xs: "flex-start", md: "center" } }}
          >
            {isLocating
              ? tr("Đang định vị…", "Locating…")
              : userLocation
                ? tr("Cập nhật vị trí quanh đây", "Update nearby location")
                : tr("Tìm bạn bè quanh đây", "Find friends nearby")}
          </Button>
        </Paper>

        <TextField
          fullWidth
          placeholder={tr("Nhập tên hoặc email người dùng cần tìm…", "Enter name or email to search…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ mb: 2.5, "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: "12px" } }}
          slotProps={{
            htmlInput: { "aria-label": tr("Tìm kiếm người dùng trên hệ thống", "Search users on the platform") },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color={v.brand[500]} aria-hidden />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label={tr("Xóa từ khóa tìm kiếm", "Clear search query")} onClick={() => setQuery("")}>
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
            onChange={(_, next) => {
              setTab(next);
              try {
                localStorage.setItem(EXPLORE_TAB_STORAGE_KEY, String(next));
              } catch {
                // Bỏ qua lỗi storage
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Tab
              icon={<Sparkles size={16} aria-hidden />}
              iconPosition="start"
              label={tr(`Gợi ý cho bạn (${recommendations.length})`, `Suggestions for you (${recommendations.length})`)}
            />
            <Tab
              icon={<UserPlus size={16} aria-hidden />}
              iconPosition="start"
              label={
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                  <span>{tr("Lời mời kết bạn", "Friend Requests")}</span>
                  {receivedRequests.length > 0 && (
                    <Chip label={receivedRequests.length} size="small" color="error" sx={{ height: 20, fontWeight: 700 }} />
                  )}
                </Box>
              }
            />
            <Tab
              icon={<Users size={16} aria-hidden />}
              iconPosition="start"
              label={tr(`Bạn bè (${friends.length})`, `Friends (${friends.length})`)}
            />
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
                ? tr(`Không tìm thấy “${query.trim()}”`, `No results for “${query.trim()}”`)
                : tab === 0
                  ? tr("Chưa có gợi ý kết bạn mới", "No new friend suggestions")
                  : tab === 1
                    ? tr("Không có lời mời kết bạn", "No friend requests")
                    : tr("Chưa có bạn bè nào", "No friends yet")
            }
            description={
              isSearchingMode
                ? tr("Hãy thử tìm bằng tên hiển thị khác hoặc kiểm tra lại chính tả.", "Try searching with a different display name or check your spelling.")
                : tab === 0
                  ? tr("Hãy bật định vị quanh đây hoặc sử dụng ô tìm kiếm phía trên để kết nối với bạn bè.", "Enable nearby location or use the search box above to connect with friends.")
                  : tab === 1
                    ? tr("Khi có người gửi lời mời kết bạn hoặc bạn gửi lời mời mới, danh sách sẽ hiển thị tại đây.", "When someone sends you a friend request or you send a new one, it will appear here.")
                    : tr("Hãy chuyển sang tab Gợi ý cho bạn để kết nối và trò chuyện cùng mọi người.", "Switch to the Suggestions tab to connect and chat with people.")
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
      </Box>

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
