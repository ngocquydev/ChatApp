"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Typography,
} from "@mui/material";
import { Shield, X } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { DeputyPermissions } from "@/services/communityGroupsApi";

interface DeputyPermissionsDialogProps {
  open: boolean;
  member: {
    _id: string;
    name: string;
    avatar?: string | null;
    deputyPermissions?: DeputyPermissions | null;
  } | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: {
    userId: string;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }) => Promise<void>;
}

interface PermBoxProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  title: string;
  description: string;
}

function PermBox({ checked, onChange, title, description }: PermBoxProps) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: checked ? "primary.main" : "divider",
        bgcolor: checked ? "action.selected" : "transparent",
        transition: "all 0.2s ease",
      }}
    >
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} color="primary" />}
        label={
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>{description}</Typography>
          </Box>
        }
        sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
      />
    </Box>
  );
}

export default function DeputyPermissionsDialog({
  open,
  member,
  isSubmitting = false,
  onClose,
  onSubmit,
}: DeputyPermissionsDialogProps) {
  const { t } = useTranslation();
  const [canRemoveMembers, setCanRemoveMembers] = useState(true);
  const [canMuteComments, setCanMuteComments] = useState(true);
  const [canBlockPosting, setCanBlockPosting] = useState(true);

  useEffect(() => {
    if (member?.deputyPermissions) {
      setCanRemoveMembers(Boolean(member.deputyPermissions.canRemoveMembers));
      setCanMuteComments(Boolean(member.deputyPermissions.canMuteComments));
      setCanBlockPosting(Boolean(member.deputyPermissions.canBlockPosting));
    } else {
      setCanRemoveMembers(true);
      setCanMuteComments(true);
      setCanBlockPosting(true);
    }
  }, [member]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ userId: member._id, canRemoveMembers, canMuteComments, canBlockPosting });
    onClose();
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
          sx: { borderRadius: "20px", bgcolor: "background.paper", border: "1px solid", borderColor: "divider" },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: "primary.main", color: "primary.contrastText", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Shield size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{t("groups.deputyModalTitle")}</Typography>
              <Typography variant="caption" color="text.secondary">{t("groups.deputyModalDesc")}</Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")}><X size={18} /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "20px !important", px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
            <Avatar src={member.avatar || undefined} sx={{ width: 44, height: 44, bgcolor: "primary.main" }}>
              {member.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{member.name}</Typography>
              <Typography variant="caption" color="text.secondary">{t("groups.appointDeputy")}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <PermBox checked={canRemoveMembers} onChange={setCanRemoveMembers} title={t("groups.permRemoveMembers")} description={t("groups.permRemoveMembersDesc")} />
            <PermBox checked={canMuteComments} onChange={setCanMuteComments} title={t("groups.permMuteComments")} description={t("groups.permMuteCommentsDesc")} />
            <PermBox checked={canBlockPosting} onChange={setCanBlockPosting} title={t("groups.permBlockPosting")} description={t("groups.permBlockPostingDesc")} />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>{t("common.cancel")}</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}>
            {isSubmitting ? t("common.loading") : t("groups.savePermissions")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
