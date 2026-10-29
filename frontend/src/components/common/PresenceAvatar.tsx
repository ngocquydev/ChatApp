"use client";

import { Avatar, Badge } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useTranslation } from "@/i18n/useTranslation";
import { colors } from "@/theme/tokens";

const PresenceBadge = styled(Badge, {
  shouldForwardProp: (prop) => prop !== "online",
})<{ online: boolean }>(({ online }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: online ? colors.online : colors.offline,
    color: online ? colors.online : colors.offline,
    boxShadow: `0 0 0 2px var(--mui-palette-background-paper)`,
    width: 11,
    height: 11,
    borderRadius: "50%",
    "&::after": {
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      animation: online ? "presenceRipple 1.6s infinite ease-out" : "none",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes presenceRipple": {
    "0%": { transform: "scale(0.8)", opacity: 1 },
    "100%": { transform: "scale(2.4)", opacity: 0 },
  },
}));

interface PresenceAvatarProps {
  name?: string;
  src?: string;
  online?: boolean;
  size?: number;
  priority?: boolean;
  /** Ẩn chấm trạng thái (vd. trong danh sách lời mời). */
  hidePresence?: boolean;
}

/** Avatar kèm chấm trạng thái online/offline. Trạng thái luôn có alt-text cho screen reader. */
export default function PresenceAvatar({
  name,
  src,
  online = false,
  size = 44,
  priority = false,
  hidePresence = false,
}: PresenceAvatarProps) {
  const { tr } = useTranslation();
  const avatar = (
    <Avatar
      src={src}
      alt={name || tr("Người dùng", "User")}
      slotProps={{
        img: {
          loading: priority ? "eager" : "lazy",
        },
      }}
      sx={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name?.trim()?.[0]?.toUpperCase()}
    </Avatar>
  );

  if (hidePresence) return avatar;

  return (
    <PresenceBadge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      variant="dot"
      online={online}
      title={online ? tr("Đang hoạt động", "Online") : tr("Ngoại tuyến", "Offline")}
    >
      {avatar}
    </PresenceBadge>
  );
}
