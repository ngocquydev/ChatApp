"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, Chip, IconButton, Snackbar, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import { Circle, MessageSquare, UserPlus, Users } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSoundStore } from "@/store/useSoundStore";
import { ChatUser, useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";
import { APP_BAR_HEIGHT, colors, v } from "@/theme/tokens";
import EmptyState from "@/components/common/EmptyState";
import ConversationList from "@/components/chat/app/ConversationList";
import FriendsPanel from "@/components/chat/app/FriendsPanel";
import AddFriendDialog from "@/components/chat/app/AddFriendDialog";
import ChatHeader from "@/components/chat/app/ChatHeader";
import MessageList from "@/components/chat/app/MessageList";
import MessageComposer from "@/components/chat/app/MessageComposer";
import { NotifyType } from "@/components/chat/app/types";

interface ToastState {
  open: boolean;
  message: string;
  type: NotifyType;
}

/**
 * Trang chat chính.
 * - Desktop/tablet (≥ sm): sidebar + khung chat cạnh nhau.
 * - Mobile (< sm): dạng master–detail — danh sách HOẶC khung chat, có nút quay lại.
 */
export default function ChatApp() {
  const { user } = useAuthStore();
  const { isMuted, toggleMute } = useSoundStore();
  const {
    connectSocket,
    disconnectSocket,
    fetchConversations,
    conversations,
    activeConversation,
    selectConversation,
    clearActiveConversation,
    startConversationWithUser,
    messages,
    sendMessage,
    sendTyping,
    onlineUserIds,
    typingMap,
    isLoadingConversations,
    isLoadingMessages,
    updateActiveConversationTheme,
    blockActiveConversation,
    unblockActiveConversation,
    restrictActiveConversation,
    deleteChatMessage,
  } = useChatStore();

  const {
    friends,
    receivedRequests,
    sentRequests,
    searchResults,
    isLoadingFriends,
    isSearching,
    fetchFriends,
    fetchRequests,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    cancelRequest,
    unfriend,
    clearSearchResults,
  } = useFriendStore();

  // Sidebar: 0 = Hội thoại, 1 = Bạn bè
  const [sidebarTab, setSidebarTab] = useState<0 | 1>(0);
  // Tab con trong Bạn bè: 0 = Danh sách, 1 = Lời mời
  const [friendsSubTab, setFriendsSubTab] = useState<0 | 1>(0);
  const [openAddFriend, setOpenAddFriend] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const showToast = useCallback((message: string, type: NotifyType = "info") => {
    setToast({ open: true, message, type });
  }, []);

  const currentUserId = (user?._id || user?.id)?.toString();

  // Kết nối realtime và tải dữ liệu ban đầu (thông báo bạn bè do FriendNoticeToast toàn cục xử lý)
  useEffect(() => {
    connectSocket();
    fetchConversations();
    fetchFriends();
    fetchRequests();

    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, fetchConversations, fetchFriends, fetchRequests]);

  const partner = useMemo<ChatUser | null>(() => {
    if (!activeConversation) return null;
    return (
      activeConversation.participants.find((p) => p._id !== currentUserId) ||
      activeConversation.participants[0] ||
      null
    );
  }, [activeConversation, currentUserId]);

  const blockedBy = activeConversation?.blockedBy;
  const isBlockedByMe = Boolean(blockedBy && currentUserId && blockedBy === currentUserId);
  const isBlockedByPartner = Boolean(blockedBy && currentUserId && blockedBy !== currentUserId);
  const isBlocked = Boolean(blockedBy);
  const isRestricted = Boolean(
    currentUserId && activeConversation?.restrictedBy?.includes(currentUserId)
  );

  const isPartnerOnline =
    !isRestricted && partner?._id ? onlineUserIds.includes(partner._id) : false;
  const isPartnerTyping = activeConversation ? Boolean(typingMap[activeConversation._id]) : false;

  const openChatWith = async (friend: ChatUser) => {
    await startConversationWithUser(friend);
    setSidebarTab(0);
  };

  const hasActive = Boolean(activeConversation);

  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        bgcolor: "background.default",
        overflow: "hidden",
        pt: `${APP_BAR_HEIGHT}px`,
      }}
    >
      {/* ==================== SIDEBAR ==================== */}
      <Box
        component="aside"
        aria-label="Hội thoại và bạn bè"
        sx={{
          width: { xs: "100%", sm: 320, md: 380 },
          flexShrink: 0,
          // Mobile: ẩn sidebar khi đang xem một hội thoại
          display: { xs: hasActive ? "none" : "flex", sm: "flex" },
          flexDirection: "column",
          minHeight: 0,
          bgcolor: "background.paper",
          borderRight: { sm: "1px solid" },
          borderColor: "divider",
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
            Tin nhắn
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={`${onlineUserIds.length} online`}
              icon={<Circle size={8} color={colors.online} fill={colors.online} />}
              sx={{ bgcolor: v.tone("f0fdf4"), color: v.tone("166534"), fontSize: "0.72rem" }}
            />
            <Tooltip title="Tìm bạn mới">
              <IconButton
                onClick={() => {
                  clearSearchResults();
                  setOpenAddFriend(true);
                }}
                aria-label="Tìm bạn mới"
                sx={{ bgcolor: "action.selected", color: "primary.main", "&:hover": { bgcolor: "action.focus" } }}
              >
                <UserPlus size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Tabs
          value={sidebarTab}
          onChange={(_, val: 0 | 1) => setSidebarTab(val)}
          variant="fullWidth"
          aria-label="Chuyển đổi giữa hội thoại và bạn bè"
          sx={{ borderBottom: "1px solid", borderColor: "divider", minHeight: 44 }}
        >
          <Tab
            id="sidebar-tab-0"
            aria-controls="sidebar-panel-0"
            icon={<MessageSquare size={16} />}
            iconPosition="start"
            label="Hội thoại"
          />
          <Tab
            id="sidebar-tab-1"
            aria-controls="sidebar-panel-1"
            icon={
              <Badge
                badgeContent={receivedRequests.length}
                color="error"
                max={99}
                sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}
              >
                <Users size={16} />
              </Badge>
            }
            iconPosition="start"
            label="Bạn bè"
          />
        </Tabs>

        <Box
          role="tabpanel"
          id={`sidebar-panel-${sidebarTab}`}
          aria-labelledby={`sidebar-tab-${sidebarTab}`}
          sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          {sidebarTab === 0 ? (
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?._id}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              isLoading={isLoadingConversations}
              onSelect={selectConversation}
              onGoToFriends={() => setSidebarTab(1)}
            />
          ) : (
            <FriendsPanel
              friends={friends}
              receivedRequests={receivedRequests}
              sentRequests={sentRequests}
              onlineUserIds={onlineUserIds}
              isLoadingFriends={isLoadingFriends}
              subTab={friendsSubTab}
              onSubTabChange={setFriendsSubTab}
              onMessage={openChatWith}
              onUnfriend={unfriend}
              onRespond={respondToRequest}
              onCancel={cancelRequest}
              onAddFriend={() => setOpenAddFriend(true)}
              notify={showToast}
            />
          )}
        </Box>
      </Box>

      {/* ==================== KHUNG CHAT ==================== */}
      <Box
        component="section"
        aria-label="Khung trò chuyện"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: { xs: hasActive ? "flex" : "none", sm: "flex" },
          flexDirection: "column",
        }}
      >
        {!activeConversation ? (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
            <EmptyState
              icon={<MessageSquare size={28} />}
              title="Chọn một cuộc trò chuyện"
              description="Chọn hội thoại ở danh sách bên trái hoặc mở tab Bạn bè để bắt đầu nhắn tin theo thời gian thực."
            />
          </Box>
        ) : (
          <>
            <ChatHeader
              partner={partner}
              isOnline={isPartnerOnline}
              isTyping={isPartnerTyping}
              isMuted={isMuted}
              currentTheme={activeConversation.theme || "default"}
              isBlockedByMe={isBlockedByMe}
              isBlockedByPartner={isBlockedByPartner}
              isRestricted={isRestricted}
              onToggleMute={toggleMute}
              onBack={clearActiveConversation}
              onSelectTheme={async (themeId) => {
                await updateActiveConversationTheme(themeId);
                showToast("Đã thay đổi chủ đề đoạn chat", "success");
              }}
              onToggleBlock={async () => {
                if (isBlockedByMe) {
                  await unblockActiveConversation();
                  showToast("Đã bỏ chặn người dùng", "success");
                } else {
                  await blockActiveConversation();
                  showToast("Đã chặn người dùng", "success");
                }
              }}
              onToggleRestrict={async () => {
                const nextState = !isRestricted;
                await restrictActiveConversation(nextState);
                showToast(
                  nextState ? "Đã chuyển vào đoạn chat bị hạn chế" : "Đã bỏ hạn chế người dùng",
                  "success"
                );
              }}
            />
            <MessageList
              conversationId={activeConversation._id}
              messages={messages}
              currentUserId={currentUserId}
              partner={partner}
              isLoading={isLoadingMessages}
              isPartnerTyping={isPartnerTyping}
              theme={activeConversation.theme || "default"}
              onDeleteMessage={async (msgId) => {
                await deleteChatMessage(msgId);
                showToast("Đã thu hồi tin nhắn", "info");
              }}
            />
            <MessageComposer
              key={activeConversation._id}
              onSend={sendMessage}
              onTyping={sendTyping}
              isBlocked={isBlocked}
              isBlockedByMe={isBlockedByMe}
              onUnblock={async () => {
                await unblockActiveConversation();
                showToast("Đã bỏ chặn người dùng", "success");
              }}
            />
          </>
        )}
      </Box>

      <AddFriendDialog
        open={openAddFriend}
        onClose={() => {
          setOpenAddFriend(false);
          clearSearchResults();
        }}
        results={searchResults}
        isSearching={isSearching}
        onSearch={searchUsers}
        onClearResults={clearSearchResults}
        onMessage={async (u) => {
          await startConversationWithUser(u);
          setOpenAddFriend(false);
          setSidebarTab(0);
        }}
        onSendRequest={sendFriendRequest}
        onCancelRequest={cancelRequest}
        onRespond={respondToRequest}
        notify={showToast}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={(_, reason) => reason !== "clickaway" && setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast.type} variant="filled" onClose={() => setToast((prev) => ({ ...prev, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
