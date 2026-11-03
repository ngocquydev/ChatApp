"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Crown,
  MessageSquareOff,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  GroupMemberItem,
  GroupViewerPermissions,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DeputyPermissionsDialog from "./DeputyPermissionsDialog";

interface GroupMembersTabProps {
  groupId: string;
  viewerPermissions: GroupViewerPermissions;
  onMemberCountChange?: (count: number) => void;
}

export default function GroupMembersTab({
  groupId,
  viewerPermissions,
  onMemberCountChange,
}: GroupMembersTabProps) {
  const { tr, t } = useTranslation();
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<GroupMemberItem | null>(null);

  // Deputy dialog state
  const [deputyDialogOpen, setDeputyDialogOpen] = useState(false);
  const [isSavingDeputy, setIsSavingDeputy] = useState(false);

  // Confirm remove member
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await communityGroupsApi.getMembers(groupId);
      setMembers(res.members);
    } catch (e) {
      console.error("Lỗi lấy danh sách thành viên:", e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>, member: GroupMemberItem) => {
    setMenuAnchor(e.currentTarget);
    setSelectedMember(member);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleAppointOrEditDeputy = () => {
    handleCloseMenu();
    setDeputyDialogOpen(true);
  };

  const handleSaveDeputyPermissions = async (data: {
    userId: string;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }) => {
    try {
      setIsSavingDeputy(true);
      await communityGroupsApi.setDeputy(groupId, data);
      await fetchMembers();
    } catch (e) {
      console.error("Lỗi cập nhật phó nhóm:", e);
    } finally {
      setIsSavingDeputy(false);
    }
  };

  const handleRevokeDeputy = async () => {
    if (!selectedMember) return;
    handleCloseMenu();
    try {
      await communityGroupsApi.removeDeputy(groupId, selectedMember._id);
      await fetchMembers();
    } catch (e) {
      console.error("Lỗi thu hồi phó nhóm:", e);
    }
  };

  const handleToggleMuteComments = async () => {
    if (!selectedMember) return;
    handleCloseMenu();
    try {
      await communityGroupsApi.toggleMuteComments(
        groupId,
        selectedMember._id,
        !selectedMember.isMutedComments
      );
      await fetchMembers();
    } catch (e) {
      console.error("Lỗi khóa/mở bình luận:", e);
    }
  };

  const handleToggleBlockPosting = async () => {
    if (!selectedMember) return;
    handleCloseMenu();
    try {
      await communityGroupsApi.toggleBlockPosting(
        groupId,
        selectedMember._id,
        !selectedMember.isBannedPosting
      );
      await fetchMembers();
    } catch (e) {
      console.error("Lỗi khóa/mở đăng bài:", e);
    }
  };

  const handleConfirmRemove = async () => {
    if (!selectedMember) return;
    try {
      setIsRemovingMember(true);
      const res = await communityGroupsApi.removeMember(groupId, selectedMember._id);
      if (onMemberCountChange) {
        onMemberCountChange(res.memberCount);
      }
      setConfirmRemoveOpen(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (e) {
      console.error("Lỗi xóa thành viên:", e);
    } finally {
      setIsRemovingMember(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} />}
        title={t("groups.allGroups")}
        description={t("groups.noGroupsDesc")}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {members.map((m) => {
        const canManageThisMember =
          m.role !== "creator" &&
          (viewerPermissions.isAdmin ||
            (viewerPermissions.isDeputy && m.role === "member"));

        return (
          <Card
            key={m._id}
            sx={{
              p: 2,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
              <Avatar
                src={m.avatar || undefined}
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "primary.main",
                  fontWeight: 700,
                }}
              >
                {m.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {m.name}
                  </Typography>

                  {/* Role Badge */}
                  {m.role === "creator" ? (
                    <Chip
                      size="small"
                      icon={<Crown size={14} />}
                      label={t("groups.adminBadge")}
                      color="primary"
                      sx={{ fontWeight: 700, height: 24 }}
                    />
                  ) : m.role === "admin" ? (
                    <Chip
                      size="small"
                      icon={<Crown size={14} />}
                      label={t("groups.adminBadge")}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 24 }}
                    />
                  ) : m.role === "deputy" ? (
                    <Tooltip
                      title={
                        m.deputyPermissions
                          ? `${m.deputyPermissions.canRemoveMembers ? "✓ Xóa thành viên " : ""}${
                              m.deputyPermissions.canMuteComments ? "✓ Khóa bình luận " : ""
                            }${m.deputyPermissions.canBlockPosting ? "✓ Cấm đăng bài" : ""}`
                          : ""
                      }
                    >
                      <Chip
                        size="small"
                        icon={<Shield size={14} />}
                        label={t("groups.deputyBadge")}
                        color="secondary"
                        sx={{ fontWeight: 700, height: 24 }}
                      />
                    </Tooltip>
                  ) : null}

                  {/* Restriction badges */}
                  {m.isBannedPosting && (
                    <Chip
                      size="small"
                      icon={<ShieldAlert size={13} />}
                      label={t("groups.blockPostingBtn")}
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 600, height: 22 }}
                    />
                  )}
                  {m.isMutedComments && (
                    <Chip
                      size="small"
                      icon={<MessageSquareOff size={13} />}
                      label={t("groups.muteCommentsBtn")}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 600, height: 22 }}
                    />
                  )}
                </Box>

                {/* Deputy detailed permissions summary */}
                {m.role === "deputy" && m.deputyPermissions && (
                  <Box sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}>
                    {m.deputyPermissions.canRemoveMembers && (
                      <Chip
                        size="small"
                        label={t("groups.permRemoveMembers")}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    )}
                    {m.deputyPermissions.canMuteComments && (
                      <Chip
                        size="small"
                        label={t("groups.permMuteComments")}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    )}
                    {m.deputyPermissions.canBlockPosting && (
                      <Chip
                        size="small"
                        label={t("groups.permBlockPosting")}
                        variant="outlined"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Manage Action Menu Button */}
            {canManageThisMember && (
              <IconButton
                size="small"
                onClick={(e) => handleOpenMenu(e, m)}
                aria-label={t("common.edit")}
              >
                <MoreVertical size={18} />
              </IconButton>
            )}
          </Card>
        );
      })}

      {/* Member Action Popover Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: { borderRadius: "14px", minWidth: 200, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
          },
        }}
      >
        {/* Admin only: Appoint as Deputy or Edit Deputy */}
        {viewerPermissions.isAdmin && selectedMember?.role !== "admin" && (
          <MenuItem onClick={handleAppointOrEditDeputy}>
            <ShieldCheck size={16} style={{ marginRight: 10 }} />
            {selectedMember?.role === "deputy"
              ? t("groups.editDeputyPermissions")
              : t("groups.appointDeputy")}
          </MenuItem>
        )}

        {/* Admin only: Revoke Deputy */}
        {viewerPermissions.isAdmin && selectedMember?.role === "deputy" && (
          <MenuItem onClick={handleRevokeDeputy} sx={{ color: "error.main" }}>
            <ShieldAlert size={16} style={{ marginRight: 10 }} />
            {t("groups.revokeDeputy")}
          </MenuItem>
        )}

        {/* Mute Comments (Admin or Deputy with canMuteComments) */}
        {viewerPermissions.canMuteComments && selectedMember?.role === "member" && (
          <MenuItem onClick={handleToggleMuteComments}>
            <MessageSquareOff size={16} style={{ marginRight: 10 }} />
            {selectedMember.isMutedComments
              ? t("groups.unmuteCommentsBtn")
              : t("groups.muteCommentsBtn")}
          </MenuItem>
        )}

        {/* Block Posting (Admin or Deputy with canBlockPosting) */}
        {viewerPermissions.canBlockPosting && selectedMember?.role === "member" && (
          <MenuItem onClick={handleToggleBlockPosting}>
            <ShieldAlert size={16} style={{ marginRight: 10 }} />
            {selectedMember.isBannedPosting
              ? t("groups.unblockPostingBtn")
              : t("groups.blockPostingBtn")}
          </MenuItem>
        )}

        {/* Remove Member (Admin or Deputy with canRemoveMembers) */}
        {viewerPermissions.canRemoveMembers && selectedMember?.role === "member" && (
          <MenuItem
            onClick={() => {
              handleCloseMenu();
              setConfirmRemoveOpen(true);
            }}
            sx={{ color: "error.main" }}
          >
            <UserMinus size={16} style={{ marginRight: 10 }} />
            {t("groups.removeMemberBtn")}
          </MenuItem>
        )}
      </Menu>

      {/* Deputy Permissions Modal */}
      <DeputyPermissionsDialog
        open={deputyDialogOpen}
        member={selectedMember}
        isSubmitting={isSavingDeputy}
        onClose={() => setDeputyDialogOpen(false)}
        onSave={handleSaveDeputyPermissions}
      />

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        open={confirmRemoveOpen}
        title={t("groups.confirmRemoveMemberTitle")}
        description={t("groups.confirmRemoveMemberMsg")}
        confirmLabel={t("groups.removeMemberBtn")}
        cancelLabel={t("common.cancel")}
        pending={isRemovingMember}
        onConfirm={handleConfirmRemove}
        onClose={() => setConfirmRemoveOpen(false)}
      />
    </Box>
  );
}