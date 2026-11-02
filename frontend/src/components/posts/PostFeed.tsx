"use client";

import { ReactNode, useState } from "react";
import { Alert, Box, Button, Skeleton, Snackbar, Typography } from "@mui/material";
import { Newspaper } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import { useInfiniteSentinel } from "@/hooks/useInfiniteSentinel";
import { usePagedList } from "@/hooks/usePagedList";
import {
  apiErrorMessage,
  deletePost,
  toggleLike,
  type CursorPage,
  type PostView,
  type ReactionType,
  type PostPrivacy,
} from "@/services/postsApi";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/i18n/useTranslation";
import PostCard from "./PostCard";
import PostComposer from "./PostComposer";
import SharePostDialog from "./SharePostDialog";
import EditPostDialog from "./EditPostDialog";
import PostEngagersDialog, { type EngagerTab } from "./PostEngagersDialog";

interface PostFeedProps {
  loadPage: (after: string | null) => Promise<CursorPage<PostView>>;
  /** true: hiện ô soạn bài và chèn bài mới/bài chia sẻ của mình vào đầu danh sách */
  canCompose: boolean;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** Gọi khi dữ liệu bài viết của mình thay đổi (đăng/xóa/chia sẻ) — vd. làm mới khung "Ảnh" */
  onOwnPostsChanged?: () => void;
  pageId?: string;
  groupId?: string;
  defaultPrivacy?: PostPrivacy;
}

type Toast = { message: string; severity: "success" | "error" } | null;

