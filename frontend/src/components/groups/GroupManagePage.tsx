"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crown,
  Globe,
  Lock,
  Save,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
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

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // Metrics
  const [memberCount, setMemberCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [deputiesCount, setDeputiesCount] = useState(0);

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

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    communityGroupsApi
      .getGroupBySlug(slug)
      .then((res) => {
        if (!isMounted) return;
        setGroup(res.group);
        setViewerPermissions(res.viewerPermissions);
        setMemberCount(res.group.memberCount);
        setPendingCount(res.group.pendingMemberIds?.length || 0);
        setDeputiesCount(res.group.deputies?.length || 0);

        // Prepopulate settings form
        setEditName(res.group.name);
        setEditDesc(res.group.description || "");
        setEditPrivacy(res.group.privacy);
        setEditRequireApproval(Boolean(res.group.requireApproval));
        setEditRequireJoinReason(Boolean(res.group.requireJoinReason));
        setEditJoinQuestion(res.group.joinQuestion || "Tại sao bạn muốn tham gia nhóm này?");
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Lỗi tải thông tin quản lý nhóm:", err);
        setError("Không thể tải thông tin nhóm");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group || !editName.trim()) return;

    setIsSavingSettings(true);
    setSettingsSuccess(false);
    setSettingsError(null);

    try {
      const updated = await communityGroupsApi.updateGroup(group._id, {
        name: editName.trim(),
        description: editDesc.trim(),
        privacy: editPrivacy,
        requireApproval: editRequireApproval || editRequireJoinReason,
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

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group || !viewerPermissions) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", py: 6, px: 2, textAlign: "center" }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || t("groups.noPermissionManage")}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowLeft size={18} />}
          onClick={() => router.push(`/groups/${slug}`)}
        >
          {t("groups.backToGroup")}
        </Button>
      </Box>
    );
  }

  // Access control: only Admins and Deputies can view the management page
  if (!viewerPermissions.isAdmin && !viewerPermissions.isDeputy) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", py: 6, px: 2, textAlign: "center" }}>
        <Card variant="outlined" sx={{ p: 4, borderRadius: "16px" }}>
          <ShieldAlert size={48} style={{ margin: "0 auto 16px", color: "var(--mui-palette-error-main)" }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
            {t("groups.noPermissionManage")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Chỉ quản trị viên hoặc phó nhóm mới có quyền truy cập vào trang quản trị này.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowLeft size={18} />}
            onClick={() => router.push(`/groups/${slug}`)}
          >
            {t("groups.backToGroup")}
          </Button>
        </Card>
      </Box>
    );
  }
  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: "calc(100dvh - 56px)" }}>
      {/* Left Sidebar navigation */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          width: { md: 280, lg: 320 },
          flexShrink: 0,
        }}
      >
        <LeftSidebar />
      </Box>

      {/* Main Management Portal Content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, sm: 3, md: 4 },
          bgcolor: "background.default",
        }}
      >
        <Box sx={{ maxWidth: 1100, mx: "auto" }}>
          {/* Top navigation header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
              mb: 3,
            }}
          >
            <Button
              variant="text"
              startIcon={<ArrowLeft size={18} />}
              onClick={() => router.push(`/groups/${slug}`)}
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              {t("groups.backToGroup")}
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {viewerPermissions.isAdmin ? (
                <Chip
                  icon={<Crown size={16} />}
                  label={t("groups.adminBadge")}
                  color="primary"
                  variant="filled"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              ) : (
                <Chip
                  icon={<ShieldCheck size={16} />}
                  label={t("groups.deputyBadge")}
                  color="info"
                  variant="filled"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          {/* Group Identity Card */}
          <Card
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: "16px",
              mb: 3,
              display: "flex",
              alignItems: "center",
              gap: 2.5,
              flexWrap: "wrap",
            }}
          >
            <Avatar
              src={group.avatar || undefined}
              alt={group.name}
              sx={{
                width: 64,
                height: 64,
                bgcolor: "primary.main",
                fontSize: "1.75rem",
                fontWeight: 700,
              }}
            >
              {group.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }} color="text.primary">
                {group.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                /groups/{group.slug} · {group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
              </Typography>
            </Box>
          </Card>

          {/* Overview Metrics Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "repeat(4, 1fr)",
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Card variant="outlined" sx={{ borderRadius: "12px", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <Users size={20} color="var(--mui-palette-primary-main)" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t("groups.totalMembers")}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }} color="text.primary">
                {memberCount}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: "12px", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <Clock size={20} color="var(--mui-palette-warning-main)" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t("groups.pendingRequests")}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }} color="text.primary">
                {pendingCount}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: "12px", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                <Shield size={20} color="var(--mui-palette-info-main)" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t("groups.deputiesCount")}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }} color="text.primary">
                {deputiesCount}
              </Typography>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: "12px", p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                {group.privacy === "public" ? (
                  <Globe size={20} color="var(--mui-palette-success-main)" />
                ) : (
                  <Lock size={20} color="var(--mui-palette-text-secondary)" />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t("groups.privacyLabel")}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }} color="text.primary">
                {group.privacy === "public" ? t("groups.publicGroup") : t("groups.privateGroup")}
              </Typography>
            </Card>
          </Box>

          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={currentTab}
              onChange={(_, v) => setCurrentTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                icon={<Users size={18} />}
                iconPosition="start"
                label={t("groups.tabMembers", { count: memberCount })}
                sx={{ fontWeight: 600 }}
              />
              <Tab
                icon={<Clock size={18} />}
                iconPosition="start"
                label={t("groups.tabRequests", { count: pendingCount })}
                sx={{ fontWeight: 600 }}
              />
              {viewerPermissions.isAdmin && (
                <Tab
                  icon={<Settings size={18} />}
                  iconPosition="start"
                  label={t("groups.groupSettings")}
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Tabs>
          </Box>

          {/* Tab 0: Members and Permissions Management */}
          {currentTab === 0 && (
            <GroupMembersTab
              groupId={group._id}
              viewerPermissions={viewerPermissions}
              onMemberCountChange={(newCount) => setMemberCount(newCount)}
            />
          )}

          {/* Tab 1: Membership Requests & Join Reasons */}
          {currentTab === 1 && (
            <GroupRequestsTab
              groupId={group._id}
              onMemberCountChange={(newCount) => setMemberCount(newCount)}
              onRequestCountChange={(newCount) => setPendingCount(newCount)}
            />
          )}

          {/* Tab 2: Group Settings (Admin Only) */}
          {currentTab === 2 && viewerPermissions.isAdmin && (
            <Card variant="outlined" sx={{ borderRadius: "16px", p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }} gutterBottom>
                {t("groups.groupSettings")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Tùy chỉnh thông tin hiển thị, quyền riêng tư và quy định xét duyệt thành viên tham gia hội nhóm.
              </Typography>

              {settingsSuccess && (
                <Alert severity="success" icon={<CheckCircle2 size={18} />} sx={{ mb: 3 }}>
                  {t("groups.saveSettingsSuccess")}
                </Alert>
              )}

              {settingsError && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {settingsError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSaveSettings}>
                {/* General Information Section */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }} color="primary.main">
                  {t("groups.settingsGeneral")}
                </Typography>

                <TextField
                  fullWidth
                  label={t("groups.groupName")}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  sx={{ mb: 2.5 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label={t("groups.descLabel")}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={t("groups.descPlaceholder")}
                  sx={{ mb: 2.5 }}
                />

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="privacy-select-label">{t("groups.privacyLabel")}</InputLabel>
                  <Select
                    labelId="privacy-select-label"
                    value={editPrivacy}
                    label={t("groups.privacyLabel")}
                    onChange={(e) => setEditPrivacy(e.target.value as "public" | "private")}
                  >
                    <MenuItem value="public">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Globe size={18} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t("groups.publicGroup")}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="private">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Lock size={18} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t("groups.privateGroup")}
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* Membership & Approval Rules Section */}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }} color="primary.main">
                  {t("groups.settingsApproval")}
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    mb: 2,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editRequireApproval || editRequireJoinReason}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setEditRequireApproval(val);
                          if (!val) setEditRequireJoinReason(false);
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t("groups.approvalLabel")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("groups.approvalDesc")}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "action.hover",
                    mb: 2.5,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editRequireJoinReason}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setEditRequireJoinReason(val);
                          if (val) setEditRequireApproval(true);
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t("groups.joinQuestionLabel")}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t("groups.joinQuestionDesc")}
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                {editRequireJoinReason && (
                  <TextField
                    fullWidth
                    label={t("groups.joinQuestionInputLabel")}
                    value={editJoinQuestion}
                    onChange={(e) => setEditJoinQuestion(e.target.value)}
                    placeholder={t("groups.joinQuestionPlaceholder")}
                    required={editRequireJoinReason}
                    sx={{ mb: 3 }}
                  />
                )}

                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isSavingSettings ? <CircularProgress size={18} color="inherit" /> : <Save size={18} />}
                    disabled={isSavingSettings || !editName.trim()}
                    sx={{ fontWeight: 700, px: 3, py: 1 }}
                  >
                    {isSavingSettings ? t("groups.savingSettings") : t("groups.saveSettings")}
                  </Button>
                </Box>
              </Box>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
}
