"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Skeleton,
  Typography,
} from "@mui/material";
import { Check, Flag, Plus, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { pagesApi, PageItem } from "@/services/pagesApi";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import EmptyState from "@/components/common/EmptyState";
import PostFeed from "@/components/posts/PostFeed";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { fetchPagePosts } from "@/services/postsApi";
import { v } from "@/theme/tokens";

export default function PageProfile({ slug }: { slug: string }) {
  const { tr } = useTranslation();
  const [data, setData] = useState<{
    page: PageItem;
    isFollowing: boolean;
    isAdmin: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    pagesApi
      .getPageBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setIsFollowing(res.isFollowing);
        setFollowerCount(res.page.followerCount);
      })
      .catch((err) => {
        console.error("Lỗi tải trang:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleToggleFollow = async () => {
    if (!data?.page || isActionPending) return;
    setIsActionPending(true);
    try {
      const res = await pagesApi.toggleFollowPage(data.page._id);
      setIsFollowing(res.isFollowing);
      setFollowerCount(res.followerCount);
    } catch (e) {
      console.error("Lỗi theo dõi trang:", e);
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 3, pt: "80px" }}>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: "20px", mb: 2 }} />
        <Skeleton variant="text" width={220} height={36} />
      </Container>
    );
  }

  if (!data?.page) {
    return (
      <Container maxWidth="md" sx={{ py: 6, pt: "80px" }}>
        <EmptyState
          icon={<Flag size={48} />}
          title={tr("Không tìm thấy Trang", "Page not found")}
          description={tr(
            "Trang bạn tìm kiếm không tồn tại hoặc đã bị xóa.",
            "The page you are looking for does not exist or has been deleted."
          )}
        />
      </Container>
    );
  }

  const { page, isAdmin } = data;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "var(--mui-palette-neutral-100)",
        pt: { xs: "70px", md: "76px" },
      }}
    >
      <LeftSidebar />
      <Box
        sx={{
          flex: 1,
          ml: { md: "280px", lg: "320px", xl: "350px" },
          p: { xs: 2, sm: 3 },
          minWidth: 0,
        }}
      >
        <Container maxWidth="md" sx={{ py: 1 }}>
      {/* Cover image & avatar card */}
      <Card
        sx={{
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          mb: 3,
        }}
      >
        <Box
          sx={{
            height: { xs: 140, sm: 200 },
            bgcolor: "primary.main",
            backgroundImage: page.coverImage ? `url(${page.coverImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        <Box sx={{ p: { xs: 2, sm: 3 }, position: "relative" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "flex-end" },
              justifyContent: "space-between",
              gap: 2,
              mt: { xs: -7, sm: -9 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
              <Avatar
                src={page.avatar}
                sx={{
                  width: { xs: 80, sm: 110 },
                  height: { xs: 80, sm: 110 },
                  border: "4px solid",
                  borderColor: "background.paper",
                  bgcolor: "primary.main",
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                }}
              >
                {page.name.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ pb: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {page.name}
                  </Typography>
                  {page.isVerified && <VerifiedBadge size={18} />}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
                  <Chip
                    label={page.category}
                    size="small"
                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 600 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {followerCount} {tr("người theo dõi", "followers")}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
              {isAdmin && (
                <Chip
                  label={tr("Quản trị viên", "Admin")}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}

              <Button
                variant={isFollowing ? "outlined" : "contained"}
                startIcon={isFollowing ? <Check size={16} /> : <Plus size={16} />}
                onClick={() => void handleToggleFollow()}
                disabled={isActionPending}
                sx={{
                  borderRadius: "12px",
                  px: 2.5,
                  fontWeight: 700,
                  flex: { xs: 1, sm: "initial" },
                }}
              >
                {isFollowing
                  ? tr("Đang theo dõi", "Following")
                  : tr("Theo dõi", "Follow")}
              </Button>
            </Box>
          </Box>

          {page.bio && (
            <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                {page.bio}
              </Typography>
            </Box>
          )}
        </Box>
      </Card>

      {/* Bài viết của trang */}
      <Box sx={{ mt: 3 }}>
        <PostFeed
          loadPage={(after) => fetchPagePosts(page._id, { after: after ?? undefined })}
          canCompose={isAdmin}
          pageId={page._id}
          defaultPrivacy="public"
          emptyTitle={tr("Chưa có bài viết nào", "No posts yet")}
          emptyDescription={tr(
            "Trang này chưa đăng bài viết nào.",
            "This page has not posted anything yet."
          )}
        />
      </Box>
        </Container>
      </Box>
    </Box>
  );
}
