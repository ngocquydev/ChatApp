"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Button, ButtonBase, IconButton, InputAdornment, Popover, TextField, Tooltip, Typography } from "@mui/material";
import { Maximize2, MoreHorizontal, Search, SquarePen, X } from "lucide-react";
import api from "@/services/api";
import { useTranslation } from "@/i18n/useTranslation";
import { useChatBoxStore } from "@/store/useChatBoxStore";
import { ConversationItem, useChatStore } from "@/store/useChatStore";
import { useSoundStore } from "@/store/useSoundStore";
import { v } from "@/theme/tokens";
import RecentChatRow from "./RecentChatRow";
import RecentChatRowMenu from "./RecentChatRowMenu";
import RecentChatsHeaderMenu from "./RecentChatsHeaderMenu";

export default function RecentChatsPopover({ anchorEl, currentUserId, onClose }: { anchorEl: HTMLElement | null; currentUserId: string; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { conversations, onlineUserIds, selectConversation, fetchConversations } = useChatStore();
  const { openChat } = useChatBoxStore();
  const { isMuted, toggleMute } = useSoundStore();
  const { tr } = useTranslation();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [manualUnreadIds, setManualUnreadIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<{ el: HTMLElement; conv: ConversationItem } | null>(null);

  const visibleList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (hiddenIds.includes(c._id) || (currentUserId && c.restrictedBy?.includes(currentUserId))) return false;
      const other = c.participants.find((p) => String(p._id || p.id) !== currentUserId) || c.participants[0];
      const isUnread = Number(c.unreadCounts?.[currentUserId] || 0) > 0 || manualUnreadIds.includes(c._id);
      if (filter === "unread" && !isUnread) return false;
      if (!q) return true;
      return (other?.name || "").toLowerCase().includes(q) || (c.lastMessage?.text || "").toLowerCase().includes(q);
    });
  }, [conversations, hiddenIds, currentUserId, manualUnreadIds, filter, query]);

  const handleOpenConv = async (conv: ConversationItem) => {
    const other = conv.participants.find((p) => String(p._id || p.id) !== currentUserId) || conv.participants[0];
    setManualUnreadIds((prev) => prev.filter((id) => id !== conv._id));
    onClose();
    if (pathname === "/chat" || (typeof window !== "undefined" && window.innerWidth < 600)) {
      await selectConversation(conv);
      if (pathname !== "/chat") router.push("/chat");
    } else if (other) {
      openChat(other as unknown as Parameters<typeof openChat>[0], conv._id);
    }
  };

  const targetConv = menuTarget?.conv;
  const targetOther = targetConv?.participants.find((p) => String(p._id || p.id) !== currentUserId) || targetConv?.participants[0];
  const targetUnread = Boolean(targetConv && (Number(targetConv.unreadCounts?.[currentUserId] || 0) > 0 || manualUnreadIds.includes(targetConv._id)));

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      disableRestoreFocus
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{ paper: { sx: { width: { xs: 340, sm: 375 }, maxHeight: 540, borderRadius: "16px", mt: 1, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid", borderColor: "divider" } } }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.35rem", letterSpacing: "-0.02em" }}>
            {tr("Đoạn chat", "Chats")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title={tr("Tùy chọn đoạn chat", "Chat options")}>
              <IconButton
                size="small"
                onClick={(e) => setHeaderMenuAnchor(e.currentTarget)}
                aria-label={tr("Tùy chọn đoạn chat", "Chat options")}
              >
                <MoreHorizontal size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={tr("Xem tất cả trong phòng chat", "See all in Messenger")}>
              <IconButton size="small" aria-label={tr("Xem tất cả trong phòng chat", "See all in Messenger")} onClick={() => { onClose(); router.push("/chat"); }}>
                <Maximize2 size={17} />
              </IconButton>
            </Tooltip>
            <Tooltip title={tr("Tin nhắn mới", "New message")}>
              <IconButton size="small" aria-label={tr("Tin nhắn mới", "New message")} onClick={() => { onClose(); router.push("/explore"); }}>
                <SquarePen size={17} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder={tr("Tìm kiếm trên Messenger", "Search Messenger")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            mb: 1.25,
            "& .MuiOutlinedInput-root": {
              borderRadius: "999px",
              bgcolor: "action.hover",
              fontSize: "0.875rem",
              "& fieldset": { border: "none" },
            },
          }}
          slotProps={{
            htmlInput: { "aria-label": tr("Tìm kiếm trên Messenger", "Search Messenger") },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="var(--mui-palette-text-secondary)" aria-hidden />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label={tr("Xóa tìm kiếm", "Clear search")} onClick={() => setQuery("")}>
                    <X size={14} aria-hidden />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {([{ id: "all", label: tr("Tất cả", "All") }, { id: "unread", label: tr("Chưa đọc", "Unread") }] as const).map((item) => {
            const active = filter === item.id;
            return (
              <ButtonBase
                key={item.id}
                onClick={() => setFilter(item.id)}
                sx={{
                  px: 1.75,
                  py: 0.65,
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  bgcolor: active ? v.brand[50] : "transparent",
                  color: active ? "primary.main" : "text.secondary",
                  "&:hover": { bgcolor: active ? v.brand[100] : "action.hover" },
                }}
              >
                {item.label}
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, pb: 1, maxHeight: 350 }}>
        {visibleList.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 5, px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {filter === "unread" ? tr("Không có đoạn chat chưa đọc", "No unread chats") : tr("Không tìm thấy cuộc trò chuyện nào", "No conversations found")}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => { onClose(); router.push("/chat"); }} sx={{ borderRadius: "10px" }}>
              {tr("Mở phòng chat", "Open Messenger")}
            </Button>
          </Box>
        ) : (
          visibleList.map((conv) => {
            const other = conv.participants.find((p) => String(p._id || p.id) !== currentUserId) || conv.participants[0];
            const otherId = String(other?._id || other?.id || "");
            return (
              <RecentChatRow
                key={conv._id}
                conv={conv}
                currentUserId={currentUserId}
                isOnline={Boolean(otherId && onlineUserIds.includes(otherId))}
                isUnread={Number(conv.unreadCounts?.[currentUserId] || 0) > 0 || manualUnreadIds.includes(conv._id)}
                isMenuOpen={menuTarget?.conv._id === conv._id}
                onSelect={(c) => void handleOpenConv(c)}
                onOpenMenu={(el, c) => setMenuTarget({ el, conv: c })}
              />
            );
          })
        )}
      </Box>

      <Box sx={{ p: 1, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
        <ButtonBase
          onClick={() => { onClose(); router.push("/chat"); }}
          sx={{ color: "primary.main", fontWeight: 700, fontSize: "0.84rem", py: 0.5, px: 1.5, borderRadius: "8px" }}
        >
          {tr("Xem tất cả trong Messenger", "See all in Messenger")}
        </ButtonBase>
      </Box>

      <RecentChatRowMenu
        anchorEl={menuTarget?.el || null}
        isUnread={targetUnread}
        isMuted={isMuted}
        isBlockedByMe={Boolean(targetConv?.blockedBy && targetConv.blockedBy === currentUserId)}
        isRestricted={Boolean(targetConv?.restrictedBy?.includes(currentUserId))}
        onClose={() => setMenuTarget(null)}
        onToggleUnread={() => {
          if (!targetConv) return;
          if (targetUnread) {
            setManualUnreadIds((prev) => prev.filter((id) => id !== targetConv._id));
            void api.patch(`/chat/conversations/${targetConv._id}/read`).then(() => fetchConversations());
          } else {
            setManualUnreadIds((prev) => Array.from(new Set([...prev, targetConv._id])));
          }
        }}
        onOpenInMessenger={() => {
          if (!targetConv) return;
          onClose();
          void selectConversation(targetConv).then(() => router.push("/chat"));
        }}
        onToggleMute={toggleMute}
        onViewProfile={() => {
          const pid = String(targetOther?._id || targetOther?.id || "");
          if (pid) { onClose(); router.push(`/profile/${pid}`); }
        }}
        onToggleBlock={() => {
          if (!targetConv) return;
          const blocked = targetConv.blockedBy === currentUserId;
          void api.patch(`/chat/conversations/${targetConv._id}/${blocked ? "unblock" : "block"}`).then(() => fetchConversations());
        }}
        onToggleRestrict={() => {
          if (!targetConv) return;
          const restricted = Boolean(targetConv.restrictedBy?.includes(currentUserId));
          void api.patch(`/chat/conversations/${targetConv._id}/restrict`, { restrict: !restricted }).then(() => fetchConversations());
        }}
        onHideChat={() => targetConv && setHiddenIds((prev) => [...prev, targetConv._id])}
      />

      <RecentChatsHeaderMenu
        anchorEl={headerMenuAnchor}
        isMuted={isMuted}
        onClose={() => setHeaderMenuAnchor(null)}
        onToggleMute={toggleMute}
        onMarkAllAsRead={() => {
          setManualUnreadIds([]);
          void api.patch("/chat/conversations/read-all").catch(() => {}).then(() => fetchConversations());
        }}
        onOpenFullChat={() => { onClose(); router.push("/chat"); }}
      />
    </Popover>
  );
}
