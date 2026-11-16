"use client";

import { useRef, useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { Camera } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { uploadMedia } from "@/services/postsApi";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";

interface GroupCoverBannerProps {
  groupId: string;
  coverImage?: string;
  canManage: boolean;
  onUpdateCover?: (updated: Partial<CommunityGroupItem>) => void;
}

export default function GroupCoverBanner({
  groupId,
  coverImage,
  canManage,
  onUpdateCover,
}: GroupCoverBannerProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadMedia(file);
      const updated = await communityGroupsApi.updateGroup(groupId, {
        coverImage: res.url,
      });
      onUpdateCover?.(updated);
    } catch (err) {
      console.error("Lỗi cập nhật ảnh bìa nhóm:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Box
      sx={{
        height: { xs: 150, sm: 220, md: 260 },
        bgcolor: "primary.main",
        backgroundImage: coverImage
          ? `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%), url(${coverImage})`
          : "linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-tone-fx-4f46e5) 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      {canManage && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            startIcon={
              isUploading ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Camera size={15} />
              )
            }
            aria-label={t("groups.changeCover")}
            sx={{
              position: "absolute",
              bottom: 12,
              right: 12,
              bgcolor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(6px)",
              color: "common.white",
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.85)" },
              borderRadius: "10px",
              fontSize: "0.8125rem",
              fontWeight: 700,
              textTransform: "none",
              px: 1.5,
              py: 0.6,
              zIndex: 3,
            }}
          >
            {isUploading ? t("groups.uploadingImage") : t("groups.changeCover")}
          </Button>
        </>
      )}
    </Box>
  );
}

