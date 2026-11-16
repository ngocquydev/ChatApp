"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Skeleton } from "@mui/material";
import { Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  CommunityGroupItem,
  GroupViewerPermissions,
} from "@/services/communityGroupsApi";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import LeftSidebar from "@/components/layout/LeftSidebar";
import GroupHeader from "./detail/GroupHeader";
import GroupNavTabs from "./detail/GroupNavTabs";
import GroupDiscussionTab from "./detail/GroupDiscussionTab";
import GroupAboutTab from "./detail/GroupAboutTab";
import GroupMembersTab from "./GroupMembersTab";
import GroupMediaTab from "./detail/GroupMediaTab";
import JoinQuestionDialog from "./JoinQuestionDialog";

export default function GroupFeed({ slug }: { slug: string }) {
  const { t } = useTranslation();
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
  const [currentTab, setCurrentTab] = useState(0);

  // Dialogs
  const [joinQuestionOpen, setJoinQuestionOpen] = useState(false);
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    communityGroupsApi
      .getGroupBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setIsMember(Boolean(res.isMember || res.isAdmin || res.isDeputy));
        setIsPending(Boolean(res.isPending && !res.isMember && !res.isAdmin && !res.isDeputy));
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

  const handleJoinClick = () => {
    if (!data?.group || isActionPending) return;
    if (data.group.requireJoinReason) {
      setJoinQuestionOpen(true);
      return;
    }
    void handleDirectJoin();
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

  const handleConfirmLeave = async () => {
    if (!data?.group) return;
    setIsLeavingGroup(true);
    try {
      const res = await communityGroupsApi.leaveGroup(data.group._id);
      setIsMember(false);
      setIsPending(false);
      setMemberCount(res.memberCount);
      setLeaveConfirmOpen(false);
    } catch (e) {
      console.error("Lỗi rời nhóm:", e);
    } finally {
      setIsLeavingGroup(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3, pt: "88px" }}>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: "20px", mb: 2.5 }} />
        <Skeleton variant="text" width={260} height={40} />
      </Container>
    );
  }

  if (!data?.group) {
    return (
      <Container maxWidth="md" sx={{ py: 6, pt: "88px" }}>
        <EmptyState
          icon={<Users size={48} />}
          title={t("groups.noGroupsFound")}
          description={t("groups.noGroupsDesc")}
        />
      </Container>
    );
  }

  const { group, isAdmin, isDeputy, viewerPermissions } = data;
  const canManage = isAdmin || isDeputy;

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
      <Box sx={{ flex: 1, ml: { md: "280px", lg: "320px", xl: "350px" }, p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
        <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
          {/* Header banner, avatar, title & action buttons */}
          <GroupHeader
            group={group}
            isMember={isMember}
            isPending={isPending}
            canManage={canManage}
            memberCount={memberCount}
            isActionPending={isActionPending}
            onJoin={handleJoinClick}
            onLeave={() => setLeaveConfirmOpen(true)}
            onManage={() => router.push(`/groups/${group.slug}/manage`)}
            onUpdateGroup={(updated) => {
              setData((prev) => (prev ? { ...prev, group: { ...prev.group, ...updated } } : prev));
            }}
          />

          {/* Sticky Navigation Tabs */}
          <GroupNavTabs currentTab={currentTab} onChange={setCurrentTab} memberCount={memberCount} />

          {/* Tab Views */}
          {currentTab === 0 && (
            <GroupDiscussionTab
              group={group}
              isMember={isMember}
              viewerPermissions={viewerPermissions}
              onSwitchTab={setCurrentTab}
            />
          )}

          {currentTab === 1 && <GroupAboutTab group={group} />}

          {currentTab === 2 && (
            <GroupMembersTab
              groupId={group._id}
              viewerPermissions={viewerPermissions}
              onMemberCountChange={setMemberCount}
            />
          )}

          {currentTab === 3 && <GroupMediaTab groupId={group._id} />}

          {/* Join Question Dialog */}
          <JoinQuestionDialog
            open={joinQuestionOpen}
            question={group.joinQuestion}
            isSubmitting={isSubmittingJoin}
            onClose={() => setJoinQuestionOpen(false)}
            onSubmit={handleSubmitJoinReason}
          />

          {/* Confirm Leave Dialog */}
          <ConfirmDialog
            open={leaveConfirmOpen}
            onClose={() => setLeaveConfirmOpen(false)}
            onConfirm={handleConfirmLeave}
            pending={isLeavingGroup}
            title={t("groups.leaveConfirmTitle")}
            description={t("groups.leaveConfirmDesc")}
            confirmLabel={t("groups.leaveGroup")}
          />
        </Container>
      </Box>
    </Box>
  );
}
