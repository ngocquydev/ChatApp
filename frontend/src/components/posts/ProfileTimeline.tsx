"use client";

import { useEffect, useState } from "react";
import { Box, Grid } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";
import { APP_BAR_HEIGHT } from "@/theme/tokens";
import { fetchUserPhotos, fetchUserPosts, type PhotoItem, type PublicProfile } from "@/services/postsApi";
import PostFeed from "./PostFeed";
import ProfileSidebar from "./ProfileSidebar";

const PAGE_SIZE = 10;

interface ProfileTimelineProps {
  userId: string;
  /** true = hồ sơ của chính mình (có ô soạn bài, được xóa bài) */
  isOwner: boolean;
  profile: PublicProfile | null;
  currentUserId?: string;
}

/** Dòng thời gian kiểu Facebook: cột trái (Giới thiệu/Ảnh/Bạn bè) + cột phải (soạn bài, bài viết). */
export default function ProfileTimeline({ userId, isOwner, profile, currentUserId }: ProfileTimelineProps) {
  const { tr } = useTranslation();
  const [photos, setPhotos] = useState<PhotoItem[] | null>(null);
  const [photosVersion, setPhotosVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchUserPhotos(userId, 9)
      .then((items) => {
        if (!cancelled) setPhotos(items);
      })
      .catch(() => {
        // Khung "Ảnh" là phụ: lỗi thì coi như chưa có ảnh, không chặn bài viết
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, photosVersion]);

  const name = profile?.user.name;

  return (
    <Grid container spacing={2.5}>
      <Grid
        size={{ xs: 12, md: 5 }}
        sx={{
          alignSelf: "stretch",
        }}
      >
        <Box
          sx={{
            position: { xs: "static", md: "sticky" },
            top: { xs: "auto", md: `${APP_BAR_HEIGHT + 16}px` },
            maxHeight: { md: `calc(100dvh - ${APP_BAR_HEIGHT + 32}px)` },
            overflowY: { md: "auto" },
            pr: { md: 0.5 },
            zIndex: 2,
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "divider",
              borderRadius: 4,
            },
          }}
        >
          <ProfileSidebar profile={profile} photos={photos} currentUserId={currentUserId} isOwner={isOwner} />
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <PostFeed
          userId={userId}
          loadPage={(after) => fetchUserPosts(userId, { limit: PAGE_SIZE, after })}
          canCompose={isOwner}
          emptyTitle={tr("Chưa có bài viết nào", "No posts yet")}
          emptyDescription={
            isOwner
              ? tr("Hãy chia sẻ điều gì đó ở khung phía trên để bắt đầu dòng thời gian của bạn.", "Share something above to start your timeline.")
              : tr(`${name ?? "Người này"} chưa có bài viết nào mà bạn xem được.`, `${name ?? "This user"} hasn't shared any posts visible to you yet.`)
          }
          onOwnPostsChanged={() => setPhotosVersion((v) => v + 1)}
        />
      </Grid>
    </Grid>
  );
}
