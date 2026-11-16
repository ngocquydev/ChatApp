"use client";

import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { Flag, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/i18n/useTranslation";
import { pagesApi, PageItem } from "@/services/pagesApi";
import CreatePageDialog from "./CreatePageDialog";
import PageMiniSection from "./PageMiniSection";
import EmptyState from "@/components/common/EmptyState";
import VerifiedBadge from "@/components/common/VerifiedBadge";
import LeftSidebar from "@/components/layout/LeftSidebar";
import { useAuthStore } from "@/store/useAuthStore";

export default function PagesExplore() {
  const { t } = useTranslation();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [myPages, setMyPages] = useState<PageItem[]>([]);
  const [followedPages, setFollowedPages] = useState<PageItem[]>([]);
  const [pendingPageId, setPendingPageId] = useState<string | null>(null);
  const [followError, setFollowError] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (isAuthenticated) {
      void pagesApi.getMyPages().then(setMyPages).catch(() => {});
      void pagesApi.getFollowedPages().then(setFollowedPages).catch(() => {});
    } else {
      setMyPages([]);
      setFollowedPages([]);
    }
    void pagesApi.getExploreCategories().then(setCategories).catch(() => {});
  }, [isAuthenticated]);

  const toggleFollow = async (page: PageItem) => {
    if (pendingPageId) return;
    setPendingPageId(page._id);
    setFollowError(false);
    try {
      const isFollowing = followedPages.some((item) => item._id === page._id);
      const result = await pagesApi.setFollowPage(page._id, !isFollowing);
      setPages((current) => current.map((item) => item._id === page._id
        ? { ...item, followerCount: result.followerCount } : item));
      if (result.isFollowing) {
        setFollowedPages((current) => current.some((item) => item._id === page._id)
          ? current : [{ ...page, followerCount: result.followerCount }, ...current]);
      } else {
        setFollowedPages((current) => current.filter((item) => item._id !== page._id));
      }
    } catch {
      setFollowError(true);
    } finally {
      setPendingPageId(null);
    }
  };

  useEffect(() => {
    const currentRequest = ++requestId.current;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(false);
    setPages([]);
    void pagesApi.explorePages({ q: debouncedSearch, category, limit: 21, offset: 0 })
      .then((items) => {
        if (currentRequest !== requestId.current) return;
        setPages(items.slice(0, 20));
        setHasMore(items.length > 20);
      })
      .catch(() => {
        if (currentRequest === requestId.current) setError(true);
      })
      .finally(() => {
        if (currentRequest === requestId.current) setIsLoading(false);
      });
    return () => { requestId.current += 1; };
  }, [debouncedSearch, category, reloadKey]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || search.trim() !== debouncedSearch) return;
    const currentRequest = requestId.current;
    setIsLoadingMore(true);
    setError(false);
    try {
      const items = await pagesApi.explorePages({ q: debouncedSearch, category, limit: 21, offset: pages.length });
      if (currentRequest !== requestId.current) return;
      setPages((previous) => [...previous, ...items.slice(0, 20)]);
      setHasMore(items.length > 20);
    } catch {
      if (currentRequest === requestId.current) setError(true);
    } finally {
      setIsLoadingMore(false);
    }
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

      {/* Tìm kiếm và lọc */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pages.searchPlaceholder")}
          slotProps={{
            htmlInput: { maxLength: 80, "aria-label": t("pages.searchPlaceholder") },
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
        <TextField
          select
          size="small"
          label={t("pages.categoryLabel")}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: { sm: 180 }, bgcolor: "background.paper" }}
        >
          <MenuItem value="">{t("pages.allCategories")}</MenuItem>
          {categories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
      </Box>

      {!search && !category && (
        <>
          <PageMiniSection title={t("pages.managedPages")} pages={myPages} />
          <PageMiniSection title={t("pages.followedPages")} pages={followedPages} />
        </>
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
      ) : error && pages.length === 0 ? (
        <EmptyState
          icon={<Flag size={48} />}
          title={t("pages.loadError")}
          action={<Button onClick={() => setReloadKey((key) => key + 1)}>{t("pages.retry")}</Button>}
        />
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
                    boxShadow: 2,
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

                  <Box sx={{ mt: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Users size={14} color="var(--mui-palette-text-secondary)" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t("pages.followersCount", { count: p.followerCount })}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                      {!myPages.some((item) => item._id === p._id) && (
                        isAuthenticated ? (
                          <Button
                            variant={followedPages.some((item) => item._id === p._id) ? "outlined" : "contained"}
                            size="small"
                            disabled={pendingPageId === p._id}
                            onClick={() => void toggleFollow(p)}
                          >
                            {followedPages.some((item) => item._id === p._id) ? t("pages.unfollow") : t("pages.follow")}
                          </Button>
                        ) : (
                          <Button component={Link} href="/login" variant="contained" size="small">{t("pages.follow")}</Button>
                        )
                      )}
                      <Button component={Link} href={`/pages/${p.slug}`} variant="outlined" size="small">
                        {t("pages.viewPage")}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {pages.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          {error ? (
            <Button onClick={() => void loadMore()}>{t("pages.retry")}</Button>
          ) : hasMore ? (
            <Button variant="outlined" onClick={() => void loadMore()} disabled={isLoadingMore || isLoading || search.trim() !== debouncedSearch}>
              {isLoadingMore ? t("pages.loadingMore") : t("pages.loadMore")}
            </Button>
          ) : null}
        </Box>
      )}

      <CreatePageDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={(newPage) => {
          setMyPages((prev) => [newPage, ...prev]);
          void pagesApi.getExploreCategories().then(setCategories).catch(() => {});
          setReloadKey((key) => key + 1);
        }}
      />
      <Snackbar open={followError} autoHideDuration={3500} onClose={() => setFollowError(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="error" variant="filled" onClose={() => setFollowError(false)}>{t("pages.followError")}</Alert>
      </Snackbar>
        </Container>
      </Box>
    </Box>
  );
}
