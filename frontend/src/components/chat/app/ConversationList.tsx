"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  InputAdornment,
  List,
  ListItemButton,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { MessageSquare, Search } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { ConversationItem } from "@/store/useChatStore";
import { formatConversationTime } from "@/utils/formatTime";

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId?: string;
  currentUserId?: string;
  onlineUserIds: string[];
  isLoading: boolean;
  onSelect: (conversation: ConversationItem) => void;
  onGoToFriends: () => void;
}

function ConversationSkeleton() {
  return (
    <Box aria-busy="true" aria-label="Đang tải hội thoại" sx={{ p: 1 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="85%" height={14} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default function ConversationList({
  conversations,
  activeConversationId,
  currentUserId,
  onlineUserIds,
  isLoading,
  onSelect,
  onGoToFriends,
}: ConversationListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const other = c.participants.find((u) => u._id !== currentUserId);
      return other?.name.toLowerCase().includes(q);
    });
  }, [conversations, query, currentUserId]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          type="search"
          placeholder="Tìm kiếm hội thoại…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": "Tìm kiếm hội thoại" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} aria-hidden />
                </InputAdornment>
              ),
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.default" } }}
        />
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1 }}>
        {isLoading && conversations.length === 0 ? (
          <ConversationSkeleton />
        ) : filtered.length === 0 ? (
          query.trim() ? (
            <EmptyState
              compact
              icon={<Search size={26} />}
              title="Không tìm thấy hội thoại"
              description={`Không có kết quả nào khớp với “${query.trim()}”.`}
            />
          ) : (
            <EmptyState
              compact
              icon={<MessageSquare size={26} />}
              title="Chưa có cuộc trò chuyện nào"
              description="Chọn một người bạn để bắt đầu nhắn tin."
              action={
                <Button variant="contained" size="small" onClick={onGoToFriends}>
                  Mở danh sách bạn bè
                </Button>
              }
            />
          )
        ) : (
          <List disablePadding aria-label="Danh sách hội thoại">
            {filtered.map((item) => {
              const other =
                item.participants.find((p) => p._id !== currentUserId) || item.participants[0];
              const isActive = activeConversationId === item._id;
              const isOnline = other?._id ? onlineUserIds.includes(other._id) : false;
              const unreadCount = item.unreadCounts?.[currentUserId || ""] || 0;
              const lastText = item.lastMessage?.text;
              const sentByMe = item.lastMessage?.senderId === currentUserId;

              return (
                <ListItemButton
                  key={item._id}
                  selected={isActive}
                  onClick={() => onSelect(item)}
                  aria-current={isActive ? "true" : undefined}
                  sx={{ gap: 1.5, px: 1.5, py: 1.25, mb: 0.25, alignItems: "center" }}
                >
                  <PresenceAvatar name={other?.name} src={other?.avatar} online={isOnline} size={48} />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                      <Typography
                        variant="subtitle2"
                        noWrap
                        sx={{ fontWeight: unreadCount > 0 || isActive ? 700 : 600 }}
                      >
                        {other?.name || "Người dùng"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          flexShrink: 0,
                          color: unreadCount > 0 ? "primary.main" : "text.secondary",
                          fontWeight: unreadCount > 0 ? 700 : 500,
                        }}
                      >
                        {formatConversationTime(item.lastMessage?.createdAt || item.updatedAt)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mt: 0.25 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          color: unreadCount > 0 ? "text.primary" : "text.secondary",
                          fontWeight: unreadCount > 0 ? 600 : 400,
                        }}
                      >
                        {lastText ? `${sentByMe ? "Bạn: " : ""}${lastText}` : "Bắt đầu cuộc trò chuyện…"}
                      </Typography>

                      {unreadCount > 0 && (
                        <Box
                          component="span"
                          aria-label={`${unreadCount} tin nhắn chưa đọc`}
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            borderRadius: 999,
                            minWidth: 20,
                            height: 20,
                            px: 0.75,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Box>
                      )}
                    </Box>
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
