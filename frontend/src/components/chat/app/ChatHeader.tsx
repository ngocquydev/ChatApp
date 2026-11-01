"use client";

import { useState, MouseEvent } from "react";
import NextLink from "next/link";
import {
  Box,
  ButtonBase,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  Sparkles,
  Ban,
  MoreVertical,
  Palette,
  Phone,
  ShieldAlert,
  User as UserIcon,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useTranslation } from "@/i18n/useTranslation";
import { useChatStore, ChatUser } from "@/store/useChatStore";
import { useCallStore } from "@/store/useCallStore";
import { getChatTheme } from "./chatThemes";
import ThemeSelectDialog from "./ThemeSelectDialog";
import RestrictInfoDialog from "./RestrictInfoDialog";
import AiChatSummaryDialog from "../AiChatSummaryDialog";

interface ChatHeaderProps {
  partner: ChatUser | null;
  isOnline: boolean;
  isTyping: boolean;
  isMuted: boolean;
  currentTheme?: string;
  isBlockedByMe?: boolean;
  isBlockedByPartner?: boolean;
  isRestricted?: boolean;
  onToggleMute: () => void;
  onBack: () => void;
  onSelectTheme: (themeId: string) => Promise<void> | void;
  onToggleBlock: () => Promise<void> | void;
  onToggleRestrict: () => Promise<void> | void;
}

