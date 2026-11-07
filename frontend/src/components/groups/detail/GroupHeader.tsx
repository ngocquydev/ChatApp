"use client";

import { useRef, useState } from "react";
import { Avatar, Box, Button, Card, Chip, CircularProgress, IconButton, Menu, MenuItem, Typography } from "@mui/material";
import { Camera, Check, Clock, Globe, Lock, LogOut, MessageSquare, Plus, Settings, ShieldCheck, UserPlus } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem, communityGroupsApi } from "@/services/communityGroupsApi";
import { uploadMedia } from "@/services/postsApi";
import GroupCoverBanner from "./GroupCoverBanner";

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
  onUpdateGroup?: (updated: Partial<CommunityGroupItem>) => void;
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
  onUpdateGroup,
}: GroupHeaderProps) {
  const { t } = useTranslation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const res = await uploadMedia(file);
      const updated = await communityGroupsApi.updateGroup(group._id, {
        avatar: res.url,
      });
      onUpdateGroup?.(updated);
    } catch (err) {
      console.error("Lỗi cập nhật ảnh đại diện nhóm:", err);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleLeaveClick = () => {
    setMenuAnchor(null);
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
      <GroupCoverBanner
        groupId={group._id}
        coverImage={group.coverImage}
        canManage={canManage}
        onUpdateCover={onUpdateGroup}
      />

      <Box sx={{ px: { xs: 2, sm: 3.5 }, pb: 2.5, pt: { xs: 2, sm: 2.5 }, position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "center", sm: "center" },
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          {/* Avatar with edit overlay */}
          <Box sx={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
            {canManage && (
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />
            )}
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
                zIndex: 2,
              }}
            >
              {group.name.charAt(0).toUpperCase()}
            </Avatar>
            {canManage && (
              <IconButton
                size="small"
                disabled={isUploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                aria-label={t("groups.changeAvatar")}
                sx={{
                  position: "absolute", bottom: 2, right: 2,
                  bgcolor: "background.paper", border: "2px solid", borderColor: "background.paper",
                  boxShadow: 2, color: "text.primary", "&:hover": { bgcolor: "action.hover" },
                  zIndex: 3, p: 0.6,
                }}
              >
                {isUploadingAvatar ? <CircularProgress size={16} /> : <Camera size={16} />}
              </IconButton>
            )}
          </Box>

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
                <Button variant="outlined" startIcon={<Check size={16} />} onClick={(e) => setMenuAnchor(e.currentTarget)} disabled={isActionPending} sx={{ borderRadius: "10px", fontWeight: 700 }}>
                  {t("groups.joined")}
                </Button>
                <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} disableScrollLock slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 160 } } }}>
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
