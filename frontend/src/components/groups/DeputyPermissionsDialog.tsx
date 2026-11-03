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
  onSave: (data: {
    userId: string;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }) => Promise<void>;
}

export default function DeputyPermissionsDialog({
  open,
  member,
  isSubmitting = false,
  onClose,
  onSave,
}: DeputyPermissionsDialogProps) {
  const { t } = useTranslation();
  const [canRemoveMembers, setCanRemoveMembers] = useState(true);
  const [canMuteComments, setCanMuteComments] = useState(true);
  const [canBlockPosting, setCanBlockPosting] = useState(true);

  useEffect(() => {
    if (member) {
      if (member.deputyPermissions) {
        setCanRemoveMembers(Boolean(member.deputyPermissions.canRemoveMembers));
        setCanMuteComments(Boolean(member.deputyPermissions.canMuteComments));
        setCanBlockPosting(Boolean(member.deputyPermissions.canBlockPosting));
      } else {
        setCanRemoveMembers(true);
        setCanMuteComments(true);
        setCanBlockPosting(true);
      }
    }
  }, [member]);

  if (!member) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      userId: member._id,
      canRemoveMembers,
      canMuteComments,
      canBlockPosting,
    });
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
              <Shield size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {t("groups.deputyModalTitle")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("groups.deputyModalDesc")}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label={t("common.close")}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            pt: "20px !important",
            px: 3,
            pb: 2,
          }}
        >
          {/* Member info card */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              borderRadius: "14px",
              bgcolor: "var(--mui-palette-neutral-100)",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Avatar src={member.avatar || undefined} sx={{ width: 44, height: 44, bgcolor: "primary.main" }}>
              {member.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {member.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("groups.appointDeputy")}
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
            {t("groups.deputyModalDesc")}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Permission 1: Remove member */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                border: "1px solid",
                borderColor: canRemoveMembers ? "primary.main" : "divider",
                bgcolor: canRemoveMembers ? "rgba(24, 119, 242, 0.04)" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canRemoveMembers}
                    onChange={(e) => setCanRemoveMembers(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t("groups.permRemoveMembers")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {t("groups.permRemoveMembersDesc")}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              />
            </Box>

            {/* Permission 2: Mute comments */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                border: "1px solid",
                borderColor: canMuteComments ? "primary.main" : "divider",
                bgcolor: canMuteComments ? "rgba(24, 119, 242, 0.04)" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canMuteComments}
                    onChange={(e) => setCanMuteComments(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t("groups.permMuteComments")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {t("groups.permMuteCommentsDesc")}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              />
            </Box>

            {/* Permission 3: Block posting */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "12px",
                border: "1px solid",
                borderColor: canBlockPosting ? "primary.main" : "divider",
                bgcolor: canBlockPosting ? "rgba(24, 119, 242, 0.04)" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={canBlockPosting}
                    onChange={(e) => setCanBlockPosting(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t("groups.permBlockPosting")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {t("groups.permBlockPostingDesc")}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ borderRadius: "10px" }}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSubmitting ? t("common.loading") : t("groups.savePermissions")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

