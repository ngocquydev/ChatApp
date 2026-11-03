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
} from "@mui/material";
import { Flag, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { pagesApi, PageItem } from "@/services/pagesApi";
import CreatePageDialog from "./CreatePageDialog";
import EmptyState from "@/components/common/EmptyState";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import LeftSidebar from "@/components/layout/LeftSidebar";

export default function PagesExplore() {
  const { tr, t } = useTranslation();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [myPages, setMyPages] = useState<PageItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const loadData = async (q?: string) => {
    setIsLoading(true);
    try {
      const [allPages, managedPages] = await Promise.all([
        pagesApi.explorePages(q),
        pagesApi.getMyPages().catch(() => []),
      ]);
      setPages(allPages);
      setMyPages(managedPages);
    } catch (e) {
      console.error("Lỗi tải danh sách trang:", e);
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
            {t("pages.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pages.description")}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setOpenCreateDialog(true)}
          sx={{ borderRadius: "12px", px: 2.5, fontWeight: 700 }}
        >
          {t("pages.createPage")}
        </Button>
      </Box>

      {/* Tìm kiếm */}
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pages.searchPlaceholder")}
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

      {/* Mục Trang do tôi quản lý nếu có */}
      {myPages.length > 0 && !search && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t("pages.managedPages")}
          </Typography>
          <Grid container spacing={2}>
            {myPages.map((p) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p._id}>
                <Card
                  component={Link}
                  href={`/pages/${p.slug}`}
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
                    src={p.avatar}
                    sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {p.name}
                      </Typography>
                      {p.isVerified && <VerifiedBadge size={14} />}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("pages.followersCount", { count: p.followerCount })}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Danh sách trang khám phá */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {t("pages.allPages")}
      </Typography>

      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} />
            </Grid>
          ))}
        </Grid>
      ) : pages.length === 0 ? (
        <EmptyState
          icon={<Flag size={48} />}
          title={t("pages.noPagesFound")}
          description={t("pages.noPagesDesc")}
        />
      ) : (
        <Grid container spacing={2}>
          {pages.map((p) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p._id}>
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
                      src={p.avatar}
                      sx={{
                        width: 52,
                        height: 52,
                        bgcolor: "primary.main",
                        fontWeight: 700,
                        fontSize: "1.25rem",
                      }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800 }}>
                          {p.name}
                        </Typography>
                        {p.isVerified && <VerifiedBadge size={14} />}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {p.category}
                      </Typography>
                    </Box>
                  </Box>

                  {p.bio && (
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
                      {p.bio}
                    </Typography>
                  )}

                  <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Users size={14} color="var(--mui-palette-text-secondary)" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t("pages.followersCount", { count: p.followerCount })}
                      </Typography>
                    </Box>

                    <Button
                      component={Link}
                      href={`/pages/${p.slug}`}
                      variant="outlined"
                      size="small"
                      sx={{ borderRadius: "10px", fontWeight: 700 }}
                    >
                      {t("pages.viewPage")}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <CreatePageDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={(newPage) => {
          setPages((prev) => [newPage, ...prev]);
          setMyPages((prev) => [newPage, ...prev]);
        }}
      />
        </Container>
      </Box>
    </Box>
  );
}
