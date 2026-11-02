"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Users, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (group: CommunityGroupItem) => void;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const { tr } = useTranslation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [description, setDescription] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const group = await communityGroupsApi.createGroup({
        name: name.trim(),
        slug: slug.trim(),
        privacy,
        description: description.trim(),
        requireApproval,
        avatar: avatar.trim() || undefined,
      });
      onCreated(group);
      onClose();
      setName("");
      setSlug("");
      setDescription("");
      setAvatar("");
      setRequireApproval(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Tạo nhóm thất bại, vui lòng thử lại!";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      disableScrollLock
      autoFocus={false}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "20px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, pr: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {tr("Tạo Hội nhóm mới", "Create New Community Group")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {tr(
                  "Xây dựng không gian giao lưu, chia sẻ bài viết cùng bạn bè và cộng đồng",
                  "Build a space to connect, share posts with friends and community"
                )}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={tr("Đóng", "Close")} sx={{ flexShrink: 0 }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            pt: "24px !important",
            px: 3,
            pb: 2,
          }}
        >
          {error && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                bgcolor: "error.main",
                color: "error.contrastText",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {error}
            </Box>
          )}

          <TextField
            label={tr("Tên Hội nhóm", "Group Name")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            fullWidth
            size="small"
            sx={{ mt: 0.5 }}
            placeholder={tr("Ví dụ: Hội Thích Đọc Sách", "E.g. Book Lovers Club")}
          />

          <TextField
            label={tr("Đường dẫn (slug)", "URL Slug")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            size="small"
            helperText={slug ? `/groups/${slug}` : undefined}
          />

          <TextField
            select
            label={tr("Quyền riêng tư", "Privacy")}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as "public" | "private")}
            fullWidth
            size="small"
          >
            <MenuItem value="public">
              {tr("Công khai (Bất kỳ ai cũng có thể xem bài viết)", "Public (Anyone can view posts)")}
            </MenuItem>
            <MenuItem value="private">
              {tr("Riêng tư (Chỉ thành viên mới xem được bài viết)", "Private (Only members can view posts)")}
            </MenuItem>
          </TextField>

          <TextField
            label={tr("Mô tả hội nhóm", "Description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder={tr(
              "Mục đích và quy tắc của nhóm...",
              "Purpose and guidelines of the group..."
            )}
          />

          <FormControlLabel
            control={
              <Switch
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {tr("Yêu cầu phê duyệt thành viên", "Require member approval")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tr(
                    "Quản trị viên phải đồng ý trước khi người mới tham gia nhóm",
                    "Admins must approve before new people join the group"
                  )}
                </Typography>
              </Box>
            }
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>
            {tr("Hủy", "Cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || !slug.trim() || isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting
              ? tr("Đang tạo...", "Creating...")
              : tr("Tạo Hội nhóm", "Create Group")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

