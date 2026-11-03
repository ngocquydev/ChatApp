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
import { Check, Globe, Lock, LogOut, Plus, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import PostFeed from "@/components/posts/PostFeed";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { fetchGroupPosts } from "@/services/postsApi";

export default function GroupFeed({ slug }: { slug: string }) {
  const { tr } = useTranslation();
  const [data, setData] = useState<{
    group: CommunityGroupItem;
    isMember: boolean;
    isPending: boolean;
    isAdmin: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    communityGroupsApi
      .getGroupBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setIsMember(res.isMember);
        setIsPending(res.isPending);
        setMemberCount(res.group.memberCount);
      })
      .catch((err) => {
        console.error("Lỗi tải hội nhóm:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleJoinOrLeave = async () => {
    if (!data?.group || isActionPending) return;
    setIsActionPending(true);
    try {
      if (isMember) {
        const res = await communityGroupsApi.leaveGroup(data.group._id);
        setIsMember(false);
        setIsPending(false);
        setMemberCount(res.memberCount);
      } else {
        const res = await communityGroupsApi.joinGroup(data.group._id);
        if (res.status === "joined") {
          setIsMember(true);
          setIsPending(false);
        } else {
          setIsPending(true);
        }
        setMemberCount(res.memberCount);
      }
    } catch (e) {
      console.error("Lỗi tham gia/rời nhóm:", e);
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

  if (!data?.group) {
    return (
      <Container maxWidth="md" sx={{ py: 6, pt: "80px" }}>
        <EmptyState
          icon={<Users size={48} />}
          title={tr("Không tìm thấy Hội nhóm", "Group not found")}
          description={tr(
            "Hội nhóm bạn tìm kiếm không tồn tại hoặc đã bị xóa.",
            "The community group you are looking for does not exist or has been deleted."
          )}
        />
      </Container>
    );
  }

  const { group, isAdmin } = data;

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "var(--mui-palette-neutral-100)",
        pt: { xs: "78px", sm: "84px", md: "88px" },
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
            backgroundImage: group.coverImage ? `url(${group.coverImage})` : undefined,
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
                src={group.avatar}
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
                {group.name.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ pb: 0.5 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {group.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {group.privacy === "public" ? (
                      <Globe size={13} color="var(--mui-palette-text-secondary)" />
                    ) : (
                      <Lock size={13} color="var(--mui-palette-text-secondary)" />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {group.privacy === "public"
                        ? tr("Nhóm công khai", "Public group")
                        : tr("Nhóm riêng tư", "Private group")}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    · {memberCount} {tr("thành viên", "members")}
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
                variant={isMember ? "outlined" : "contained"}
                color={isMember ? "inherit" : "primary"}
                startIcon={
                  isMember ? <LogOut size={16} /> : isPending ? <Check size={16} /> : <Plus size={16} />
                }
                onClick={() => void handleJoinOrLeave()}
                disabled={isActionPending || isPending}
                sx={{
                  borderRadius: "12px",
                  px: 2.5,
                  fontWeight: 700,
                  flex: { xs: 1, sm: "initial" },
                }}
              >
                {isMember
                  ? tr("Rời nhóm", "Leave Group")
                  : isPending
                    ? tr("Đã gửi yêu cầu", "Requested")
                    : tr("Tham gia nhóm", "Join Group")}
              </Button>
            </Box>
          </Box>

          {group.description && (
            <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                {group.description}
              </Typography>
            </Box>
          )}
        </Box>
      </Card>

      {/* Bài viết của nhóm */}
      <Box sx={{ mt: 3 }}>
        {group.privacy === "private" && !isMember ? (
          <Box sx={{ textAlign: "center", py: 5, px: 2, bgcolor: "background.paper", borderRadius: "16px", border: "1px solid", borderColor: "divider" }}>
            <Lock size={36} color="var(--mui-palette-text-secondary)" style={{ marginBottom: 12 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              {tr("Nhóm riêng tư", "Private Group")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tr(
                "Nội dung và bài viết trong nhóm này chỉ hiển thị với các thành viên. Hãy tham gia nhóm để cùng thảo luận!",
                "Content and posts in this group are visible to members only. Join the group to participate!"
              )}
            </Typography>
          </Box>
        ) : (
          <PostFeed
            loadPage={(after) => fetchGroupPosts(group._id, { after: after ?? undefined })}
            canCompose={isMember}
            groupId={group._id}
            defaultPrivacy={group.privacy === "private" ? "friends" : "public"}
            emptyTitle={tr("Chưa có bài viết nào", "No posts yet")}
            emptyDescription={tr(
              "Hội nhóm này chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!",
              "This group does not have any posts yet. Be the first to share!"
            )}
          />
        )}
      </Box>
        </Container>
      </Box>
    </Box>
  );
}
