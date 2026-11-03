"use client";

import { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  InputAdornment,
  Skeleton,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { Lock, Plus, Search, Users, Globe } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { communityGroupsApi, CommunityGroupItem } from "@/services/communityGroupsApi";
import CreateGroupDialog from "./CreateGroupDialog";
import EmptyState from "@/components/common/EmptyState";
import LeftSidebar from "@/components/layout/LeftSidebar";

export default function GroupsExplore() {
  const { tr } = useTranslation();
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
            {tr("Khám phá Hội nhóm (Groups)", "Explore Community Groups")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tr(
              "Tham gia các hội nhóm cùng sở thích để thảo luận, kết bạn và chia sẻ",
              "Join community groups with shared interests to discuss, make friends and share"
            )}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setOpenCreateDialog(true)}
          sx={{ borderRadius: "12px", px: 2.5, fontWeight: 700 }}
        >
          {tr("Tạo Nhóm mới", "Create Group")}
        </Button>
      </Box>

      {/* Tìm kiếm */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr("Tìm kiếm nhóm theo tên, chủ đề...", "Search groups by name, topic...")}
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
            {tr("Hội nhóm của bạn", "Your Groups")}
          </Typography>
          <Grid container spacing={2}>
            {myGroups.map((g) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g._id}>
                <Card
                  component={Link}
                  href={`/groups/${g.slug}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: "16px",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                    },
                  }}
                >
                  <Avatar
                    src={g.avatar}
                    sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                      {g.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {g.memberCount} {tr("thành viên", "members")}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tất cả các nhóm */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {tr("Tất cả các Nhóm", "All Groups")}
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
          title={tr("Không tìm thấy hội nhóm nào", "No groups found")}
          description={tr(
            "Hãy thử tìm kiếm với từ khóa khác hoặc tạo một hội nhóm mới ngay hôm nay!",
            "Try searching with another keyword or create a new group today!"
          )}
        />
      ) : (
        <Grid container spacing={2}>
          {groups.map((g) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={g._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "16px",
                  border: "1px solid",
                  borderColor: "divider",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  },
                }}
              >
                <CardContent sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                    <Avatar
                      src={g.avatar}
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: "primary.main",
                        fontWeight: 700,
                        fontSize: "1.25rem",
                      }}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
                        {g.name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {g.privacy === "public" ? (
                          <Globe size={13} color="var(--mui-palette-text-secondary)" />
                        ) : (
                          <Lock size={13} color="var(--mui-palette-text-secondary)" />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          {g.privacy === "public"
                            ? tr("Nhóm công khai", "Public group")
                            : tr("Nhóm riêng tư", "Private group")}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {g.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        fontSize: "0.85rem",
                      }}
                    >
                      {g.description}
                    </Typography>
                  )}

                  <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {g.memberCount} {tr("thành viên", "members")}
                    </Typography>

                    <Button
                      component={Link}
                      href={`/groups/${g.slug}`}
                      variant="outlined"
                      size="small"
                      sx={{ borderRadius: "10px", fontWeight: 700 }}
                    >
                      {tr("Xem Nhóm", "View Group")}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
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
