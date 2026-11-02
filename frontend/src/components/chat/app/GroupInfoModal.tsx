"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Menu,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check,
  Crown,
  Edit2,
  LogOut,
  MoreVertical,
  Shield,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useTranslation } from "@/i18n/useTranslation";
import { ConversationItem, useChatStore, ChatUser } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useFriendStore } from "@/store/useFriendStore";

interface GroupInfoModalProps {
  open: boolean;
  conversation: ConversationItem | null;
  onClose: () => void;
}

export default function GroupInfoModal({
  open,
  conversation,
  onClose,
}: GroupInfoModalProps) {
  const { tr } = useTranslation();
  const { user } = useAuthStore();
  const { friends, fetchFriends } = useFriendStore();
  const {
    updateGroupInfo,
    addGroupMembers,
    removeGroupMember,
    promoteGroupAdmin,
  } = useChatStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedAddFriendIds, setSelectedAddFriendIds] = useState<string[]>([]);
  const [openLeaveConfirm, setOpenLeaveConfirm] = useState(false);
  const [openKickConfirm, setOpenKickConfirm] = useState<ChatUser | null>(null);
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<{
    el: HTMLElement;
    targetUser: ChatUser;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserId = String(user?._id || user?.id || "");

  const adminIdSet = useMemo(() => {
    if (!conversation?.adminIds) return new Set<string>();
    return new Set(
      conversation.adminIds.map((a) =>
        typeof a === "string" ? a : String(a?._id || a?.id || "")
      )
    );
  }, [conversation]);

  const isCurrentUserAdmin = useMemo(() => {
    return adminIdSet.has(currentUserId);
  }, [adminIdSet, currentUserId]);

  const creatorId = useMemo(() => {
    if (!conversation?.creatorId) return "";
    return typeof conversation.creatorId === "string"
      ? conversation.creatorId
      : String(conversation.creatorId?._id || conversation.creatorId?.id || "");
  }, [conversation]);

  // Danh sách bạn bè chưa vào nhóm
  const candidateFriends = useMemo(() => {
    if (!conversation) return [];
    const participantSet = new Set(
      conversation.participants.map((p) => String(p._id || p.id || ""))
    );
    return friends
      .map((f) => f.friend)
      .filter(
        (fr): fr is NonNullable<typeof fr> =>
          Boolean(fr?._id) && !participantSet.has(String(fr._id))
      );
  }, [conversation, friends]);

  if (!conversation || conversation.type !== "group") return null;

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === conversation.name) {
      setIsEditingName(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await updateGroupInfo(conversation._id, { name: trimmed });
      setIsEditingName(false);
    } catch (err) {
      console.error("Lỗi cập nhật tên nhóm:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMembersSubmit = async () => {
    if (selectedAddFriendIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await addGroupMembers(conversation._id, selectedAddFriendIds);
      setSelectedAddFriendIds([]);
      setShowAddMembers(false);
    } catch (err) {
      console.error("Lỗi thêm thành viên:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKickMember = async () => {
    if (!openKickConfirm) return;
    setIsSubmitting(true);
    try {
      await removeGroupMember(conversation._id, String(openKickConfirm._id || openKickConfirm.id));
      setOpenKickConfirm(null);
    } catch (err) {
      console.error("Lỗi xóa thành viên:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsSubmitting(true);
    try {
      await removeGroupMember(conversation._id, currentUserId);
      setOpenLeaveConfirm(false);
      onClose();
    } catch (err) {
      console.error("Lỗi rời nhóm:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromoteAdmin = async (targetUserId: string) => {
    setMemberMenuAnchor(null);
    try {
      await promoteGroupAdmin(conversation._id, targetUserId);
    } catch (err) {
      console.error("Lỗi thăng cấp quản trị viên:", err);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        aria-labelledby="group-info-dialog-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: "20px",
              overflow: "hidden",
              bgcolor: "background.paper",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle
          id="group-info-dialog-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
            pt: 1.5,
            px: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Users size={20} color="var(--mui-palette-primary-main)" aria-hidden />
            <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {tr("Thông tin nhóm", "Group Details")}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={tr("Đóng", "Close")}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, pt: 1, pb: 1.5 }}>
          {/* Avatar & Tên nhóm */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", my: 1.5 }}>
            <PresenceAvatar
              name={conversation.name || "Nhóm"}
              src={conversation.avatar || undefined}
              size={64}
            />

            {isEditingName ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder={tr("Nhập tên nhóm mới…", "Enter new group name…")}
                  autoFocus
                />
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleSaveName}
                  disabled={isSubmitting || !editedName.trim()}
                  aria-label={tr("Lưu tên nhóm", "Save group name")}
                >
                  <Check size={18} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setIsEditingName(false)}
                  aria-label={tr("Hủy sửa", "Cancel edit")}
                >
                  <X size={18} />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, textAlign: "center" }}>
                  {conversation.name || tr("Nhóm trò chuyện", "Group Chat")}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditedName(conversation.name || "");
                    setIsEditingName(true);
                  }}
                  aria-label={tr("Đổi tên nhóm", "Rename group")}
                >
                  <Edit2 size={15} />
                </IconButton>
              </Box>
            )}

            <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
              {tr(
                `${conversation.participants.length} thành viên`,
                `${conversation.participants.length} members`
              )}
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Nút thêm thành viên */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {tr("Thành viên nhóm", "Group Members")}
            </Typography>
            <Button
              size="small"
              startIcon={<UserPlus size={16} />}
              onClick={() => {
                fetchFriends().catch(() => {});
                setShowAddMembers(!showAddMembers);
              }}
              sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 700 }}
            >
              {showAddMembers ? tr("Đóng thêm", "Hide") : tr("Thêm thành viên", "Add Members")}
            </Button>
          </Box>

          {/* Panel thêm thành viên nếu mở */}
          {showAddMembers && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: "12px",
                bgcolor: "action.hover",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, display: "block" }}>
                {tr("Chọn bạn bè để thêm vào nhóm:", "Select friends to add to group:")}
              </Typography>
              {candidateFriends.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
                  {tr("Tất cả bạn bè đã ở trong nhóm này rồi.", "All friends are already in this group.")}
                </Typography>
              ) : (
                <Box sx={{ maxHeight: 180, overflowY: "auto", mb: 1 }}>
                  {candidateFriends.map((fr) => {
                    const isChecked = selectedAddFriendIds.includes(fr._id);
                    return (
                      <Box
                        key={fr._id}
                        onClick={() => {
                          setSelectedAddFriendIds((prev) =>
                            prev.includes(fr._id)
                              ? prev.filter((id) => id !== fr._id)
                              : [...prev, fr._id]
                          );
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: 0.75,
                          borderRadius: "8px",
                          cursor: "pointer",
                          bgcolor: isChecked ? "action.selected" : "transparent",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PresenceAvatar name={fr.name || "User"} src={fr.avatar} size={32} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {fr.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={isChecked ? tr("Đã chọn", "Selected") : tr("Chọn", "Select")}
                          size="small"
                          color={isChecked ? "primary" : "default"}
                          sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
              {candidateFriends.length > 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  disabled={isSubmitting || selectedAddFriendIds.length === 0}
                  onClick={handleAddMembersSubmit}
                  sx={{ borderRadius: "8px", fontWeight: 700 }}
                >
                  {tr(`Xác nhận thêm (${selectedAddFriendIds.length})`, `Confirm Add (${selectedAddFriendIds.length})`)}
                </Button>
              )}
            </Box>
          )}

          {/* Danh sách thành viên hiện tại */}
          <List
            disablePadding
            sx={{
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "12px",
            }}
          >
            {conversation.participants.map((participant) => {
              const pId = String(participant._id || participant.id || "");
              const isCreator = pId === creatorId;
              const isAdmin = adminIdSet.has(pId);
              const isSelf = pId === currentUserId;

              return (
                <Box
                  key={pId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1,
                    px: 1.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <PresenceAvatar
                        name={participant.name || "User"}
                        src={participant.avatar}
                        size={36}
                      />
                    </ListItemAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                          {participant.name} {isSelf && `(${tr("Bạn", "You")})`}
                        </Typography>
                        {isCreator ? (
                          <Chip
                            icon={<Crown size={12} />}
                            label={tr("Trưởng nhóm", "Creator")}
                            size="small"
                            color="warning"
                            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                          />
                        ) : isAdmin ? (
                          <Chip
                            icon={<ShieldCheck size={12} />}
                            label={tr("Quản trị viên", "Admin")}
                            size="small"
                            color="primary"
                            sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                          />
                        ) : null}
                      </Box>
                      {participant.email && (
                        <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>
                          {participant.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Hành động quản trị viên cho các thành viên khác */}
                  {isCurrentUserAdmin && !isSelf && (
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        setMemberMenuAnchor({ el: e.currentTarget, targetUser: participant })
                      }
                      aria-label={tr(`Tùy chọn cho ${participant.name}`, `Options for ${participant.name}`)}
                    >
                      <MoreVertical size={16} />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions sx={{ px: 2.5, pb: 2, pt: 1, justifyContent: "space-between" }}>
          <Button
            color="error"
            startIcon={<LogOut size={16} />}
            onClick={() => setOpenLeaveConfirm(true)}
            size="small"
            sx={{ fontWeight: 700 }}
          >
            {tr("Rời khỏi nhóm", "Leave Group")}
          </Button>

          <Button onClick={onClose} variant="outlined" size="small" sx={{ borderRadius: "10px" }}>
            {tr("Đóng", "Close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu thao tác thành viên */}
      <Menu
        anchorEl={memberMenuAnchor?.el}
        open={Boolean(memberMenuAnchor)}
        onClose={() => setMemberMenuAnchor(null)}
      >
        {memberMenuAnchor && !adminIdSet.has(String(memberMenuAnchor.targetUser._id || memberMenuAnchor.targetUser.id)) && (
          <MenuItem
            onClick={() =>
              handlePromoteAdmin(String(memberMenuAnchor.targetUser._id || memberMenuAnchor.targetUser.id))
            }
          >
            <Shield size={16} style={{ marginRight: 8 }} />
            {tr("Bổ nhiệm Quản trị viên", "Promote to Admin")}
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            const target = memberMenuAnchor?.targetUser;
            setMemberMenuAnchor(null);
            if (target) setOpenKickConfirm(target);
          }}
          sx={{ color: "error.main" }}
        >
          <UserMinus size={16} style={{ marginRight: 8 }} />
          {tr("Xóa khỏi nhóm", "Remove from group")}
        </MenuItem>
      </Menu>

      {/* Xác nhận xóa thành viên */}
      <ConfirmDialog
        open={Boolean(openKickConfirm)}
        title={tr("Xóa thành viên khỏi nhóm", "Remove member from group")}
        description={tr(
          `Bạn có chắc chắn muốn xóa ${openKickConfirm?.name} khỏi cuộc trò chuyện nhóm này không?`,
          `Are you sure you want to remove ${openKickConfirm?.name} from this group chat?`
        )}
        confirmLabel={tr("Xóa khỏi nhóm", "Remove")}
        onConfirm={handleKickMember}
        onClose={() => setOpenKickConfirm(null)}
      />

      {/* Xác nhận rời nhóm */}
      <ConfirmDialog
        open={openLeaveConfirm}
        title={tr("Rời khỏi nhóm trò chuyện", "Leave group chat")}
        description={tr(
          "Bạn sẽ không thể gửi hoặc xem tin nhắn mới trong nhóm này sau khi rời đi.",
          "You won't be able to send or view new messages in this group after leaving."
        )}
        confirmLabel={tr("Rời nhóm", "Leave")}
        onConfirm={handleLeaveGroup}
        onClose={() => setOpenLeaveConfirm(false)}
      />
    </>
  );
}
