"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Check, Crown, FileText, Globe, Lock, LogOut, MessageSquareOff, Plus, Settings, Shield, ShieldAlert, UserCheck, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  CommunityGroupItem,
  GroupViewerPermissions,
} from "@/services/communityGroupsApi";
import EmptyState from "@/components/common/EmptyState";
import PostFeed from "@/components/posts/PostFeed";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { fetchGroupPosts } from "@/services/postsApi";
import GroupMembersTab from "./GroupMembersTab";
import GroupRequestsTab from "./GroupRequestsTab";
import JoinQuestionDialog from "./JoinQuestionDialog";

export default function GroupFeed({ slug }: { slug: string }) {
  const { tr, t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<{
    group: CommunityGroupItem;
    isMember: boolean;
    isPending: boolean;
    isAdmin: boolean;
    isDeputy: boolean;
    viewerPermissions: GroupViewerPermissions;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [isActionPending, setIsActionPending] = useState(false);

  // Tabs state
  const [currentTab, setCurrentTab] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Join Question Modal
  const [joinQuestionOpen, setJoinQuestionOpen] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);

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
        setPendingRequestsCount(res.group.pendingMemberIds?.length || 0);
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

  const handleJoinClick = () => {
    if (!data?.group || isActionPending) return;
    if (isMember) {
      void handleLeave();
      return;
    }

    if (data.group.requireJoinReason) {
      setJoinQuestionOpen(true);
      return;
    }

    void handleDirectJoin();
  };

  const handleLeave = async () => {
    if (!data?.group) return;
    setIsActionPending(true);
    try {
      const res = await communityGroupsApi.leaveGroup(data.group._id);
      setIsMember(false);
      setIsPending(false);
      setMemberCount(res.memberCount);
    } catch (e) {
      console.error("Lỗi rời nhóm:", e);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDirectJoin = async () => {
    if (!data?.group) return;
    setIsActionPending(true);
    try {
      const res = await communityGroupsApi.joinGroup(data.group._id);
      if (res.status === "joined") {
        setIsMember(true);
        setIsPending(false);
      } else {
        setIsPending(true);
      }
      setMemberCount(res.memberCount);
    } catch (e) {
      console.error("Lỗi tham gia nhóm:", e);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleSubmitJoinReason = async (reason: string) => {
    if (!data?.group) return;
    setIsSubmittingJoin(true);
    try {
      const res = await communityGroupsApi.joinGroup(data.group._id, reason);
      if (res.status === "joined") {
        setIsMember(true);
        setIsPending(false);
      } else {
        setIsPending(true);
      }
      setMemberCount(res.memberCount);
    } finally {
      setIsSubmittingJoin(false);
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

  const { group, isAdmin, isDeputy, viewerPermissions } = data;
  const canManageGroup = isAdmin || isDeputy;

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
                            ? t("groups.publicGroup")
                            : t("groups.privateGroup")}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        · {t("groups.membersCount", { count: memberCount })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" }, flexWrap: "wrap", alignItems: "center" }}>
                  {isAdmin && (
                    <Chip
                      icon={<Crown size={14} />}
                      label={t("groups.adminBadge")}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                  {isDeputy && !isAdmin && (
                    <Chip
                      icon={<Shield size={14} />}
                      label={t("groups.deputyBadge")}
                      color="info"
                      variant="filled"
                      sx={{ fontWeight: 700 }}
                    />
                  )}

                  {(isAdmin || isDeputy) && (
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<Settings size={16} />}
                      onClick={() => router.push(`/groups/${slug}/manage`)}
                      sx={{
                        borderRadius: "12px",
                        px: 2,
                        fontWeight: 700,
                      }}
                    >
                      {t("groups.manageGroup")}
                    </Button>
                  )}

                  {!isAdmin && (
                    <Button
                      variant={isMember ? "outlined" : "contained"}
                      color={isMember ? "inherit" : "primary"}
                      startIcon={
                        isMember ? <LogOut size={16} /> : isPending ? <Check size={16} /> : <Plus size={16} />
                      }
                      onClick={handleJoinClick}
                      disabled={isActionPending || isPending}
                      sx={{
                        borderRadius: "12px",
                        px: 2.5,
                        fontWeight: 700,
                        flex: { xs: 1, sm: "initial" },
                      }}
                    >
                      {isMember
                        ? t("groups.leaveGroup")
                        : isPending
                          ? t("groups.requested")
                          : t("groups.joinGroup")}
                    </Button>
                  )}
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

            {/* Navigation Tabs */}
            <Box sx={{ px: { xs: 2, sm: 3 }, borderTop: "1px solid", borderColor: "divider" }}>
              <Tabs
                value={currentTab}
                onChange={(_, val) => setCurrentTab(val)}
                textColor="primary"
                indicatorColor="primary"
                sx={{
                  "& .MuiTab-root": {
                    fontWeight: 700,
                    textTransform: "none",
                    minHeight: 48,
                    fontSize: "0.95rem",
                  },
                }}
              >
                <Tab icon={<FileText size={18} />} iconPosition="start" label={t("groups.tabPosts")} />
                <Tab
                  icon={<Users size={18} />}
                  iconPosition="start"
                  label={t("groups.tabMembers", { count: memberCount })}
                />
                {canManageGroup && (
                  <Tab
                    icon={<UserCheck size={18} />}
                    iconPosition="start"
                    label={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <span>{t("groups.tabRequests", { count: pendingRequestsCount })}</span>
                        {pendingRequestsCount > 0 && (
                          <Badge badgeContent={pendingRequestsCount} color="error" />
                        )}
                      </Box>
                    }
                  />
                )}
              </Tabs>
            </Box>
          </Card>

          {/* TAB 0: Bài viết */}
          {currentTab === 0 && (
            <Box sx={{ mt: 2 }}>
              {/* Cảnh báo người dùng nếu bị cấm đăng bài hoặc bình luận */}
              {viewerPermissions?.isBannedPosting && (
                <Alert
                  severity="error"
                  icon={<ShieldAlert size={20} />}
                  sx={{ mb: 2, borderRadius: "14px", fontWeight: 600 }}
                >
                  {t("groups.bannedPostingBanner")}
                </Alert>
              )}

              {viewerPermissions?.isMutedComments && (
                <Alert
                  severity="warning"
                  icon={<MessageSquareOff size={20} />}
                  sx={{ mb: 2, borderRadius: "14px", fontWeight: 600 }}
                >
                  {t("groups.mutedCommentsBanner")}
                </Alert>
              )}

              {group.privacy === "private" && !isMember ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 5,
                    px: 2,
                    bgcolor: "background.paper",
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Lock size={36} color="var(--mui-palette-text-secondary)" style={{ marginBottom: 12 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {t("groups.privateGroup")}
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
                  canCompose={isMember && !viewerPermissions?.isBannedPosting}
                  groupId={group._id}
                  defaultPrivacy={group.privacy === "private" ? "friends" : "public"}
                  emptyTitle={t("groups.noPostsYet")}
                  emptyDescription={t("groups.noPostsYetDesc")}
                />
              )}
            </Box>
          )}

          {/* TAB 1: Danh sách Thành viên */}
          {currentTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <GroupMembersTab
                groupId={group._id}
                viewerPermissions={viewerPermissions}
                onMemberCountChange={setMemberCount}
              />
            </Box>
          )}

          {/* TAB 2: Yêu cầu chờ duyệt */}
          {currentTab === 2 && canManageGroup && (
            <Box sx={{ mt: 2 }}>
              <GroupRequestsTab
                groupId={group._id}
                onMemberCountChange={setMemberCount}
                onRequestCountChange={setPendingRequestsCount}
              />
            </Box>
          )}

          {/* Join Question Dialog */}
          <JoinQuestionDialog
            open={joinQuestionOpen}
            question={group.joinQuestion}
            isSubmitting={isSubmittingJoin}
            onClose={() => setJoinQuestionOpen(false)}
            onSubmit={handleSubmitJoinReason}
          />
        </Container>
      </Box>
    </Box>
  );
}
