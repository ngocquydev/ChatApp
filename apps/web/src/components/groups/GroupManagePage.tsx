"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar, Box, Button, Card, Chip, CircularProgress, Tab, Tabs, Typography,
} from "@mui/material";
import {
  ArrowLeft, Crown, Flag, Settings, ShieldAlert, ShieldCheck, UserCheck, Users,
} from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import {
  communityGroupsApi,
  CommunityGroupItem,
  GroupViewerPermissions,
} from "@/services/communityGroupsApi";
import LeftSidebar from "@/components/layout/LeftSidebar";
import GroupMembersTab from "./GroupMembersTab";
import GroupRequestsTab from "./GroupRequestsTab";
import GroupReportsTab from "./GroupReportsTab";
import ManageOverviewMetrics from "./manage/ManageOverviewMetrics";
import ManageSettingsTab from "./manage/ManageSettingsTab";
import ManageDangerZone from "./manage/ManageDangerZone";

interface GroupManagePageProps {
  slug: string;
}

export default function GroupManagePage({ slug }: GroupManagePageProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [group, setGroup] = useState<CommunityGroupItem | null>(null);
  const [viewerPermissions, setViewerPermissions] = useState<GroupViewerPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Metrics
  const [memberCount, setMemberCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [deputiesCount, setDeputiesCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrivacy, setEditPrivacy] = useState<"public" | "private">("public");
  const [editRequireApproval, setEditRequireApproval] = useState(false);
  const [editRequireJoinReason, setEditRequireJoinReason] = useState(false);
  const [editJoinQuestion, setEditJoinQuestion] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Delete state
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    communityGroupsApi
      .getGroupBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        setGroup(res.group);
        setViewerPermissions(res.viewerPermissions);
        setMemberCount(res.group.memberCount || 0);
        setPendingCount(res.group.pendingMemberIds?.length || 0);
        setDeputiesCount(res.group.deputies?.length || 0);

        setEditName(res.group.name || "");
        setEditDesc(res.group.description || "");
        setEditPrivacy(res.group.privacy || "public");
        setEditRequireApproval(!!res.group.requireApproval);
        setEditRequireJoinReason(!!res.group.requireJoinReason);
        setEditJoinQuestion(res.group.joinQuestion || "");

        communityGroupsApi
          .getCommentReports(res.group._id, "pending")
          .then((reps) => {
            if (isMounted) setReportsCount(reps?.length || 0);
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (isMounted) setError("Không thể tải thông tin quản trị hội nhóm.");
        console.error("Lỗi:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleSaveSettings = async () => {
    if (!group) return;
    setIsSavingSettings(true);
    setSettingsSuccess(false);
    setSettingsError(null);
    try {
      const updated = await communityGroupsApi.updateGroup(group._id, {
        name: editName.trim(),
        description: editDesc.trim(),
        privacy: editPrivacy,
        requireApproval: editRequireApproval,
        requireJoinReason: editRequireJoinReason,
        joinQuestion: editJoinQuestion.trim() || undefined,
      });
      setGroup(updated);
      setSettingsSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("groups.saveSettingsError");
      setSettingsError(msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    try {
      setIsDeletingGroup(true);
      setDeleteError(null);
      await communityGroupsApi.deleteGroup(group._id);
      router.push("/groups");
    } catch (err: unknown) {
      console.error("Lỗi xóa nhóm:", err);
      setDeleteError(t("groups.deleteGroupError"));
    } finally {
      setIsDeletingGroup(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error || !group || !viewerPermissions || (!viewerPermissions.isAdmin && !viewerPermissions.isDeputy)) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", py: 8, px: 2, textAlign: "center" }}>
        <Card variant="outlined" sx={{ p: 4, borderRadius: "16px", bgcolor: "background.paper" }}>
          <ShieldAlert size={48} style={{ margin: "0 auto 16px", color: "var(--mui-palette-error-main)" }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
            {t("groups.noPermissionManage")}
          </Typography>
          <Button variant="contained" startIcon={<ArrowLeft size={18} />} onClick={() => router.push(`/groups/${slug}`)} sx={{ mt: 2 }}>
            {t("groups.backToGroup")}
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "var(--mui-palette-neutral-100)", pt: { xs: "78px", sm: "84px", md: "88px" } }}>
      <LeftSidebar />
      <Box sx={{ flex: 1, ml: { md: "280px", lg: "320px", xl: "350px" }, p: { xs: 2, sm: 3 }, minWidth: 0 }}>
        <Box sx={{ maxWidth: 1000, mx: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
            <Button variant="text" startIcon={<ArrowLeft size={18} />} onClick={() => router.push(`/groups/${slug}`)} sx={{ fontWeight: 600, color: "text.secondary" }}>
              {t("groups.backToGroup")}
            </Button>
            <Chip
              icon={viewerPermissions.isAdmin ? <Crown size={15} /> : <ShieldCheck size={15} />}
              label={viewerPermissions.isAdmin ? t("groups.adminBadge") : t("groups.deputyBadge")}
              color={viewerPermissions.isAdmin ? "primary" : "info"}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>

          <Card variant="outlined" sx={{ p: 2.5, borderRadius: "16px", mb: 3, display: "flex", alignItems: "center", gap: 2, bgcolor: "background.paper" }}>
            <Avatar src={group.avatar || undefined} sx={{ width: 56, height: 56, bgcolor: "primary.main", fontWeight: 700 }}>
              {group.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{group.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                /groups/{group.slug} · {group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
              </Typography>
            </Box>
          </Card>

          <ManageOverviewMetrics memberCount={memberCount} pendingCount={pendingCount} deputiesCount={deputiesCount} reportsCount={reportsCount} />

          <Card sx={{ borderRadius: "16px", mb: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 48, px: 1 }}>
              <Tab icon={<Settings size={18} />} iconPosition="start" label={t("groups.tabSettings")} />
              <Tab icon={<UserCheck size={18} />} iconPosition="start" label={pendingCount > 0 ? `${t("groups.tabRequests")} (${pendingCount})` : t("groups.tabRequests")} />
              <Tab icon={<Users size={18} />} iconPosition="start" label={memberCount > 0 ? `${t("groups.tabMembers")} (${memberCount})` : t("groups.tabMembers")} />
              <Tab icon={<Flag size={18} />} iconPosition="start" label={reportsCount > 0 ? `${t("reports.tabReports")} (${reportsCount})` : t("reports.tabReports")} />
            </Tabs>
          </Card>

          {currentTab === 0 && (
            <>
              <ManageSettingsTab
                groupId={group._id}
                avatar={group.avatar}
                coverImage={group.coverImage}
                onMediaUpdated={(updated) => setGroup((prev) => (prev ? { ...prev, ...updated } : prev))}
                editName={editName}
                setEditName={setEditName}
                editDesc={editDesc}
                setEditDesc={setEditDesc}
                editPrivacy={editPrivacy}
                setEditPrivacy={setEditPrivacy}
                editRequireApproval={editRequireApproval}
                setEditRequireApproval={setEditRequireApproval}
                editRequireJoinReason={editRequireJoinReason}
                setEditRequireJoinReason={setEditRequireJoinReason}
                editJoinQuestion={editJoinQuestion}
                setEditJoinQuestion={setEditJoinQuestion}
                isSavingSettings={isSavingSettings}
                settingsSuccess={settingsSuccess}
                settingsError={settingsError}
                onSave={handleSaveSettings}
              />
              {viewerPermissions.isAdmin && (
                <ManageDangerZone onDeleteGroup={handleDeleteGroup} isDeleting={isDeletingGroup} error={deleteError} />
              )}
            </>
          )}

          {currentTab === 1 && <GroupRequestsTab groupId={group._id} onRequestCountChange={setPendingCount} onMemberCountChange={setMemberCount} />}
          {currentTab === 2 && <GroupMembersTab groupId={group._id} viewerPermissions={viewerPermissions} onMemberCountChange={setMemberCount} />}
          {currentTab === 3 && <GroupReportsTab groupId={group._id} />}
        </Box>
      </Box>
    </Box>
  );
}
