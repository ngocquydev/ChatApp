"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { Plus, Search, Users } from "lucide-react";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";
import CreateGroupDialog from "./CreateGroupDialog";
import EmptyState from "@/components/common/EmptyState";
import LeftSidebar from "@/components/layout/LeftSidebar";
import GroupCard from "./GroupCard";
import MyGroupCompactCard from "./MyGroupCompactCard";

export default function GroupsExplore() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<CommunityGroupItem[]>([]);
  const [myGroups, setMyGroups] = useState<CommunityGroupItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

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
      console.error("Lỗi tải danh sách nhóm:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadData(search);
  };

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
        <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2 } }}>
          {/* Header bar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
                {t("groups.title")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("groups.description")}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ borderRadius: "12px", px: 2.5, fontWeight: 700 }}
            >
              {t("groups.createGroup")}
            </Button>
          </Box>

          {/* Tìm kiếm */}
          <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("groups.searchPlaceholder")}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="var(--mui-palette-text-secondary)" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "14px",
                  bgcolor: "background.paper",
                },
              }}
            />
          </Box>

          {/* Nhóm của tôi */}
          {myGroups.length > 0 && !search && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t("groups.yourGroups")}
              </Typography>
              <Grid container spacing={2}>
                {myGroups.map((g) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g._id}>
                    <MyGroupCompactCard group={g} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Tất cả các nhóm */}
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {t("groups.allGroups")}
          </Typography>

          {isLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                  <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} />
                </Grid>
              ))}
            </Grid>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<Users size={48} />}
              title={t("groups.noGroupsFound")}
              description={t("groups.noGroupsDesc")}
            />
          ) : (
            <Grid container spacing={2}>
              {groups.map((g) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g._id}>
                  <GroupCard group={g} />
                </Grid>
              ))}
            </Grid>
          )}

          <CreateGroupDialog
            open={openCreateDialog}
            onClose={() => setOpenCreateDialog(false)}
            onCreated={(newGroup) => {
              setGroups((prev) => [newGroup, ...prev]);
              setMyGroups((prev) => [newGroup, ...prev]);
            }}
          />
        </Container>
      </Box>
    </Box>
  );
}
