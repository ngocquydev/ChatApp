"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Compass, Newspaper, Plus, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";
import GroupsSidebarNav from "./GroupsSidebarNav";
import GroupFeedTab from "./GroupFeedTab";
import GroupDiscoverTab from "./GroupDiscoverTab";
import MyGroupsTab from "./MyGroupsTab";
import CreateGroupDialog from "./CreateGroupDialog";
import JoinQuestionDialog from "./JoinQuestionDialog";

export default function GroupsExplore() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"feed" | "discover" | "my-groups">("feed");
  const [groups, setGroups] = useState<CommunityGroupItem[]>([]);
  const [myGroups, setMyGroups] = useState<CommunityGroupItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [pendingJoinGroup, setPendingJoinGroup] = useState<CommunityGroupItem | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  const loadData = async (q?: string) => {
    setIsLoading(true);
    try {
      const [allGroups, joinedGroups] = await Promise.all([
        communityGroupsApi.exploreGroups(q),
        communityGroupsApi.getMyGroups().catch(() => []),
      ]);
      setGroups(allGroups);
      setMyGroups(joinedGroups);
    } catch (e) {
      console.error("Lỗi tải nhóm:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleJoinGroup = async (group: CommunityGroupItem) => {
    if (group.privacy === "private" && group.requireJoinReason) {
      setPendingJoinGroup(group);
      return;
    }
    try {
      setJoiningGroupId(group._id);
      const res = await communityGroupsApi.joinGroup(group._id);
      setGroups((prev) =>
        prev.map((g) => (g._id === group._id ? { ...g, isMember: res.status === "joined", isPending: res.status === "pending" } : g))
      );
      if (res.status === "joined") {
        setMyGroups((prev) => [group, ...prev]);
      }
    } catch (e) {
      console.error("Lỗi tham gia nhóm:", e);
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleQuestionSubmit = async (reason: string) => {
    if (!pendingJoinGroup) return;
    try {
      setJoiningGroupId(pendingJoinGroup._id);
      const res = await communityGroupsApi.joinGroup(pendingJoinGroup._id, reason);
      setGroups((prev) =>
        prev.map((g) => (g._id === pendingJoinGroup._id ? { ...g, isMember: res.status === "joined", isPending: res.status === "pending" } : g))
      );
      setPendingJoinGroup(null);
    } catch (e) {
      console.error("Lỗi gửi câu trả lời tham gia:", e);
    } finally {
      setJoiningGroupId(null);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "var(--mui-palette-neutral-100)" }}>
      {/* Facebook-style Left Navigation for Groups */}
      <GroupsSidebarNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "discover" && search) void loadData(search);
        }}
        myGroups={myGroups}
        onCreateGroup={() => setOpenCreateDialog(true)}
        searchQuery={search}
        onSearchChange={(q) => {
          setSearch(q);
          void loadData(q);
        }}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          ml: { md: "320px", lg: "360px" },
          pt: { xs: "72px", sm: "80px", md: "84px" },
          p: { xs: 2, sm: 3 },
          minWidth: 0,
        }}
      >
        <Container maxWidth="lg" sx={{ py: 1 }}>
          {/* Mobile Top Controls (< md) */}
          <Box sx={{ display: { xs: "block", md: "none" }, mb: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
                {t("groups.title")}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={() => setOpenCreateDialog(true)}
                sx={{ borderRadius: "10px", fontWeight: 700 }}
              >
                {t("groups.createGroup")}
              </Button>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              variant="fullWidth"
              sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid", borderColor: "divider" }}
            >
              <Tab icon={<Newspaper size={16} />} iconPosition="start" value="feed" label={t("groups.feedTab")} sx={{ fontWeight: 700 }} />
              <Tab icon={<Compass size={16} />} iconPosition="start" value="discover" label={t("groups.discoverTab")} sx={{ fontWeight: 700 }} />
              <Tab icon={<Users size={16} />} iconPosition="start" value="my-groups" label={t("groups.myGroupsTab")} sx={{ fontWeight: 700 }} />
            </Tabs>
          </Box>

          {/* Active Tab View */}
          {activeTab === "feed" && (
            <GroupFeedTab onDiscoverClick={() => setActiveTab("discover")} />
          )}

          {activeTab === "discover" && (
            <GroupDiscoverTab
              groups={groups}
              isLoading={isLoading}
              onJoinGroup={handleJoinGroup}
              joiningGroupId={joiningGroupId}
            />
          )}

          {activeTab === "my-groups" && (
            <MyGroupsTab
              myGroups={myGroups}
              onDiscoverClick={() => setActiveTab("discover")}
              onCreateGroup={() => setOpenCreateDialog(true)}
            />
          )}
        </Container>
      </Box>

      {/* Dialogs */}
      <CreateGroupDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={(newGroup) => {
          setGroups((prev) => [newGroup, ...prev]);
          setMyGroups((prev) => [newGroup, ...prev]);
          setActiveTab("my-groups");
        }}
      />

      {pendingJoinGroup && (
        <JoinQuestionDialog
          open={Boolean(pendingJoinGroup)}
          question={pendingJoinGroup.joinQuestion}
          isSubmitting={joiningGroupId === pendingJoinGroup._id}
          onClose={() => setPendingJoinGroup(null)}
          onSubmit={handleQuestionSubmit}
        />
      )}
    </Box>
  );
}
