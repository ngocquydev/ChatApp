"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Save } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";

interface ManageSettingsTabProps {
  editName: string;
  setEditName: (val: string) => void;
  editDesc: string;
  setEditDesc: (val: string) => void;
  editPrivacy: "public" | "private";
  setEditPrivacy: (val: "public" | "private") => void;
  editRequireApproval: boolean;
  setEditRequireApproval: (val: boolean) => void;
  editRequireJoinReason: boolean;
  setEditRequireJoinReason: (val: boolean) => void;
  editJoinQuestion: string;
  setEditJoinQuestion: (val: string) => void;
  isSavingSettings: boolean;
  settingsSuccess: boolean;
  settingsError: string | null;
  onSave: () => void;
}

export default function ManageSettingsTab({
  editName,
  setEditName,
  editDesc,
  setEditDesc,
  editPrivacy,
  setEditPrivacy,
  editRequireApproval,
  setEditRequireApproval,
  editRequireJoinReason,
  setEditRequireJoinReason,
  editJoinQuestion,
  setEditJoinQuestion,
  isSavingSettings,
  settingsSuccess,
  settingsError,
  onSave,
}: ManageSettingsTabProps) {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ p: 3, borderRadius: "16px", bgcolor: "background.paper", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        {t("groups.groupSettings")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cập nhật thông tin nhận diện, quyền riêng tư và quy định thành viên của hội nhóm.
      </Typography>

      {settingsSuccess && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "10px" }}>
          {t("groups.saveSettingsSuccess")}
        </Alert>
      )}

      {settingsError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px" }}>
          {settingsError}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <TextField
          label={t("groups.groupName")}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          fullWidth
          size="small"
          required
        />

        <TextField
          select
          label={t("groups.privacyLabel")}
          value={editPrivacy}
          onChange={(e) => setEditPrivacy(e.target.value as "public" | "private")}
          fullWidth
          size="small"
        >
          <MenuItem value="public">{t("groups.privacyPublicDesc")}</MenuItem>
          <MenuItem value="private">{t("groups.privacyPrivateDesc")}</MenuItem>
        </TextField>

        <TextField
          label={t("groups.descLabel")}
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
        />

        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("groups.settingsApproval")}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={editRequireApproval}
                onChange={(e) => setEditRequireApproval(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t("groups.approvalLabel")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("groups.approvalDesc")}
                </Typography>
              </Box>
            }
          />

          <Box sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={editRequireJoinReason}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditRequireJoinReason(checked);
                    if (checked) setEditRequireApproval(true);
                  }}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t("groups.joinQuestionLabel")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("groups.joinQuestionDesc")}
                  </Typography>
                </Box>
              }
            />
          </Box>

          {editRequireJoinReason && (
            <TextField
              label={t("groups.joinQuestionInputLabel")}
              value={editJoinQuestion}
              onChange={(e) => setEditJoinQuestion(e.target.value)}
              fullWidth
              size="small"
              sx={{ mt: 2 }}
              placeholder={t("groups.joinQuestionPlaceholder")}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={onSave}
            disabled={isSavingSettings || !editName.trim()}
            sx={{ borderRadius: "10px", px: 3, fontWeight: 700 }}
          >
            {isSavingSettings ? t("groups.savingSettings") : t("groups.saveSettings")}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