function PostSkeleton() {
  return (
    <Box sx={{ p: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 1.5 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="35%" height={18} />
          <Skeleton width="20%" height={14} />
        </Box>
      </Box>
      <Skeleton width="95%" />
      <Skeleton width="80%" />
      <Skeleton variant="rounded" height={160} sx={{ mt: 1.5 }} />
    </Box>
  );
}

/** Bảng bài viết dùng chung (Bảng tin và Hồ sơ): soạn bài, danh sách, cuộn vô hạn, thích/bình luận/chia sẻ/xóa. */
export default function PostFeed({
  loadPage,
  canCompose,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onOwnPostsChanged,
  pageId,
  groupId,
  defaultPrivacy,
}: PostFeedProps) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const currentUserId = (user?._id || user?.id) as string | undefined;

  const list = usePagedList<PostView>(loadPage, (err) => apiErrorMessage(err, "Không tải được bài viết."));
  const [toast, setToast] = useState<Toast>(null);
  const [toDelete, setToDelete] = useState<PostView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toShare, setToShare] = useState<PostView | null>(null);
  const [toEdit, setToEdit] = useState<PostView | null>(null);
  const [engagersModal, setEngagersModal] = useState<{ postId: string; initialTab: EngagerTab } | null>(null);

  const sentinelRef = useInfiniteSentinel(
    list.loadMore,
    list.status === "ready" && list.hasMore && !list.isLoadingMore && !list.loadMoreError,
    list.items.length,
  );

  const handleToggleLike = async (post: PostView, reactionType?: ReactionType) => {
    const targetType = reactionType ?? (post.myReaction ? post.myReaction : "like");
    const isUnreact = Boolean(post.likedByMe && (!reactionType || post.myReaction === reactionType));
    const nextReaction = isUnreact ? null : targetType;
    const nextLiked = !isUnreact;

    // Cập nhật giao diện lập tức (Optimistic update)
    list.patch(post._id, (p) => {
      const nextReactionsCount: Record<string, number> = { ...(p.reactionsCount || {}) };
      if (isUnreact) {
        if (p.myReaction && nextReactionsCount[p.myReaction]) {
          nextReactionsCount[p.myReaction] = Math.max(0, nextReactionsCount[p.myReaction] - 1);
        }
      } else {
        if (p.myReaction && nextReactionsCount[p.myReaction]) {
          nextReactionsCount[p.myReaction] = Math.max(0, nextReactionsCount[p.myReaction] - 1);
        }
        nextReactionsCount[targetType] = (nextReactionsCount[targetType] || 0) + 1;
      }
      return {
        ...p,
        likedByMe: nextLiked,
        myReaction: nextReaction,
        likeCount: Math.max(0, p.likeCount + (nextLiked && !p.likedByMe ? 1 : !nextLiked && p.likedByMe ? -1 : 0)),
        reactionsCount: nextReactionsCount as Record<ReactionType, number>,
      };
    });

    try {
      const result = await toggleLike(post._id, reactionType);
      list.patch(post._id, (p) => ({
        ...p,
        likedByMe: result.liked,
        myReaction: result.myReaction,
        likeCount: result.likeCount,
        reactionsCount: result.reactionsCount as Record<ReactionType, number> | undefined,
      }));
    } catch (err) {
      // Hoàn tác khi lỗi
      list.patch(post._id, (p) => ({
        ...p,
        likedByMe: post.likedByMe,
        myReaction: post.myReaction,
        likeCount: post.likeCount,
        reactionsCount: post.reactionsCount,
      }));
      setToast({ message: apiErrorMessage(err, "Không thể thao tác cảm xúc."), severity: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deletePost(toDelete._id);
      list.remove(toDelete._id);
      setToast({ message: "Đã xóa bài viết.", severity: "success" });
      onOwnPostsChanged?.();
    } catch (err) {
      setToast({ message: apiErrorMessage(err, "Không xóa được bài viết."), severity: "error" });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const handleCreated = (post: PostView) => {
    list.prepend(post);
    setToast({ message: "Đã đăng bài viết.", severity: "success" });
    onOwnPostsChanged?.();
  };

  const handleShared = (original: PostView, created: PostView) => {
    // Chia sẻ một bài chia sẻ → server tăng đếm của bài gốc, không phải của thẻ đang bấm
    if (!original.sharedPost) list.patch(original._id, (p) => ({ ...p, shareCount: p.shareCount + 1 }));
    if (canCompose) list.prepend(created);
    setToShare(null);
    setToast({ message: "Đã chia sẻ lên dòng thời gian của bạn.", severity: "success" });
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    list.patch(postId, (p) => ({ ...p, commentCount: Math.max(0, p.commentCount + delta) }));
  };

  const handleUpdated = (updated: PostView) => {
    list.patch(updated._id, () => updated);
    setToEdit(null);
    setToast({ message: "Đã cập nhật bài viết.", severity: "success" });
    onOwnPostsChanged?.();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {canCompose && (
        <PostComposer
          userName={user?.name}
          userAvatar={user?.avatar}
          defaultPrivacy={defaultPrivacy}
          pageId={pageId}
          groupId={groupId}
          onCreated={handleCreated}
        />
      )}

      <Box component="section" aria-label="Bài viết" aria-busy={list.status === "loading"} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {list.status === "loading" && (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        )}

        {list.status === "error" && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={list.reload}>
                {t("common.retry")}
              </Button>
            }
          >
            {list.error}
          </Alert>
        )}

        {list.status === "ready" && list.items.length === 0 && (
          <Box sx={{ borderRadius: "16px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <EmptyState
              icon={<Newspaper size={26} />}
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          </Box>
        )}

        {list.items.map((post, index) => (
          <PostCard
            key={post._id}
            post={post}
            priority={index === 0}
            currentUserId={currentUserId}
            onToggleLike={(p, type) => void handleToggleLike(p, type)}
            onRequestEdit={setToEdit}
            onRequestDelete={setToDelete}
            onRequestShare={setToShare}
            onOpenEngagers={(postId, tab) => setEngagersModal({ postId, initialTab: tab })}
            onCommentCountChange={handleCommentCountChange}
          />
        ))}

        {list.status === "ready" && list.items.length > 0 && (
          <>
            {/* Mốc cuối danh sách: chạm tới là tải trang kế (cuộn vô hạn) */}
            <Box ref={sentinelRef} aria-hidden sx={{ height: 1 }} />
            {list.isLoadingMore && <PostSkeleton />}
            {list.loadMoreError && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={list.loadMore}>
                    {t("common.retry")}
                  </Button>
                }
              >
                {list.loadMoreError}
              </Alert>
            )}
            {!list.hasMore && !list.isLoadingMore && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", py: 1 }}>
                {t("feed.endOfPosts")}
              </Typography>
            )}
          </>
        )}
      </Box>

      <SharePostDialog
        // Remount theo bài để xóa nháp lời bình khi mở bài khác
        key={toShare ? `share-${toShare._id}` : "share-closed"}
        post={toShare}
        currentUserId={currentUserId}
        onClose={() => setToShare(null)}
        onShared={handleShared}
      />

      <EditPostDialog
        // Remount theo bài để khởi tạo lại nháp khi đổi bài chỉnh sửa
        key={toEdit ? `edit-${toEdit._id}` : "edit-closed"}
        post={toEdit}
        currentUserId={currentUserId}
        onClose={() => setToEdit(null)}
        onUpdated={handleUpdated}
      />

      <PostEngagersDialog
        open={!!engagersModal}
        postId={engagersModal?.postId ?? null}
        initialTab={engagersModal?.initialTab ?? "likes"}
        onClose={() => setEngagersModal(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t("feed.deletePostTitle")}
        description={t("feed.deletePostDesc")}
        confirmLabel={t("common.delete")}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
