"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  List,
  ListItemButton,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { MessageSquare, Search, ShieldAlert } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import { useLanguageStore } from "@/i18n/useLanguageStore";
import { useTranslation } from "@/i18n/useTranslation";
import { ConversationItem, useChatStore } from "@/store/useChatStore";
import { AURA_BOT_USER, isAuraBot } from "@/constants/auraBot";
import { isVideoUrl } from "@/services/postsApi";
import { formatConversationTime } from "@/utils/formatTime";

function formatLastMessagePreview(rawText?: string, isDeleted?: boolean): string {
  const isEn = useLanguageStore.getState().language === "en";
  if (isDeleted) return isEn ? "Message unsent" : "Tin nhắn đã bị thu hồi";
  const trimmed = rawText?.trim() || "";
  if (!trimmed) return "";
  if (/^https:\/\/res\.cloudinary\.com\//i.test(trimmed)) {
    if (isVideoUrl(trimmed)) {
      return isEn ? "🎬 Sent a video" : "🎬 Đã gửi một video";
    }
    return isEn ? "📷 Sent a photo" : "📷 Đã gửi một hình ảnh";
  }
  return trimmed;
}

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
  const { tr } = useTranslation();
  return (
    <Box aria-busy="true" aria-label={tr("Đang tải hội thoại", "Loading conversations")} sx={{ p: 1 }}>
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
  const { tr } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "restricted">("all");

  const restrictedCount = useMemo(() => {
    if (!currentUserId) return 0;
    return conversations.filter((c) => c.restrictedBy?.includes(currentUserId)).length;
  }, [conversations, currentUserId]);

  const hasAuraInConversations = useMemo(() => {
    return conversations.some((c) => c.participants?.some((p) => isAuraBot(p?._id || p?.id)));
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "restricted") {
      list = list.filter((c) => currentUserId && c.restrictedBy?.includes(currentUserId));
    } else {
      // Ẩn người bị hạn chế khỏi hộp thư chính (giống Facebook)
      list = list.filter((c) => !currentUserId || !c.restrictedBy?.includes(currentUserId));
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const other = c.participants.find((u) => u._id !== currentUserId);
      return other?.name.toLowerCase().includes(q);
    });
  }, [conversations, filter, query, currentUserId]);

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          type="search"
          placeholder={tr("Tìm kiếm hội thoại…", "Search conversations…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { "aria-label": tr("Tìm kiếm hội thoại", "Search conversations") },
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

      {/* Bộ lọc Hộp thư / Bị hạn chế */}
      <Box sx={{ px: 2, pb: 1, display: "flex", gap: 1 }}>
        <Chip
          label={tr("Hộp thư", "Inbox")}
          size="small"
          clickable
          color={filter === "all" ? "primary" : "default"}
          variant={filter === "all" ? "filled" : "outlined"}
          onClick={() => setFilter("all")}
        />
        <Chip
          label={
            restrictedCount > 0
              ? tr(`Bị hạn chế (${restrictedCount})`, `Restricted (${restrictedCount})`)
              : tr("Bị hạn chế", "Restricted")
          }
          size="small"
          clickable
          color={filter === "restricted" ? "primary" : "default"}
          variant={filter === "restricted" ? "filled" : "outlined"}
          onClick={() => setFilter("restricted")}
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
              title={tr("Không tìm thấy hội thoại", "No conversations found")}
              description={tr(`Không có kết quả nào khớp với “${query.trim()}”.`, `No results matched “${query.trim()}”.`)}
            />
          ) : filter === "restricted" ? (
            <EmptyState
              compact
              icon={<ShieldAlert size={26} />}
              title={tr("Không có đoạn chat bị hạn chế", "No restricted chats")}
              description={tr(
                "Khi bạn hạn chế ai đó, họ sẽ không biết khi nào bạn online hoặc đã đọc tin nhắn của họ.",
                "When you restrict someone, they won't see when you're online or when you've read their messages."
              )}
            />
          ) : (
            <EmptyState
              compact
              icon={<MessageSquare size={26} />}
              title={tr("Chưa có cuộc trò chuyện nào", "No conversations yet")}
              description={tr("Chọn một người bạn để bắt đầu nhắn tin.", "Select a friend to start chatting.")}
              action={
                <Button variant="contained" size="small" onClick={onGoToFriends}>
                  {tr("Mở danh sách bạn bè", "Open friends list")}
                </Button>
              }
            />
          )
        ) : (
          <List disablePadding aria-label={tr("Danh sách hội thoại", "Conversations list")}>
            {/* Mục Aura AI ghim cố định nếu người dùng chưa bắt đầu hội thoại */}
            {filter === "all" &&
              !hasAuraInConversations &&
              (!query.trim() || "aura ai".includes(query.trim().toLowerCase())) && (
                <ListItemButton
                  onClick={async () => {
                    try {
                      const conv = await useChatStore.getState().startConversationWithUser(AURA_BOT_USER);
                      if (conv) onSelect(conv);
                    } catch (e) {
                      console.error("Lỗi mở chat Aura AI:", e);
                    }
                  }}
                  sx={{
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    mb: 0.75,
                    alignItems: "center",
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "all 0.15s ease",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  <PresenceAvatar name="Aura AI" src="/assets/avatars/aura-bot.svg" online={true} size={48} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
                          Aura AI
                        </Typography>
                        <VerifiedBadge size={14} />
                      </Box>
                      <Chip
                        label="AI"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          borderRadius: "6px",
                        }}
                      />
                    </Box>
                    <Typography variant="body2" noWrap sx={{ color: "text.secondary", fontSize: "0.825rem", mt: 0.25 }}>
                      {tr("Trợ lý AI thông minh (Llama 3.3) • Nhắn ngay", "Smart AI Assistant (Llama 3.3) • Chat now")}
                    </Typography>
                  </Box>
                </ListItemButton>
              )}

            {filtered.map((item) => {
              const other =
                item.participants.find((p) => p._id !== currentUserId) || item.participants[0];
              const isOtherAura = isAuraBot(other?._id || other?.id);
              const isActive = activeConversationId === item._id;
              const isRestricted = Boolean(currentUserId && item.restrictedBy?.includes(currentUserId));
              const isOnline = isOtherAura || (!isRestricted && other?._id ? onlineUserIds.includes(other._id) : false);
              const unreadCount = item.unreadCounts?.[currentUserId || ""] || 0;
              const lastText = formatLastMessagePreview(
                item.lastMessage?.text,
                item.lastMessage?.isDeleted
              );
              const sentByMe = item.lastMessage?.senderId === currentUserId;

              return (
                <ListItemButton
                  key={item._id}
                  selected={isActive}
                  onClick={() => onSelect(item)}
                  aria-current={isActive ? "true" : undefined}
                  sx={{ gap: 1.5, px: 1.5, py: 1.25, mb: 0.25, alignItems: "center" }}
                >
                  <PresenceAvatar
                    name={isOtherAura ? "Aura AI" : other?.name}
                    src={isOtherAura ? "/assets/avatars/aura-bot.svg" : other?.avatar}
                    online={isOnline}
                    size={48}
                  />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          noWrap
                          sx={{ fontWeight: unreadCount > 0 || isActive ? 700 : 600 }}
                        >
                          {other?.name || tr("Người dùng", "User")}
                        </Typography>
                        {isOtherAura && <VerifiedBadge size={14} />}
                      </Box>
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
                        {lastText
                          ? `${sentByMe ? `${tr("Bạn", "You")}: ` : ""}${lastText}`
                          : tr("Bắt đầu cuộc trò chuyện…", "Start a conversation…")}
                      </Typography>

                      {unreadCount > 0 && (
                        <Box
                          component="span"
                          aria-label={tr(`${unreadCount} tin nhắn chưa đọc`, `${unreadCount} unread messages`)}
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
