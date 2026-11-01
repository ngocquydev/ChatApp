"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Pagination,
  Stack,
  TextField,
  Typography,
  Chip,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Search,
  RefreshCw,
  Trash2,
  Heart,
  MessageCircle,
  Share2,
  Globe,
  Users as UsersIcon,
  Lock,
  FileText,
} from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { adminApi, AdminPost } from "@/services/adminApi";
import { useTranslation } from "@/i18n/useTranslation";

export default function PostsModerationView() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Xóa bài viết
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { isEnglish: isEn } = useTranslation();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPosts({
        search: search.trim() || undefined,
        page,
        limit: 10,
      });
      setPosts(res.posts);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    try {
      setDeleting(true);
      await adminApi.deletePost(selectedPost._id);
      setFeedback(isEn ? "Post removed successfully" : "Đã gỡ bài viết vi phạm thành công");
      setSelectedPost(null);
      fetchPosts();
    } finally {
      setDeleting(false);
    }
  };

  const getPrivacyIcon = (privacy: string) => {
    if (privacy === "public") return <Globe size={14} />;
    if (privacy === "friends") return <UsersIcon size={14} />;
    return <Lock size={14} />;
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {isEn ? "Post Moderation" : "Kiểm duyệt Bài viết"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEn
            ? `Total ${total.toLocaleString()} posts recorded across the platform`
            : `Tổng cộng ${total.toLocaleString()} bài viết trên toàn bộ hệ thống`}
        </Typography>
      </Box>

      {/* Filter & Search Bar */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          p: 2,
          bgcolor: "background.paper",
          borderRadius: "14px",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <TextField
          size="small"
          placeholder={isEn ? "Search by post content..." : "Tìm bài viết theo nội dung..."}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="var(--mui-palette-text-secondary)" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 260, flexGrow: 1 }}
        />

        <Button
          variant="outlined"
          onClick={fetchPosts}
          disabled={loading}
          startIcon={<RefreshCw size={16} />}
          sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600, minHeight: 40 }}
        >
          {isEn ? "Refresh" : "Tải lại"}
        </Button>
      </Box>

      {/* Danh sách bài viết */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 ? (
        <Card sx={{ p: 6, borderRadius: "16px", textAlign: "center" }}>
          <EmptyState
            icon={<FileText size={32} />}
            title={isEn ? "No posts found" : "Không có bài viết nào"}
            description={isEn ? "Try adjusting your search criteria" : "Không tìm thấy bài viết phù hợp với tìm kiếm"}
          />
        </Card>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {posts.map((post) => (
            <Card
              key={post._id}
              sx={{
                borderRadius: "16px",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                {/* Tác giả & Quyền riêng tư & Nút gỡ */}
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <PresenceAvatar
                      src={post.authorId?.avatar}
                      name={post.authorId?.name || "User"}
                      size={42}
                    />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {post.authorId?.name || "Người dùng"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </Typography>
                        <Chip
                          icon={getPrivacyIcon(post.privacy)}
                          label={post.privacy}
                          size="small"
                          sx={{ height: 18, fontSize: "0.68rem" }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Tooltip title={isEn ? "Delete / Remove post" : "Gỡ bài viết vi phạm"}>
                    <IconButton
                      color="error"
                      onClick={() => setSelectedPost(post)}
                      aria-label="Gỡ bài viết vi phạm"
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Nội dung bài viết */}
                {post.content && (
                  <Typography variant="body1" sx={{ mb: 2, whiteSpace: "pre-wrap" }}>
                    {post.content}
                  </Typography>
                )}

                {/* Ảnh đính kèm (nếu có) */}
                {post.images && post.images.length > 0 && (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.min(post.images.length, 3)}, 1fr)`,
                      gap: 1,
                      mb: 2,
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    {post.images.map((img, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          position: "relative",
                          height: 160,
                          borderRadius: "8px",
                          overflow: "hidden",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Image
                          src={img}
                          alt="Post media"
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{ objectFit: "cover" }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Chỉ số tương tác */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3, color: "text.secondary", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Heart size={16} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{post.likeCount}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <MessageCircle size={16} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{post.commentCount}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <Share2 size={16} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{post.shareCount}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      {/* Dialog xác nhận gỡ bài viết */}
      <Dialog open={Boolean(selectedPost)} onClose={() => setSelectedPost(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEn ? "Remove violating post?" : "Gỡ bài viết vi phạm?"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            {isEn
              ? "Are you sure you want to remove this post? It will be hidden from all feeds and timelines."
              : "Bạn có chắc chắn muốn gỡ bài viết này? Bài viết sẽ bị ẩn khỏi bảng tin và trang cá nhân."}
          </Typography>
          {selectedPost?.content && (
            <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                &ldquo;{selectedPost.content.slice(0, 100)}...&rdquo;
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedPost(null)} disabled={deleting} sx={{ borderRadius: "8px" }}>
            {isEn ? "Cancel" : "Hủy"}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeletePost}
            disabled={deleting}
            sx={{ borderRadius: "8px" }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : isEn ? "Delete" : "Gỡ bài"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={3500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setFeedback(null)} sx={{ borderRadius: "10px" }}>
          {feedback}
        </Alert>
      </Snackbar>
    </Box>
  );
}
