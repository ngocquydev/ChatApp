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
          aria-label="Chế độ xem bạn bè"
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
          <ToggleButton value={0}>Bạn bè ({friends.length})</ToggleButton>
          <ToggleButton value={1}>Lời mời ({receivedRequests.length})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1 }}>
        {subTab === 0 &&
          (isLoadingFriends && friends.length === 0 ? (
            <Box aria-busy="true" aria-label="Đang tải danh sách bạn bè" sx={{ p: 1 }}>
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
              title="Bạn chưa có bạn bè nào"
              description="Tìm kiếm và gửi lời mời kết bạn để bắt đầu trò chuyện."
              action={
                <Button variant="contained" size="small" startIcon={<UserPlus size={16} />} onClick={onAddFriend}>
                  Tìm bạn mới
                </Button>
              }
            />
          ) : (
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }} aria-label="Danh sách bạn bè">
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
                          {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onMessage(f)}
                        startIcon={<MessageSquare size={14} />}
                        aria-label={`Nhắn tin cho ${f.name}`}
                        sx={{ px: 1.5 }}
                      >
                        Nhắn tin
                      </Button>
                      <Tooltip title="Hủy kết bạn">
                        <IconButton
                          size="small"
                          onClick={() => setPendingUnfriend(f)}
                          aria-label={`Hủy kết bạn với ${f.name}`}
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
            <SectionLabel>Đã nhận ({receivedRequests.length})</SectionLabel>
            {receivedRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 2 }}>
                Không có lời mời nào đang chờ duyệt.
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
                          {requester.bio || "Thành viên"}
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
                        Chấp nhận
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
                        Từ chối
                      </Button>
                    </Box>
                  </Box>
                );
              })
            )}

            <SectionLabel>Đã gửi ({sentRequests.length})</SectionLabel>
            {sentRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                Bạn chưa gửi lời mời kết bạn nào.
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
                      Hủy lời mời
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
        <DialogTitle id="unfriend-title">Hủy kết bạn?</DialogTitle>
        <DialogContent>
          <DialogContentText id="unfriend-desc">
            Bạn sẽ không còn là bạn bè với <strong>{pendingUnfriend?.name}</strong>. Bạn có thể kết bạn lại bất cứ lúc nào.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPendingUnfriend(null)} disabled={isUnfriending} sx={{ color: "text.secondary" }}>
            Giữ lại
          </Button>
          <Button color="error" variant="contained" onClick={confirmUnfriend} disabled={isUnfriending}>
            Hủy kết bạn
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
