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
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [description, setDescription] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [requireJoinReason, setRequireJoinReason] = useState(false);
  const [joinQuestion, setJoinQuestion] = useState("");
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
        requireApproval: requireApproval || requireJoinReason,
        requireJoinReason,
        joinQuestion: joinQuestion.trim() || undefined,
        avatar: avatar.trim() || undefined,
      });
      onCreated(group);
      onClose();
      setName("");
      setSlug("");
      setDescription("");
      setAvatar("");
      setRequireApproval(false);
      setRequireJoinReason(false);
      setJoinQuestion("");
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
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, pr: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Users size={20} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {t("groups.createModalTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {t("groups.createModalDesc")}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")} sx={{ flexShrink: 0 }}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "20px !important", px: 3, pb: 2 }}>
          {error && (
            <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "error.main", color: "error.contrastText", fontSize: "0.85rem", fontWeight: 600 }}>
              {error}
            </Box>
          )}

          <TextField
            label={t("groups.groupName")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            fullWidth
            size="small"
            placeholder={t("groups.groupNamePlaceholder")}
          />

          <TextField
            label={t("groups.slugLabel")}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            size="small"
            helperText={slug ? `/groups/${slug}` : undefined}
          />

          <TextField
            select
            label={t("groups.privacyLabel")}
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as "public" | "private")}
            fullWidth
            size="small"
          >
            <MenuItem value="public">{t("groups.privacyPublicDesc")}</MenuItem>
            <MenuItem value="private">{t("groups.privacyPrivateDesc")}</MenuItem>
          </TextField>

          <TextField
            label={t("groups.descLabel")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            fullWidth
            size="small"
            placeholder={t("groups.descPlaceholder")}
          />

          <FormControlLabel
            control={<Switch checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} color="primary" />}
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t("groups.approvalLabel")}</Typography>
                <Typography variant="caption" color="text.secondary">{t("groups.approvalDesc")}</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={requireJoinReason}
                onChange={(e) => {
                  const val = e.target.checked;
                  setRequireJoinReason(val);
                  if (val) setRequireApproval(true);
                }}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t("groups.joinQuestionLabel")}</Typography>
                <Typography variant="caption" color="text.secondary">{t("groups.joinQuestionDesc")}</Typography>
              </Box>
            }
          />

          {requireJoinReason && (
            <TextField
              label={t("groups.joinQuestionInputLabel")}
              value={joinQuestion}
              onChange={(e) => setJoinQuestion(e.target.value)}
              fullWidth
              size="small"
              placeholder={t("groups.joinQuestionPlaceholder")}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || !slug.trim() || isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting ? t("groups.creating") : t("groups.submitCreate")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
