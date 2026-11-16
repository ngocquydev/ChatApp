"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { Search, UserPlus, Users, X } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useTranslation } from "@/i18n/useTranslation";
import { useChatStore } from "@/store/useChatStore";
import { useFriendStore } from "@/store/useFriendStore";

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onGroupCreated?: (conversationId: string) => void;
}

export default function CreateGroupDialog({
  open,
  onClose,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const { tr } = useTranslation();
  const { friends, fetchFriends } = useFriendStore();
  const { createGroupChat } = useChatStore();

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFriends().catch(() => {});
      setGroupName("");
      setSearchQuery("");
      setSelectedFriendIds([]);
      setErrorText(null);
    }
  }, [open, fetchFriends]);

  const friendList = useMemo(() => {
    return friends
      .map((f) => f.friend)
      .filter((u): u is NonNullable<typeof u> => Boolean(u?._id));
  }, [friends]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friendList;
    return friendList.filter((u) => u.name?.toLowerCase().includes(q));
  }, [friendList, searchQuery]);

  const handleToggleSelect = (userId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    setErrorText(null);
  };

  const handleCreateGroup = async () => {
    const trimmed = groupName.trim();
    if (trimmed.length < 2) {
      setErrorText(tr("Tên nhóm cần ít nhất 2 ký tự", "Group name must be at least 2 characters"));
      return;
    }
    if (selectedFriendIds.length < 2) {
      setErrorText(tr("Vui lòng chọn ít nhất 2 người bạn để tạo nhóm", "Please select at least 2 friends to form a group"));
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    try {
      const conv = await createGroupChat(trimmed, selectedFriendIds);
      onClose();
      if (onGroupCreated && conv?._id) {
        onGroupCreated(conv._id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : tr("Không thể tạo nhóm chat", "Failed to create group chat");
      setErrorText(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="create-group-dialog-title"
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
        id="create-group-dialog-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
          pt: 2,
          px: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Users size={22} color="var(--mui-palette-primary-main)" aria-hidden />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {tr("Tạo nhóm chat mới", "Create New Group Chat")}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label={tr("Đóng", "Close")}>
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pt: "20px !important", pb: 1 }}>
        <TextField
          fullWidth
          size="small"
          label={tr("Tên nhóm", "Group Name")}
          placeholder={tr("Nhập tên nhóm trò chuyện…", "Enter group name…")}
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            setErrorText(null);
          }}
          sx={{ mb: 2, mt: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <UserPlus size={18} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          fullWidth
          size="small"
          type="search"
          placeholder={tr("Tìm kiếm bạn bè…", "Search friends…")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 1.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            {tr("GỢI Ý BẠN BÈ", "SUGGESTED FRIENDS")}
          </Typography>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
            {tr(`Đã chọn: ${selectedFriendIds.length}`, `Selected: ${selectedFriendIds.length}`)}
          </Typography>
        </Box>

        <Box
          sx={{
            maxHeight: 260,
            overflowY: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px",
          }}
        >
          {filteredFriends.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {tr("Không tìm thấy bạn bè nào", "No friends found")}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredFriends.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend._id);
                return (
                  <ListItemButton
                    key={friend._id}
                    onClick={() => handleToggleSelect(friend._id)}
                    sx={{
                      py: 0.75,
                      px: 1.5,
                      borderRadius: "8px",
                      mx: 0.5,
                      my: 0.25,
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <PresenceAvatar
                        name={friend.name || "User"}
                        src={friend.avatar}
                        size={36}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {friend.name}
                        </Typography>
                      }
                    />
                    <Checkbox
                      edge="end"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                      size="small"
                      aria-label={tr(`Chọn ${friend.name}`, `Select ${friend.name}`)}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>

        {errorText && (
          <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 1 }}>
            {errorText}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 1 }}>
        <Button onClick={onClose} variant="outlined" size="small" sx={{ borderRadius: "10px" }}>
          {tr("Hủy", "Cancel")}
        </Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          size="small"
          disabled={isSubmitting || groupName.trim().length < 2 || selectedFriendIds.length < 2}
          sx={{ borderRadius: "10px", fontWeight: 700 }}
        >
          {isSubmitting ? tr("Đang tạo…", "Creating…") : tr("Tạo nhóm", "Create Group")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

