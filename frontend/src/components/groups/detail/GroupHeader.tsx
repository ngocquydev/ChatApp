"use client";

import { useState } from "react";
import { Avatar, Box, Button, Card, Chip, Menu, MenuItem, Typography } from "@mui/material";
import { Check, Clock, Globe, Lock, LogOut, MessageSquare, Plus, Settings, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupHeaderProps {
  group: CommunityGroupItem;
  isMember: boolean;
  isPending: boolean;
  canManage: boolean;
  memberCount: number;
  isActionPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onManage: () => void;
  onInvite?: () => void;
  onChat?: () => void;
}

export default function GroupHeader({
  group,
  isMember,
  isPending,
  canManage,
  memberCount,
  isActionPending,
  onJoin,
  onLeave,
  onManage,
  onInvite,
  onChat,
}: GroupHeaderProps) {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLeaveClick = () => {
    handleMenuClose();
    onLeave();
  };

  return (
    <Card
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        mb: 2.5,
      }}
    >
      {/* Cover image banner 16:6 aspect ratio */}
      <Box
        sx={{
          height: { xs: 150, sm: 220, md: 260 },
          bgcolor: "primary.main",
          backgroundImage: group.coverImage
            ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%), url(${group.coverImage})`
            : "linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-tone-fx-4f46e5) 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
        }}
      />

      {/* Info & action bar below banner */}
      <Box sx={{ px: { xs: 2, sm: 3.5 }, pb: 2.5, pt: { xs: 2, sm: 2.5 }, position: "relative" }}>
        {/* Overlapping Avatar & Header Content */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "center" },
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          <Avatar
            src={group.avatar || undefined}
            sx={{
              width: { xs: 88, sm: 112 },
              height: { xs: 88, sm: 112 },
              mt: { xs: "-54px", sm: "-64px" },
              border: "4px solid",
              borderColor: "background.paper",
              bgcolor: "primary.main",
              fontWeight: 800,
              fontSize: { xs: "1.75rem", sm: "2.25rem" },
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              flexShrink: 0,
              zIndex: 2,
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" }, py: { xs: 0.5, sm: 1 } }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.5 }}>
              {group.name}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", sm: "flex-start" },
                gap: 1.25,
                flexWrap: "wrap",
              }}
            >
              <Chip
                size="small"
                icon={
                  group.privacy === "public" ? (
                    <Globe size={13} color="var(--mui-palette-text-secondary)" />
                  ) : (
                    <Lock size={13} color="var(--mui-palette-text-secondary)" />
                  )
                }
                label={group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
                variant="outlined"
                sx={{ borderRadius: "8px", fontWeight: 600 }}
              />

              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                • {t("groups.membersCount", { count: memberCount })}
              </Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              flexWrap: "wrap",
              justifyContent: { xs: "center", sm: "flex-end" },
              width: { xs: "100%", sm: "auto" },
              mt: { xs: 1.5, sm: 0 },
              py: { xs: 0.5, sm: 1 },
            }}
          >
            {canManage ? (
              <>
                <Chip
                  icon={<ShieldCheck size={14} color="var(--mui-palette-primary-main)" />}
                  label={t("groups.adminBadge")}
                  variant="outlined"
                  sx={{ borderRadius: "8px", fontWeight: 700, borderColor: "primary.main", color: "primary.main", height: 36 }}
                />
                <Button variant="contained" startIcon={<Settings size={16} />} onClick={onManage} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                  {t("groups.manageGroup")}
                </Button>
              </>
            ) : isMember ? (
              <>
                <Button variant="outlined" startIcon={<Check size={16} />} onClick={handleMenuOpen} disabled={isActionPending} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                  {t("groups.joined")}
                </Button>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose} disableScrollLock slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 160 } } }}>
                  <MenuItem onClick={handleLeaveClick} sx={{ color: "error.main", gap: 1 }}>
                    <LogOut size={16} />
                    {t("groups.leaveGroup")}
                  </MenuItem>
                </Menu>
              </>
            ) : isPending ? (
              <Button variant="outlined" disabled startIcon={<Clock size={16} />} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                {t("groups.requested")}
              </Button>
            ) : (
              <Button variant="contained" startIcon={<Plus size={16} />} onClick={onJoin} disabled={isActionPending} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                {t("groups.joinGroup")}
              </Button>
            )}

            {(isMember || canManage) && onInvite && (
              <Button variant="outlined" startIcon={<UserPlus size={16} />} onClick={onInvite} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                {t("groups.inviteFriends")}
              </Button>
            )}

            {(isMember || canManage) && onChat && (
              <Button variant="outlined" startIcon={<MessageSquare size={16} />} onClick={onChat} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                {t("groups.groupChat")}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

