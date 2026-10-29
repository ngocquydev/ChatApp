"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { Check, MessageSquare, UserPlus, UserX, Users, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { useTranslation } from "@/i18n/useTranslation";
import { ChatUser } from "@/store/useChatStore";
import { FriendItem, FriendRequestItem } from "@/store/useFriendStore";
import { NotifyFn } from "./types";

type ActionResult = { success: boolean; message: string };

interface FriendsPanelProps {
  friends: FriendItem[];
  receivedRequests: FriendRequestItem[];
  sentRequests: FriendRequestItem[];
  onlineUserIds: string[];
  isLoadingFriends: boolean;
  /** Tab con đang mở: 0 = Bạn bè, 1 = Lời mời */
  subTab: 0 | 1;
  onSubTabChange: (tab: 0 | 1) => void;
  onMessage: (friend: ChatUser) => void;
  onUnfriend: (friendId: string) => Promise<ActionResult>;
  onRespond: (requestId: string, action: "accept" | "reject") => Promise<ActionResult>;
  onCancel: (requestId: string) => Promise<ActionResult>;
  onAddFriend: () => void;
  notify: NotifyFn;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      component="h3"
      sx={{ display: "block", px: 1, pt: 1, pb: 0.5, color: "text.secondary", fontWeight: 700, lineHeight: 1.8 }}
    >
      {children}
    </Typography>
  );
}

