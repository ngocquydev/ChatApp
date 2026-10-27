"use client";

import { useCallback, useEffect, useId, useState } from "react";
import NextLink from "next/link";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Heart, MessageCircle, X } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import {
  apiErrorMessage,
  fetchPostCommenters,
  fetchPostLikes,
  type PostAuthor,
} from "@/services/postsApi";
import { useAuthStore } from "@/store/useAuthStore";
import { profileHref } from "./PostAuthorHeader";

export type EngagerTab = "likes" | "commenters";

interface PostEngagersDialogProps {
  open: boolean;
  postId: string | null;
  initialTab?: EngagerTab;
  onClose: () => void;
}

export default function PostEngagersDialog({
  open,
  postId,
  initialTab = "likes",
  onClose,
}: PostEngagersDialogProps) {
  const uid = useId();
  const { user: currentUser } = useAuthStore();
  const currentUserId = (currentUser?._id || currentUser?.id) as string | undefined;

  const [tab, setTab] = useState<EngagerTab>(initialTab);
  const [likes, setLikes] = useState<PostAuthor[] | null>(null);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [errorLikes, setErrorLikes] = useState<string | null>(null);

  const [commenters, setCommenters] = useState<PostAuthor[] | null>(null);
  const [loadingCommenters, setLoadingCommenters] = useState(false);
  const [errorCommenters, setErrorCommenters] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    } else {
      setLikes(null);
      setCommenters(null);
      setErrorLikes(null);
      setErrorCommenters(null);
    }
  }, [open, initialTab]);

  const loadLikes = useCallback(async () => {
    if (!postId) return;
    setLoadingLikes(true);
    setErrorLikes(null);
    try {
      const data = await fetchPostLikes(postId);
      setLikes(data);
    } catch (err) {
      setErrorLikes(apiErrorMessage(err, "Không tải được danh sách người thích."));
    } finally {
      setLoadingLikes(false);
    }
  }, [postId]);

  const loadCommenters = useCallback(async () => {
    if (!postId) return;
    setLoadingCommenters(true);
    setErrorCommenters(null);
    try {
      const data = await fetchPostCommenters(postId);
      setCommenters(data);
    } catch (err) {
      setErrorCommenters(apiErrorMessage(err, "Không tải được danh sách người bình luận."));
    } finally {
      setLoadingCommenters(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!open || !postId) return;
    if (tab === "likes" && likes === null && !loadingLikes) {
      void loadLikes();
    } else if (tab === "commenters" && commenters === null && !loadingCommenters) {
      void loadCommenters();
    }
  }, [open, postId, tab, likes, commenters, loadingLikes, loadingCommenters, loadLikes, loadCommenters]);

  const currentList = tab === "likes" ? likes : commenters;
  const currentLoading = tab === "likes" ? loadingLikes : loadingCommenters;
  const currentError = tab === "likes" ? errorLikes : errorCommenters;
  const handleRetry = tab === "likes" ? loadLikes : loadCommenters;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      disableAutoFocus
      aria-labelledby={`${uid}-title`}
    >
      <DialogTitle
        id={`${uid}-title`}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, next: EngagerTab) => setTab(next)}
          aria-label="Chọn xem người thích hoặc người bình luận"
          sx={{ px: 2, minHeight: 48 }}
        >
          <Tab
            value="likes"
            label="Lượt thích"
            icon={<Heart size={16} aria-hidden />}
            iconPosition="start"
            id={`${uid}-tab-likes`}
            aria-controls={`${uid}-panel-likes`}
          />
          <Tab
            value="commenters"
            label="Bình luận"
            icon={<MessageCircle size={16} aria-hidden />}
            iconPosition="start"
            id={`${uid}-tab-commenters`}
            aria-controls={`${uid}-panel-commenters`}
          />
        </Tabs>
        <IconButton size="small" aria-label="Đóng" onClick={onClose} sx={{ mr: 1.5 }}>
          <X size={18} aria-hidden />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, maxHeight: 420, minHeight: 200, overflowY: "auto" }}>
        {currentLoading && (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[1, 2, 3].map((k) => (
              <Box key={k} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton width="45%" height={20} />
              </Box>
            ))}
          </Box>
        )}

        {currentError && (
          <Box sx={{ p: 2 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void handleRetry()}>
                  Thử lại
                </Button>
              }
            >
              {currentError}
            </Alert>
          </Box>
        )}

        {!currentLoading && !currentError && currentList && currentList.length === 0 && (
          <Box sx={{ py: 4, px: 2 }}>
            <EmptyState
              icon={tab === "likes" ? <Heart size={26} /> : <MessageCircle size={26} />}
              title={tab === "likes" ? "Chưa có lượt thích" : "Chưa có người bình luận"}
              description={
                tab === "likes"
                  ? "Chưa có ai thích bài viết này."
                  : "Chưa có ai tham gia bình luận về bài viết này."
              }
            />
          </Box>
        )}

        {!currentLoading && !currentError && currentList && currentList.length > 0 && (
          <List disablePadding aria-label={tab === "likes" ? "Danh sách người đã thích" : "Danh sách người đã bình luận"}>
            {currentList.map((author) => {
              const href = profileHref(author._id, currentUserId);
              return (
                <ListItem key={author._id} disablePadding>
                  <ListItemButton
                    component={NextLink}
                    href={href}
                    onClick={onClose}
                    sx={{ px: 2, py: 1.25 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 52 }}>
                      <PresenceAvatar name={author.name} src={author.avatar} size={40} hidePresence />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                          {author.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
