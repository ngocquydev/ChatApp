"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Box, ButtonBase, Link, Paper, Skeleton, Typography } from "@mui/material";
import { CalendarDays, Info, Users } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import { useTranslation } from "@/i18n/useTranslation";
import { mediaUrl, type PhotoItem, type PublicProfile } from "@/services/postsApi";
import ImageLightbox from "./ImageLightbox";
import { profileHref } from "./PostAuthorHeader";

interface ProfileSidebarProps {
  profile: PublicProfile | null;
  /** null = đang tải */
  photos: PhotoItem[] | null;
  currentUserId?: string;
  isOwner: boolean;
}

const cardSx = {
  p: 2,
  borderRadius: "16px",
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
} as const;

// Trên mobile chỉ hiện 6 ô đầu để cột giới thiệu không quá dài
const mobileHidden = (index: number) => (index >= 6 ? { xs: "none", md: "block" } : "block");

function formatJoined(createdAt?: string, locale = "vi-VN") {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/** Cột trái của hồ sơ kiểu Facebook: Giới thiệu · Ảnh · Bạn bè. */
export default function ProfileSidebar({ profile, photos, currentUserId, isOwner }: ProfileSidebarProps) {
  const { tr, language } = useTranslation();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const joined = formatJoined(profile?.user.createdAt, language === "en" ? "en-US" : "vi-VN");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Paper elevation={0} component="section" aria-labelledby="profile-intro-title" sx={cardSx}>
        <Typography id="profile-intro-title" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {tr("Giới thiệu", "Intro")}
        </Typography>
        {!profile ? (
          <>
            <Skeleton width="90%" />
            <Skeleton width="60%" />
          </>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start", color: "text.secondary" }}>
              <Box aria-hidden sx={{ display: "flex", mt: 0.25 }}>
                <Info size={18} />
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {profile.user.bio ||
                  (isOwner
                    ? tr("Bạn chưa có tiểu sử. Vào “Chỉnh sửa thông tin” để thêm.", "You don't have a bio yet. Go to “Edit Info” to add one.")
                    : tr("Người này chưa có tiểu sử.", "This user hasn't added a bio yet."))}
              </Typography>
            </Box>
            {joined && (
              <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", color: "text.secondary" }}>
                <Box aria-hidden sx={{ display: "flex" }}>
                  <CalendarDays size={18} />
                </Box>
                <Typography variant="body2">
                  {tr("Tham gia", "Joined")} {joined}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", color: "text.secondary" }}>
              <Box aria-hidden sx={{ display: "flex" }}>
                <Users size={18} />
              </Box>
              <Typography variant="body2">
                {profile.friendCount} {tr("bạn bè", "friends")}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>

      <Paper elevation={0} component="section" aria-labelledby="profile-photos-title" sx={cardSx}>
        <Typography id="profile-photos-title" variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
          {tr("Ảnh", "Photos")}
        </Typography>
        {photos === null ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5 }} aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" sx={{ aspectRatio: "1 / 1", height: "auto" }} />
            ))}
          </Box>
        ) : photos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {tr("Chưa có ảnh nào.", "No photos yet.")}
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0.5 }}>
            {photos.map((p, i) => (
              <ButtonBase
                key={`${p.postId}-${p.url}`}
                onClick={() => setLightbox(mediaUrl(p.url))}
                aria-label={tr(`Xem ảnh ${i + 1}`, `View photo ${i + 1}`)}
                sx={{ display: mobileHidden(i), aspectRatio: "1 / 1", overflow: "hidden", borderRadius: "8px", bgcolor: "action.hover" }}
              >
                <Box component="img" src={mediaUrl(p.url)} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </ButtonBase>
            ))}
          </Box>
        )}
      </Paper>

      <Paper elevation={0} component="section" aria-labelledby="profile-friends-title" sx={cardSx}>
        <Typography id="profile-friends-title" variant="h6" component="h2" sx={{ fontWeight: 700 }}>
          {tr("Bạn bè", "Friends")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          {profile ? `${profile.friendCount} ${tr("người bạn", "friends")}` : tr("Đang tải…", "Loading…")}
        </Typography>
        {!profile ? (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }} aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={86} />
            ))}
          </Box>
        ) : profile.friendsPreview.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {tr("Chưa có bạn bè nào.", "No friends yet.")}
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {profile.friendsPreview.map((f, i) => (
              <Link
                key={f._id}
                component={NextLink}
                href={profileHref(f._id, currentUserId)}
                underline="none"
                color="text.primary"
                sx={{ display: mobileHidden(i), textAlign: "center", minWidth: 0, borderRadius: "8px", p: 0.5, "&:hover": { bgcolor: "action.hover" } }}
              >
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <PresenceAvatar name={f.name} src={f.avatar} size={56} hidePresence />
                </Box>
                <Typography variant="caption" noWrap sx={{ display: "block", mt: 0.5, fontWeight: 600 }}>
                  {f.name}
                </Typography>
              </Link>
            ))}
          </Box>
        )}
      </Paper>

      <ImageLightbox src={lightbox} alt={tr("Ảnh trong hồ sơ", "Profile photo")} onClose={() => setLightbox(null)} />
    </Box>
  );
}
