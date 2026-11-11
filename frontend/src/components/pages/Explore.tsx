"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronDown, ChevronUp, Upload, Video, X } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ShortVideoCard from "@/components/explore/ShortVideoCard";
import VideoShareDialog from "@/components/explore/VideoShareDialog";
import { nextLoveReaction } from "@/components/explore/shortVideoActions";
import {
  getPostVideo,
  SHORT_VIDEO_COPY as COPY,
  VideoSkeleton,
} from "@/components/explore/shortVideoExploreUi";
import LeftSidebar from "@/components/layout/LeftSidebar";
import PostCommentSection from "@/components/posts/PostCommentSection";
import SharePostDialog from "@/components/posts/SharePostDialog";
import { usePagedList } from "@/hooks/usePagedList";
import { useTranslation } from "@/i18n/useTranslation";
import {
  apiErrorMessage,
  fetchFeed,
  isSharedPostAvailable,
  toggleLike,
  type PostView,
} from "@/services/postsApi";
import { useAuthStore } from "@/store/useAuthStore";
import { APP_BAR_HEIGHT, v } from "@/theme/tokens";

const PAGE_SIZE = 10;

export default function Explore() {
  const { t, tr } = useTranslation();
  const { user } = useAuthStore();
  const currentUserId = (user?._id || user?.id) as string | undefined;
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState<PostView | null>(null);
  const [shareTarget, setShareTarget] = useState<PostView | null>(null);
  const [internalShareTarget, setInternalShareTarget] = useState<PostView | null>(null);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const pendingReactionsRef = useRef(new Set<string>());
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const nextPendingRef = useRef(false);
  const list = usePagedList<PostView>(
    (after) => fetchFeed({ limit: PAGE_SIZE, after }),
    (err) =>
      apiErrorMessage(
        err,
        tr({
          vi: "Không tải được video.",
          en: "Could not load videos.",
          "zh-CN": "无法加载视频。",
          "zh-TW": "無法載入影片。",
          ko: "동영상을 불러올 수 없습니다.",
          th: "ไม่สามารถโหลดวิดีโอได้",
        }),
      ),
  );
  const videos = useMemo(
    () => list.items.filter((post) => getPostVideo(post)),
    [list.items],
  );
  const activeIndex = Math.max(
    0,
    videos.findIndex((post) => post._id === activeVideo),
  );
  const setVisibleVideo = useCallback((id: string) => setActiveVideo(id), []);
  const { status, hasMore, isLoadingMore, loadMoreError, loadMore } = list;

  useEffect(() => {
    if (
      status === "ready" &&
      videos.length === 0 &&
      hasMore &&
      !isLoadingMore &&
      !loadMoreError
    )
      loadMore();
  }, [status, hasMore, isLoadingMore, loadMoreError, loadMore, videos.length]);

  useEffect(() => {
    if (!nextPendingRef.current || videos.length <= activeIndex + 1) return;
    nextPendingRef.current = false;
    scrollerRef.current?.scrollTo({
      top: (activeIndex + 1) * scrollerRef.current.clientHeight,
      behavior: "smooth",
    });
  }, [videos.length, activeIndex]);

  const moveVideo = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = activeIndex + direction;
    if (target >= videos.length && hasMore) {
      nextPendingRef.current = true;
      loadMore();
      return;
    }
    if (target >= 0 && target < videos.length)
      scroller.scrollTo({
        top: target * scroller.clientHeight,
        behavior: "smooth",
      });
  };

  const handleReact = async (post: PostView) => {
    if (pendingReactionsRef.current.has(post._id)) return;
    pendingReactionsRef.current.add(post._id);
    setPendingReactions(new Set(pendingReactionsRef.current));
    const previous = post;
    setReactionError(null);
    list.patch(post._id, (current) => ({
      ...current,
      ...nextLoveReaction(current),
    }));
    try {
      const result = await toggleLike(post._id, "love");
      list.patch(post._id, (current) => ({
        ...current,
        likedByMe: result.liked,
        myReaction: result.myReaction,
        likeCount: result.likeCount,
        reactionsCount: result.reactionsCount,
      }));
    } catch (err) {
      list.patch(post._id, () => previous);
      setReactionError(
        apiErrorMessage(
          err,
          tr({
            vi: "Không thể lưu cảm xúc. Hãy thử lại.",
            en: "Could not save your reaction. Please try again.",
            "zh-CN": "无法保存表情，请重试。",
            "zh-TW": "無法儲存表情，請重試。",
            ko: "반응을 저장할 수 없습니다. 다시 시도하세요.",
            th: "ไม่สามารถบันทึกความรู้สึกได้ โปรดลองอีกครั้ง",
          }),
        ),
      );
    } finally {
      pendingReactionsRef.current.delete(post._id);
      setPendingReactions(new Set(pendingReactionsRef.current));
    }
  };

  const commentsPost = commentsFor
    ? (videos.find((post) => post._id === commentsFor._id) ?? commentsFor)
    : null;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        pt: `${APP_BAR_HEIGHT + 12}px`,
        pb: "calc(12px + env(safe-area-inset-bottom))",
        px: { xs: 1, sm: 2 },
        bgcolor: "background.default",
      }}
    >
      <LeftSidebar />
      <Box sx={{ ml: { md: "280px", lg: "320px", xl: "350px" }, minWidth: 0 }}>
        <Box
          data-light=""
          sx={{
            position: "relative",
            height: { xs: "calc(100dvh - 88px)", md: "calc(100dvh - 92px)" },
            minHeight: 480,
            overflow: "hidden",
            borderRadius: { xs: "12px", sm: "20px" },
            bgcolor: v.tone("2d251f"),
          }}
        >
          <Typography
            component="h1"
            sx={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clipPath: "inset(50%)",
            }}
          >
            {tr(COPY.title)}
          </Typography>

          {list.status === "loading" && (
            <Box
              aria-busy="true"
              sx={{
                display: "grid",
                placeItems: "center",
                height: "100%",
                px: 2,
              }}
            >
              <VideoSkeleton />
            </Box>
          )}
          {list.status === "error" && (
            <Box sx={{ maxWidth: 520, mx: "auto", pt: 8, px: 2 }}>
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
            </Box>
          )}
          {list.status === "ready" && videos.length === 0 && !list.hasMore && (
            <Box sx={{ maxWidth: 520, mx: "auto", pt: 8, px: 2 }}>
              <Box sx={{ bgcolor: "background.paper", borderRadius: "16px" }}>
                <EmptyState
                  icon={<Video size={24} />}
                  title={tr(COPY.noVideos)}
                  description={tr(COPY.noVideosDesc)}
                />
              </Box>
            </Box>
          )}

          <Stack
            ref={scrollerRef}
            spacing={0}
            onScroll={(event) => {
              const el = event.currentTarget;
              if (
                hasMore &&
                !isLoadingMore &&
                !loadMoreError &&
                el.scrollTop + el.clientHeight >= el.scrollHeight - 240
              )
                loadMore();
            }}
            sx={{
              height: "100%",
              overflowY: "auto",
              scrollSnapType: "y mandatory",
              overscrollBehaviorY: "contain",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {videos.map((post, index) => {
              const videoUrl = getPostVideo(post);
              if (!videoUrl) return null;
              const shareable =
                (post.privacy === "public" ||
                  post.privacy === "friends" ||
                  post.author._id === currentUserId) &&
                (!post.sharedPost || isSharedPostAvailable(post.sharedPost));
              return (
                <ShortVideoCard
                  key={post._id}
                  post={post}
                  videoUrl={videoUrl}
                  index={index}
                  active={activeVideo === post._id}
                  muted={muted}
                  shareable={shareable}
                  heartPending={pendingReactions.has(post._id)}
                  scrollRootRef={scrollerRef}
                  onActive={setVisibleVideo}
                  onMuteChange={() => setMuted((value) => !value)}
                  onReact={(item) => void handleReact(item)}
                  onComments={setCommentsFor}
                  onShare={setShareTarget}
                />
              );
            })}
          </Stack>

          {videos.length > 0 && (
            <Stack
              spacing={1}
              sx={{
                position: "absolute",
                top: { xs: 2, md: "32%" },
                right: { xs: 1, md: 3 },
                zIndex: 4,
              }}
            >
              <IconButton
                aria-label={tr(COPY.previous)}
                disabled={activeIndex === 0}
                onClick={() => moveVideo(-1)}
                sx={{
                  color: v.white,
                  bgcolor:
                    "color-mix(in srgb, var(--mui-palette-common-black) 50%, transparent)",
                  "&:hover": {
                    bgcolor:
                      "color-mix(in srgb, var(--mui-palette-common-black) 70%, transparent)",
                  },
                }}
              >
                <ChevronUp aria-hidden />
              </IconButton>
              <IconButton
                aria-label={tr(COPY.next)}
                disabled={!list.hasMore && activeIndex >= videos.length - 1}
                onClick={() => moveVideo(1)}
                sx={{
                  color: v.white,
                  bgcolor:
                    "color-mix(in srgb, var(--mui-palette-common-black) 50%, transparent)",
                  "&:hover": {
                    bgcolor:
                      "color-mix(in srgb, var(--mui-palette-common-black) 70%, transparent)",
                  },
                }}
              >
                <ChevronDown aria-hidden />
              </IconButton>
            </Stack>
          )}
          {list.isLoadingMore && (
            <CircularProgress
              size={26}
              aria-label={tr(COPY.loadingMore)}
              sx={{
                position: "absolute",
                top: 2,
                left: "50%",
                color: v.white,
                zIndex: 4,
              }}
            />
          )}
          {list.loadMoreError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={list.loadMore}>
                  {t("common.retry")}
                </Button>
              }
              sx={{
                position: "absolute",
                zIndex: 5,
                top: 2,
                left: 2,
                right: 2,
              }}
            >
              {list.loadMoreError}
            </Alert>
          )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(commentsPost)}
        onClose={() => setCommentsFor(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="short-video-comments-title"
      >
        <DialogTitle
          id="short-video-comments-title"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {tr(COPY.commentsTitle)}
          <IconButton
            aria-label={t("common.close")}
            onClick={() => setCommentsFor(null)}
          >
            <X size={20} aria-hidden />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ maxHeight: "70dvh" }}>
          {commentsPost && (
            <PostCommentSection
              key={commentsPost._id}
              postId={commentsPost._id}
              postAuthorId={commentsPost.author._id}
              currentUserId={currentUserId}
              onCountChange={(delta) =>
                list.patch(commentsPost._id, (item) => ({
                  ...item,
                  commentCount: Math.max(0, item.commentCount + delta),
                }))
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <VideoShareDialog
        key={`video-share-${shareTarget?._id ?? "closed"}`}
        post={shareTarget}
        videoUrl={shareTarget ? getPostVideo(shareTarget) : null}
        onClose={() => setShareTarget(null)}
        onShareInApp={(post) => {
          setShareTarget(null);
          setInternalShareTarget(post);
        }}
      />
      <SharePostDialog
        key={`post-share-${internalShareTarget?._id ?? "closed"}`}
        post={internalShareTarget}
        currentUserId={currentUserId}
        onClose={() => setInternalShareTarget(null)}
        onShared={(original, created) => {
          const rootId =
            original.sharedPost && isSharedPostAvailable(original.sharedPost)
              ? original.sharedPost._id
              : original._id;
          list.patch(rootId, (item) => ({
            ...item,
            shareCount:
              created.sharedPost && isSharedPostAvailable(created.sharedPost)
                ? (created.sharedPost.shareCount ?? item.shareCount + 1)
                : item.shareCount + 1,
          }));
          setInternalShareTarget(null);
        }}
      />
      {reactionError && (
        <Alert
          severity="error"
          onClose={() => setReactionError(null)}
          sx={{
            position: "fixed",
            zIndex: 1400,
            left: 2,
            right: 2,
            bottom: 2,
            maxWidth: 520,
            mx: "auto",
          }}
        >
          {reactionError}
        </Alert>
      )}
    </Box>
  );
}
