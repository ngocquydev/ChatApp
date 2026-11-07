"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Camera } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { uploadMedia } from "@/services/postsApi";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";

interface ManageMediaSettingsProps {
  groupId: string;
  groupName: string;
  avatar?: string;
  coverImage?: string;
  onMediaUpdated: (updated: Partial<CommunityGroupItem>) => void;
}

export default function ManageMediaSettings({
  groupId,
  groupName,
  avatar,
  coverImage,
  onMediaUpdated,
}: ManageMediaSettingsProps) {
  const { t } = useTranslation();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await uploadMedia(file);
      const updated = await communityGroupsApi.updateGroup(groupId, { avatar: res.url });
      onMediaUpdated(updated);
      setSuccessMsg(t("groups.uploadSuccess"));
    } catch (err) {
      console.error("Lỗi cập nhật ảnh đại diện:", err);
      setErrorMsg(t("groups.saveSettingsError"));
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCover(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await uploadMedia(file);
      const updated = await communityGroupsApi.updateGroup(groupId, { coverImage: res.url });
      onMediaUpdated(updated);
      setSuccessMsg(t("groups.uploadSuccess"));
    } catch (err) {
      console.error("Lỗi cập nhật ảnh bìa:", err);
      setErrorMsg(t("groups.saveSettingsError"));
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  return (
    <Card variant="outlined" sx={{ p: 3, borderRadius: "16px", bgcolor: "background.paper", mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        {t("groups.groupMediaSettingsTitle")}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {t("groups.groupMediaSettingsDesc")}
      </Typography>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
        {/* Avatar / Logo Section */}
        <Box sx={{ p: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("groups.groupAvatarLabel")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src={avatar || undefined}
              sx={{ width: 64, height: 64, bgcolor: "primary.main", fontWeight: 700, fontSize: "1.5rem" }}
            >
              {groupName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
              <Button
                variant="outlined"
                size="small"
                disabled={isUploadingAvatar}
                onClick={() => avatarInputRef.current?.click()}
                startIcon={isUploadingAvatar ? <CircularProgress size={14} /> : <Camera size={14} />}
                sx={{ borderRadius: "8px", fontWeight: 600, textTransform: "none" }}
              >
                {isUploadingAvatar ? t("groups.uploadingImage") : t("groups.changeAvatar")}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Cover / Background Section */}
        <Box sx={{ p: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("groups.groupCoverLabel")}
          </Typography>
          <Box
            sx={{
              height: 64,
              borderRadius: "8px",
              mb: 1.5,
              backgroundImage: coverImage
                ? `url(${coverImage})`
                : "linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-tone-fx-4f46e5) 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverUpload}
            accept="image/*"
            style={{ display: "none" }}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={isUploadingCover}
            onClick={() => coverInputRef.current?.click()}
            startIcon={isUploadingCover ? <CircularProgress size={14} /> : <Camera size={14} />}
            sx={{ borderRadius: "8px", fontWeight: 600, textTransform: "none" }}
          >
            {isUploadingCover ? t("groups.uploadingImage") : t("groups.changeCover")}
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
