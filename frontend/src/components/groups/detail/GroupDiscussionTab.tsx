"use client";

import { Alert, Box, Grid } from "@mui/material";
import { useTranslation } from "@/i18n/useTranslation";
import { CommunityGroupItem, GroupViewerPermissions } from "@/services/communityGroupsApi";
import PostFeed from "@/components/posts/PostFeed";
import { fetchGroupPosts } from "@/services/postsApi";
import GroupSidebar from "./GroupSidebar";

interface GroupDiscussionTabProps {
  group: CommunityGroupItem;
  isMember: boolean;
  viewerPermissions: GroupViewerPermissions;
  onSwitchTab: (tabIndex: number) => void;
}

export default function GroupDiscussionTab({
  group,
  isMember,
  viewerPermissions,
  onSwitchTab,
}: GroupDiscussionTabProps) {
  const { t } = useTranslation();

  return (
    <Grid container spacing={3}>
      {/* Cột chính: Bài viết & Thảo luận */}
      <Grid size={{ xs: 12, md: 8 }}>
        {viewerPermissions?.isBannedPosting && (
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: "12px", fontWeight: 600 }}>
            {t("groups.bannedPostingBanner")}
          </Alert>
        )}

        {viewerPermissions?.isMutedComments && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: "12px", fontWeight: 600 }}>
            {t("groups.mutedCommentsBanner")}
          </Alert>
        )}

        <PostFeed
          loadPage={(cursor) => fetchGroupPosts(group._id, { after: cursor ?? undefined })}
          canCompose={isMember && !viewerPermissions?.isBannedPosting}
          emptyTitle={t("groups.noPostsYet")}
          emptyDescription={t("groups.noPostsYetDesc")}
          groupId={group._id}
        />
      </Grid>

      {/* Cột phụ: Giới thiệu & Quy tắc */}
      <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: "none", md: "block" } }}>
        <GroupSidebar
          group={group}
          onViewAllRules={() => onSwitchTab(1)}
          onViewAllMedia={() => onSwitchTab(3)}
        />
      </Grid>
    </Grid>
  );
}
