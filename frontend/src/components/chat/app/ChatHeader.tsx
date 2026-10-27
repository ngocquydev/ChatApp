"use client";

import { useState, MouseEvent } from "react";
import {
  Box,
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
  Ban,
  MoreVertical,
  Palette,
  Phone,
  ShieldAlert,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { ChatUser } from "@/store/useChatStore";
import ThemeSelectDialog from "./ThemeSelectDialog";
import RestrictInfoDialog from "./RestrictInfoDialog";

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

/** Nút chưa có chức năng: hiển thị disabled kèm tooltip trung thực thay vì nút "chết". */
function ComingSoonButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip title={`${label} — sắp ra mắt`}>
      <span>
        <IconButton disabled aria-label={`${label} (sắp ra mắt)`} sx={{ color: "text.secondary" }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
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
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [openThemeDialog, setOpenThemeDialog] = useState(false);
  const [openRestrictDialog, setOpenRestrictDialog] = useState(false);
  const [openBlockConfirm, setOpenBlockConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleOpenMenu = (e: MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const statusText = isTyping
    ? "Đang soạn tin nhắn…"
    : isBlockedByMe
    ? "Bạn đã chặn người này"
    : isBlockedByPartner
    ? "Người này không nhận tin nhắn"
    : isRestricted
    ? "Đang bị hạn chế"
    : isOnline
    ? "Đang hoạt động"
    : "Ngoại tuyến";

  const statusColor = isTyping
    ? "primary.main"
    : isBlockedByMe || isBlockedByPartner
    ? "error.main"
    : isRestricted
    ? "warning.main"
    : isOnline
    ? "success.main"
    : "text.secondary";

  const partnerName = partner?.name || "Người dùng";

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
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1.5 }, minWidth: 0 }}>
        <IconButton
          onClick={onBack}
          aria-label="Quay lại danh sách hội thoại"
          sx={{ display: { xs: "inline-flex", sm: "none" } }}
        >
          <ArrowLeft size={22} />
        </IconButton>

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

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
        <Tooltip title={isMuted ? "Bật âm thanh thông báo" : "Tắt âm thanh thông báo"}>
          <IconButton
            onClick={onToggleMute}
            aria-pressed={!isMuted}
            aria-label={isMuted ? "Bật âm thanh thông báo" : "Tắt âm thanh thông báo"}
            sx={{
              color: isMuted ? "text.secondary" : "primary.main",
              bgcolor: isMuted ? "transparent" : "action.selected",
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </IconButton>
        </Tooltip>

        <Box sx={{ display: { xs: "none", sm: "flex" } }}>
          <ComingSoonButton label="Gọi thoại">
            <Phone size={20} />
          </ComingSoonButton>
          <ComingSoonButton label="Gọi video">
            <Video size={20} />
          </ComingSoonButton>
        </Box>

        <Tooltip title="Tùy chọn cuộc trò chuyện">
          <IconButton
            onClick={handleOpenMenu}
            aria-label="Tùy chọn cuộc trò chuyện"
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
                minWidth: 220,
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
                p: 0.5,
              },
            },
          }}
        >
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
                Đổi chủ đề / hình nền
              </Typography>
            </ListItemText>
          </MenuItem>

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
                {isRestricted ? "Bỏ hạn chế" : "Hạn chế người dùng"}
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
                {isBlockedByMe ? "Bỏ chặn người dùng" : "Chặn người dùng"}
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
        title={isBlockedByMe ? `Bỏ chặn ${partnerName}?` : `Chặn ${partnerName}?`}
        description={
          isBlockedByMe
            ? `Sau khi bỏ chặn, bạn và ${partnerName} sẽ có thể nhắn tin lại bình thường.`
            : `Bạn và ${partnerName} sẽ không thể gửi tin nhắn cho nhau nữa.`
        }
        confirmLabel={isBlockedByMe ? "Bỏ chặn" : "Chặn người dùng"}
        cancelLabel="Hủy"
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
    </Box>
  );
}
