"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Menu, MenuItem } from "@mui/material";
import { MessageSquareOff, Shield, ShieldAlert, UserMinus, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  GroupMemberItem,
  GroupViewerPermissions,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DeputyPermissionsDialog from "./DeputyPermissionsDialog";
import MemberRow from "./MemberRow";

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
  const { t } = useTranslation();
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<GroupMemberItem | null>(null);

  const [deputyDialogOpen, setDeputyDialogOpen] = useState(false);
  const [isSavingDeputy, setIsSavingDeputy] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await communityGroupsApi.getMembers(groupId);
      setMembers(res.members);
      if (onMemberCountChange && typeof res.memberCount === "number") {
        onMemberCountChange(res.memberCount);
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách thành viên:", e);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, onMemberCountChange]);

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
      {members.map((m) => (
        <MemberRow
          key={m._id}
          member={m}
          viewerPermissions={viewerPermissions}
          onOpenMenu={handleOpenMenu}
        />
      ))}

      {/* Dropdown Menu actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        disableScrollLock
        slotProps={{ paper: { sx: { borderRadius: "12px", minWidth: 200 } } }}
      >
        {viewerPermissions.isAdmin && selectedMember?.role !== "creator" && (
          selectedMember?.role === "deputy" ? (
            <>
              <MenuItem onClick={() => { handleCloseMenu(); setDeputyDialogOpen(true); }} sx={{ gap: 1.5 }}>
                <Shield size={16} />
                {t("groups.editDeputyPermissions")}
              </MenuItem>
              <MenuItem onClick={handleRevokeDeputy} sx={{ gap: 1.5, color: "warning.main" }}>
                <ShieldAlert size={16} />
                {t("groups.revokeDeputy")}
              </MenuItem>
            </>
          ) : (
            <MenuItem onClick={() => { handleCloseMenu(); setDeputyDialogOpen(true); }} sx={{ gap: 1.5 }}>
              <Shield size={16} />
              {t("groups.appointDeputy")}
            </MenuItem>
          )
        )}

        {(viewerPermissions.isAdmin || viewerPermissions.isDeputy) && (
          <>
            <MenuItem onClick={handleToggleMuteComments} sx={{ gap: 1.5 }}>
              <MessageSquareOff size={16} />
              {selectedMember?.isMutedComments ? t("groups.unmuteCommentsBtn") : t("groups.muteCommentsBtn")}
            </MenuItem>

            <MenuItem onClick={handleToggleBlockPosting} sx={{ gap: 1.5 }}>
              <ShieldAlert size={16} />
              {selectedMember?.isBannedPosting ? t("groups.unblockPostingBtn") : t("groups.blockPostingBtn")}
            </MenuItem>

            <MenuItem onClick={() => { handleCloseMenu(); setConfirmRemoveOpen(true); }} sx={{ gap: 1.5, color: "error.main" }}>
              <UserMinus size={16} />
              {t("groups.removeMemberBtn")}
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Deputy Dialog */}
      {selectedMember && (
        <DeputyPermissionsDialog
          open={deputyDialogOpen}
          onClose={() => setDeputyDialogOpen(false)}
          onSubmit={handleSaveDeputyPermissions}
          isSubmitting={isSavingDeputy}
          member={selectedMember}
        />
      )}

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        open={confirmRemoveOpen}
        onClose={() => setConfirmRemoveOpen(false)}
        onConfirm={handleConfirmRemove}
        pending={isRemovingMember}
        title={t("groups.confirmRemoveMemberTitle")}
        description={t("groups.confirmRemoveMemberMsg", { name: selectedMember?.name || "" })}
        confirmLabel={t("groups.removeMemberBtn")}
      />
    </Box>
  );
}
