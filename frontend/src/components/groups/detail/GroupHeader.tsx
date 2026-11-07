"use client";

import { useState } from "react";
import { Avatar, Box, Button, Card, Chip, Menu, MenuItem, Typography } from "@mui/material";
import { Check, Clock, Globe, Lock, LogOut, MessageSquare, Plus, Settings, UserPlus } from "lucide-react";
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
      <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1, position: "relative" }}>
        {/* Overlapping Avatar */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "flex-end" },
            gap: 2,
            mt: { xs: "-50px", sm: "-60px" },
            mb: 2,
          }}
        >
          <Avatar
            src={group.avatar || undefined}
            sx={{
              width: { xs: 84, sm: 104 },
              height: { xs: 84, sm: 104 },
              border: "4px solid",
              borderColor: "background.paper",
              bgcolor: "primary.main",
              fontWeight: 800,
              fontSize: { xs: "1.75rem", sm: "2.25rem" },
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            }}
          >
            {group.name.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: "center", sm: "left" } }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              {group.name}
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", sm: "flex-start" },
                gap: 1,
                mt: 0.5,
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
              gap: 1,
              flexWrap: "wrap",
              justifyContent: { xs: "center", sm: "flex-end" },
              width: { xs: "100%", sm: "auto" },
              mt: { xs: 1, sm: 0 },
            }}
          >
            {isMember ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Check size={16} />}
                  onClick={handleMenuOpen}
                  disabled={isActionPending}
                  sx={{ borderRadius: "10px", fontWeight: 700 }}
                >
                  {t("groups.joined")}
                </Button>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  disableScrollLock
                  slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 160 } } }}
                >
                  <MenuItem onClick={handleLeaveClick} sx={{ color: "error.main", gap: 1 }}>
                    <LogOut size={16} />
                    {t("groups.leaveGroup")}
                  </MenuItem>
                </Menu>

                {onInvite && (
                  <Button
                    variant="outlined"
                    startIcon={<UserPlus size={16} />}
                    onClick={onInvite}
                    sx={{ borderRadius: "10px", fontWeight: 700 }}
                  >
                    {t("groups.inviteFriends")}
                  </Button>
                )}

                {onChat && (
                  <Button
                    variant="outlined"
                    startIcon={<MessageSquare size={16} />}
                    onClick={onChat}
                    sx={{ borderRadius: "10px", fontWeight: 700 }}
                  >
                    {t("groups.groupChat")}
                  </Button>
                )}
              </>
            ) : isPending ? (
              <Button
                variant="outlined"
                disabled
                startIcon={<Clock size={16} />}
                sx={{ borderRadius: "10px", fontWeight: 700 }}
              >
                {t("groups.requested")}
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={<Plus size={16} />}
                onClick={onJoin}
                disabled={isActionPending}
                sx={{ borderRadius: "10px", fontWeight: 700 }}
              >
                {t("groups.joinGroup")}
              </Button>
            )}

            {canManage && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Settings size={16} />}
                onClick={onManage}
                sx={{
                  borderRadius: "10px",
                  fontWeight: 700,
                  borderColor: "divider",
                  color: "text.primary",
                  bgcolor: "action.hover",
                  "&:hover": {
                    bgcolor: "action.selected",
                    borderColor: "divider",
                  },
                }}
              >
                {t("groups.manageGroup")}
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