export default function ChatHeader({
  partner,
  isOnline,
  isTyping,
  isMuted,
  currentTheme = "default",
  isBlockedByMe = false,
  isBlockedByPartner = false,
  isRestricted = false,
  onToggleMute,
  onBack,
  onSelectTheme,
  onToggleBlock,
  onToggleRestrict,
}: ChatHeaderProps) {
  const { tr } = useTranslation();
  const { startCall } = useCallStore();
  const activeConversation = useChatStore((s) => s.activeConversation);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false);
  const [openBlockConfirm, setOpenBlockConfirm] = useState(false);
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const activeThemeConfig = getChatTheme(currentTheme);

  const handleOpenMenu = (e: MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const statusText = isTyping
    ? tr("Đang soạn tin nhắn…", "Typing…")
    : isBlockedByMe
    ? tr("Bạn đã chặn người này", "You blocked this user")
    : isBlockedByPartner
    ? tr("Người này không nhận tin nhắn", "This person cannot receive messages")
    : isRestricted
    ? tr("Đang bị hạn chế", "Restricted")
    : isOnline
    ? tr("Đang hoạt động", "Online")
    : tr("Ngoại tuyến", "Offline");

  const statusColor = isTyping
    ? "primary.main"
    : isBlockedByMe || isBlockedByPartner
    ? "error.main"
    : isRestricted
    ? "warning.main"
    : isOnline
    ? "success.main"
    : "text.secondary";

  const partnerName = partner?.name || tr("Người dùng", "User");
  const partnerId = partner?._id || partner?.id;

  return (
    <Box
      component="header"
      sx={{
        px: { xs: 1, sm: 2.5 },
        py: 1.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        minHeight: 68,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 }, minWidth: 0 }}>
        <IconButton
          onClick={onBack}
          aria-label={tr("Quay lại danh sách hội thoại", "Back to conversations")}
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <ArrowLeft size={22} />
        </IconButton>

        {partnerId ? (
          <ButtonBase
            component={NextLink}
            href={`/profile/${partnerId}`}
            aria-label={tr(`Xem trang cá nhân của ${partnerName}`, `View ${partnerName}'s profile`)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.5 },
              minWidth: 0,
              textAlign: "left",
              borderRadius: "12px",
              p: 0.5,
              pr: 1.25,
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <PresenceAvatar
              name={partner?.name}
              src={partner?.avatar}
              online={!isRestricted && isOnline}
              size={42}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {partnerName}
              </Typography>
              <Typography
                variant="caption"
                role="status"
                aria-live="polite"
                sx={{ color: statusColor, fontWeight: 600, display: "block" }}
              >
                {statusText}
              </Typography>
            </Box>
          </ButtonBase>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 }, minWidth: 0 }}>
            <PresenceAvatar
              name={partner?.name}
              src={partner?.avatar}
              online={!isRestricted && isOnline}
              size={42}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" component="h2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {partnerName}
              </Typography>
              <Typography
                variant="caption"
                role="status"
                aria-live="polite"
                sx={{ color: statusColor, fontWeight: 600, display: "block" }}
              >
                {statusText}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={tr(`Chủ đề: ${activeThemeConfig.name}`, `Theme: ${activeThemeConfig.name}`)}>
          <IconButton
            onClick={() => setOpenThemeDialog(true)}
            aria-label={tr("Đổi chủ đề cuộc trò chuyện", "Change chat theme")}
            sx={{ color: activeThemeConfig.previewColor, position: "relative" }}
          >
            <Palette size={20} />
          </IconButton>
        </Tooltip>

        <Tooltip title={isMuted ? tr("Bật âm thanh thông báo", "Unmute notifications") : tr("Tắt âm thanh thông báo", "Mute notifications")}>
          <IconButton
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            aria-label={isMuted ? tr("Bật âm thanh thông báo", "Unmute notifications") : tr("Tắt âm thanh thông báo", "Mute notifications")}
            sx={{
              color: isMuted ? "text.secondary" : "primary.main",
              bgcolor: isMuted ? "transparent" : "action.selected",
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 0.25 }}>
          <Tooltip title={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}>
            <IconButton
              aria-label={tr("Bắt đầu cuộc gọi thoại", "Start voice call")}
              disabled={!partner}
              onClick={() => {
                if (partner) {
                  void startCall(
                    {
                      id: String(partner._id || partner.id || ""),
                      name: partner.name,
                      avatar: partner.avatar,
                      conversationId: activeConversation?._id,
                    },
                    "audio"
                  );
                }
              }}
              sx={{ color: "primary.main" }}
            >
              <Phone size={20} />
            </IconButton>
          </Tooltip>

          <Tooltip title={tr("Bắt đầu cuộc gọi video", "Start video call")}>
            <IconButton
              aria-label={tr("Bắt đầu cuộc gọi video", "Start video call")}
              disabled={!partner}
              onClick={() => {
                if (partner) {
                  void startCall(
                    {
                      id: String(partner._id || partner.id || ""),
                      name: partner.name,
                      avatar: partner.avatar,
                      conversationId: activeConversation?._id,
                    },
                    "video"
                  );
                }
              }}
              sx={{ color: "primary.main" }}
            >
              <Video size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        <Tooltip title={tr("Tùy chọn cuộc trò chuyện", "Chat options")}>
          <IconButton
            onClick={handleOpenMenu}
            aria-label={tr("Tùy chọn cuộc trò chuyện", "Chat options")}
            aria-controls={menuAnchor ? "chat-options-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(menuAnchor)}
            sx={{ color: "text.secondary" }}
          >
            <MoreVertical size={20} />
          </IconButton>
        </Tooltip>

        {/* Menu Tùy chọn khác */}
        <Menu
          id="chat-options-menu"
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleCloseMenu}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                borderRadius: "14px",
                minWidth: 230,
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                p: 0.5,
              },
            },
          }}
        >
          {partnerId && (
            <MenuItem
              component={NextLink}
              href={`/profile/${partnerId}`}
              onClick={handleCloseMenu}
              sx={{ borderRadius: "8px", py: 1 }}
            >
              <ListItemIcon>
                <UserIcon size={18} color="var(--mui-palette-text-secondary)" />
              </ListItemIcon>
              <ListItemText>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tr("Xem trang cá nhân", "View profile")}
                </Typography>
              </ListItemText>
            </MenuItem>
          )}

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setOpenThemeDialog(true);
            }}
            sx={{ borderRadius: "8px", py: 1 }}
          >
            <ListItemIcon>
              <Palette size={18} color="var(--mui-palette-primary-main)" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {tr(`Đổi chủ đề (${activeThemeConfig.name})`, `Change theme (${activeThemeConfig.name})`)}
              </Typography>
            </ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setOpenSummaryDialog(true);
            }}
            sx={{ borderRadius: "8px", py: 1 }}
          >
            <ListItemIcon>
              <Sparkles size={18} color="var(--mui-palette-primary-main)" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {tr("Tóm tắt hội thoại (Llama 3.3)", "Summarize chat (Llama 3.3)")}
              </Typography>
            </ListItemText>
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setOpenRestrictDialog(true);
            }}
            sx={{ borderRadius: "8px", py: 1 }}
          >
            <ListItemIcon>
              <ShieldAlert size={18} color="var(--mui-palette-warning-main)" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isRestricted ? tr("Bỏ hạn chế", "Unrestrict") : tr("Hạn chế người dùng", "Restrict user")}
              </Typography>
            </ListItemText>
          </MenuItem>

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setOpenBlockConfirm(true);
            }}
            sx={{ borderRadius: "8px", py: 1, color: "error.main" }}
          >
            <ListItemIcon>
              <Ban size={18} color="var(--mui-palette-error-main)" />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
                {isBlockedByMe ? tr("Bỏ chặn người dùng", "Unblock user") : tr("Chặn người dùng", "Block user")}
              </Typography>
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Dialog Chọn Hình Nền / Chủ Đề */}
      <ThemeSelectDialog
        open={openThemeDialog}
        currentTheme={currentTheme}
        onSelectTheme={onSelectTheme}
        onClose={() => setOpenThemeDialog(false)}
      />

      {/* Dialog Hạn Chế */}
      <RestrictInfoDialog
        open={openRestrictDialog}
        partner={partner}
        isRestricted={isRestricted}
        onConfirm={onToggleRestrict}
        onClose={() => setOpenRestrictDialog(false)}
      />

      {/* Dialog Xác Nhận Chặn / Bỏ Chặn */}
      <ConfirmDialog
        open={openBlockConfirm}
        title={isBlockedByMe ? tr(`Bỏ chặn ${partnerName}?`, `Unblock ${partnerName}?`) : tr(`Chặn ${partnerName}?`, `Block ${partnerName}?`)}
        description={
          isBlockedByMe
            ? tr(
                `Sau khi bỏ chặn, bạn và ${partnerName} sẽ có thể nhắn tin lại bình thường.`,
                `After unblocking, you and ${partnerName} will be able to message each other again.`
              )
            : tr(
                `Bạn và ${partnerName} sẽ không thể gửi tin nhắn cho nhau nữa.`,
                `You and ${partnerName} will no longer be able to send messages to each other.`
              )
        }
        confirmLabel={isBlockedByMe ? tr("Bỏ chặn", "Unblock") : tr("Chặn người dùng", "Block user")}
        cancelLabel={tr("Hủy", "Cancel")}
        pending={isPending}
        onClose={() => setOpenBlockConfirm(false)}
        onConfirm={async () => {
          setIsPending(true);
          try {
            await onToggleBlock();
            setOpenBlockConfirm(false);
          } finally {
            setIsPending(false);
          }
        }}
      />

      {/* Dialog Tóm tắt hội thoại bằng Llama 3.3 (Groq) */}
      <AiChatSummaryDialog
        open={openSummaryDialog}
        onClose={() => setOpenSummaryDialog(false)}
        conversationId={activeConversation?._id || ""}
        partnerName={partner?.name}
      />
    </Box>
  );
}