export default function FriendsPanel({
  friends,
  receivedRequests,
  sentRequests,
  onlineUserIds,
  isLoadingFriends,
  subTab,
  onSubTabChange,
  onMessage,
  onUnfriend,
  onRespond,
  onCancel,
  onAddFriend,
  notify,
}: FriendsPanelProps) {
  const { tr } = useTranslation();
  const [pendingUnfriend, setPendingUnfriend] = useState<ChatUser | null>(null);
  const [isUnfriending, setIsUnfriending] = useState(false);

  const confirmUnfriend = async () => {
    if (!pendingUnfriend) return;
    setIsUnfriending(true);
    const res = await onUnfriend(pendingUnfriend._id);
    setIsUnfriending(false);
    setPendingUnfriend(null);
    notify(res.message, res.success ? "info" : "error");
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={subTab}
          onChange={(_, val: 0 | 1 | null) => val !== null && onSubTabChange(val)}
          aria-label={tr("Chế độ xem bạn bè", "Friends view mode")}
          sx={{
            bgcolor: "background.default",
            p: 0.5,
            borderRadius: 3,
            gap: 0.5,
            "& .MuiToggleButtonGroup-grouped": {
              border: 0,
              borderRadius: "8px !important",
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              py: 0.75,
              "&.Mui-selected": {
                bgcolor: "background.paper",
                color: "primary.main",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
              },
            },
          }}
        >
          <ToggleButton value={0}>{tr(`Bạn bè (${friends.length})`, `Friends (${friends.length})`)}</ToggleButton>
          <ToggleButton value={1}>{tr(`Lời mời (${receivedRequests.length})`, `Requests (${receivedRequests.length})`)}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1 }}>
        {subTab === 0 &&
          (isLoadingFriends && friends.length === 0 ? (
            <Box aria-busy="true" aria-label={tr("Đang tải danh sách bạn bè", "Loading friends list")} sx={{ p: 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="50%" height={18} />
                    <Skeleton width="30%" height={14} />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : friends.length === 0 ? (
            <EmptyState
              compact
              icon={<Users size={26} />}
              title={tr("Bạn chưa có bạn bè nào", "You have no friends yet")}
              description={tr("Tìm kiếm và gửi lời mời kết bạn để bắt đầu trò chuyện.", "Search and send friend requests to start chatting.")}
              action={
                <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} onClick={onAddFriend}>
                  {tr("Tìm bạn mới", "Find new friends")}
                </Button>
              }
            />
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label={tr("Danh sách bạn bè", "Friends list")}>
              {friends.map((item) => {
                const f = item.friend;
                const isOnline = onlineUserIds.includes(f._id);
                return (
                  <Box
                    component="li"
                    key={item.friendshipId}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      p: 1.25,
                      borderRadius: 3,
                      transition: "background-color 120ms",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                      <PresenceAvatar name={f.name} src={f.avatar} online={isOnline} size={44} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {f.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ display: "block", color: isOnline ? "success.main" : "text.secondary", fontWeight: 500 }}
                        >
                          {isOnline ? tr("Đang hoạt động", "Online") : tr("Ngoại tuyến", "Offline")}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onMessage(f)}
                        startIcon={<MessageSquare size={14} />}
                        aria-label={tr(`Nhắn tin cho ${f.name}`, `Message ${f.name}`)}
                        sx={{ px: 1.5 }}
                      >
                        {tr("Nhắn tin", "Message")}
                      </Button>
                      <Tooltip title={tr("Hủy kết bạn", "Unfriend")}>
                        <IconButton
                          size="small"
                          onClick={() => setPendingUnfriend(f)}
                          aria-label={tr(`Hủy kết bạn với ${f.name}`, `Unfriend ${f.name}`)}
                          sx={{ color: "text.secondary", "&:hover": { color: "error.main", bgcolor: "action.hover" } }}
                        >
                          <UserX size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}

        {subTab === 1 && (
          <Box>
            <SectionLabel>{tr(`Đã nhận (${receivedRequests.length})`, `Received (${receivedRequests.length})`)}</SectionLabel>
            {receivedRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 2 }}>
                {tr("Không có lời mời nào đang chờ duyệt.", "No pending friend requests.")}
              </Typography>
            ) : (
              receivedRequests.map((req) => {
                const requester = req.requesterId;
                if (!requester) return null;
                return (
                  <Box
                    key={req._id}
                    sx={{ p: 1.5, mb: 1, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.25 }}>
                      <PresenceAvatar name={requester.name} src={requester.avatar} size={40} hidePresence />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {requester.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {requester.bio || tr("Thành viên", "Member")}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<Check size={14} />}
                        onClick={async () => {
                          const res = await onRespond(req._id, "accept");
                          notify(res.message, res.success ? "success" : "error");
                        }}
                      >
                        {tr("Chấp nhận", "Accept")}
                      </Button>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<X size={14} />}
                        onClick={async () => {
                          const res = await onRespond(req._id, "reject");
                          notify(res.message, "info");
                        }}
                        sx={{ borderColor: "divider", color: "text.secondary" }}
                      >
                        {tr("Từ chối", "Decline")}
                      </Button>
                    </Box>
                  </Box>
                );
              })
            )}

            <SectionLabel>{tr(`Đã gửi (${sentRequests.length})`, `Sent (${sentRequests.length})`)}</SectionLabel>
            {sentRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                {tr("Bạn chưa gửi lời mời kết bạn nào.", "You haven't sent any friend requests.")}
              </Typography>
            ) : (
              sentRequests.map((req) => {
                const recipient = req.recipientId;
                if (!recipient) return null;
                return (
                  <Box
                    key={req._id}
                    sx={{
                      p: 1.25,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      borderRadius: 3,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                      <PresenceAvatar name={recipient.name} src={recipient.avatar} size={36} hidePresence />
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {recipient.name}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={async () => {
                        const res = await onCancel(req._id);
                        notify(res.message, "info");
                      }}
                    >
                      {tr("Hủy lời mời", "Cancel request")}
                    </Button>
                  </Box>
                );
              })
            )}
          </Box>
        )}
      </Box>

      {/* Hộp thoại xác nhận thay cho window.confirm — truy cập được bằng bàn phím và đúng giao diện */}
      <Dialog
        open={Boolean(pendingUnfriend)}
        onClose={() => !isUnfriending && setPendingUnfriend(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="unfriend-title"
        aria-describedby="unfriend-desc"
      >
        <DialogTitle id="unfriend-title">{tr("Hủy kết bạn?", "Unfriend?")}</DialogTitle>
        <DialogContent>
          <DialogContentText id="unfriend-desc">
            {tr("Bạn sẽ không còn là bạn bè với ", "You will no longer be friends with ")}
            <strong>{pendingUnfriend?.name}</strong>
            {tr(". Bạn có thể kết bạn lại bất cứ lúc nào.", ". You can add them back anytime.")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPendingUnfriend(null)} disabled={isUnfriending} sx={{ color: "text.secondary" }}>
            {tr("Giữ lại", "Cancel")}
          </Button>
          <Button color="error" variant="contained" onClick={confirmUnfriend} disabled={isUnfriending}>
            {tr("Hủy kết bạn", "Unfriend")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
