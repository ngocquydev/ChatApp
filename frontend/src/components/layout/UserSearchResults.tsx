"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Alert, Box, Button, LinearProgress, Link, List, ListItem, Skeleton, Typography } from "@mui/material";
import { Check, Clock, SearchX, UserPlus } from "lucide-react";
import PresenceAvatar from "@/components/common/PresenceAvatar";
import EmptyState from "@/components/common/EmptyState";
import { UserRelationResult } from "@/store/useFriendStore";

/** Số kết quả hiện trước khi bấm "Xem tất cả" */
export const SEARCH_PREVIEW_COUNT = 5;

interface UserSearchResultsProps {
  query: string;
  results: UserRelationResult[];
  isSearching: boolean;
  isSearchingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** false = chỉ xem trước vài kết quả; true = hiện tất cả + cuộn vô hạn */
  expanded: boolean;
  onExpand: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onSendRequest: (userId: string) => void;
  onCancelRequest: (requestId: string) => void;
  onRespond: (requestId: string, action: "accept" | "reject") => void;
  onMessage: (user: UserRelationResult) => void;
}

function ResultRow({
  user,
  onSendRequest,
  onCancelRequest,
  onRespond,
  onMessage,
}: Pick<UserSearchResultsProps, "onSendRequest" | "onCancelRequest" | "onRespond" | "onMessage"> & {
  user: UserRelationResult;
}) {
  return (
    <ListItem
      sx={{
        px: 1,
        py: 1,
        borderRadius: 1.5,
        "&:hover": { bgcolor: "action.hover" },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        mb: 0.5,
      }}
    >
      <Link
        component={NextLink}
        href={`/profile/${user._id}`}
        underline="none"
        color="inherit"
        aria-label={`Xem trang cá nhân của ${user.name}`}
        sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}
      >
        <PresenceAvatar name={user.name} src={user.avatar} size={38} hidePresence />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
            {user.name}
          </Typography>
          <Typography variant="caption" noWrap color="text.secondary" sx={{ display: "block" }}>
            {user.bio || "Thành viên"}
          </Typography>
        </Box>
      </Link>

      <Box sx={{ ml: 1, flexShrink: 0 }}>
        {user.relationStatus === "none" && (
          <Button
            size="small"
            variant="contained"
            startIcon={<UserPlus size={14} aria-hidden />}
            onClick={() => onSendRequest(user._id)}
            sx={{ fontSize: "0.75rem", py: 0.4 }}
          >
            Kết bạn
          </Button>
        )}
        {user.relationStatus === "pending_sent" && (
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Clock size={13} aria-hidden />}
            onClick={() => user.requestId && onCancelRequest(user.requestId)}
            sx={{ fontSize: "0.72rem", py: 0.4, color: "text.secondary" }}
          >
            Đã gửi (Hủy)
          </Button>
        )}
        {user.relationStatus === "pending_received" && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<Check size={13} aria-hidden />}
              onClick={() => user.requestId && onRespond(user.requestId, "accept")}
              sx={{ fontSize: "0.72rem", py: 0.3, px: 1 }}
            >
              Chấp nhận
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => user.requestId && onRespond(user.requestId, "reject")}
              sx={{ fontSize: "0.72rem", py: 0.3, px: 0.8 }}
            >
              Từ chối
            </Button>
          </Box>
        )}
        {user.relationStatus === "friends" && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onMessage(user)}
            sx={{ fontSize: "0.75rem", py: 0.4 }}
          >
            Nhắn tin
          </Button>
        )}
      </Box>
    </ListItem>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <Box aria-busy="true" aria-label="Đang tìm kiếm người dùng" sx={{ py: 0.5 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 1 }}>
          <Skeleton variant="circular" width={38} height={38} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="45%" height={16} />
            <Skeleton width="70%" height={13} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Nội dung dropdown tìm kiếm người dùng:
 * - Mặc định chỉ xem trước vài kết quả + nút "Xem tất cả".
 * - Khi mở rộng: hiện toàn bộ đã tải và tự tải thêm khi cuộn gần cuối (infinite scroll).
 */
export default function UserSearchResults({
  query,
  results,
  isSearching,
  isSearchingMore,
  hasMore,
  error,
  expanded,
  onExpand,
  onLoadMore,
  onRetry,
  onSendRequest,
  onCancelRequest,
  onRespond,
  onMessage,
}: UserSearchResultsProps) {
  // Khung cuộn là root của IntersectionObserver
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const canAutoLoad = expanded && hasMore && !isSearchingMore && !isSearching && !error;
  const visible = expanded ? results : results.slice(0, SEARCH_PREVIEW_COUNT);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!canAutoLoad || !el || !scrollRoot || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { root: scrollRoot, rootMargin: "0px 0px 160px 0px" }
    );
    observer.observe(el);
    // Dựng lại observer sau mỗi trang: nếu sentinel vẫn nằm trong khung nhìn thì tự tải tiếp
    return () => observer.disconnect();
  }, [canAutoLoad, scrollRoot, results.length]);

  const showExpandButton = !expanded && (hasMore || results.length > SEARCH_PREVIEW_COUNT);

  return (
    <Box sx={{ position: "relative" }}>
      {(isSearching || isSearchingMore) && (
        <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 1 }} />
      )}
      <Box ref={setScrollRoot} sx={{ maxHeight: 400, overflowY: "auto", p: 1.5 }}>
        {results.length === 0 ? (
          isSearching ? (
            <SkeletonRows count={3} />
          ) : error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={onRetry}>
                  Thử lại
                </Button>
              }
            >
              {error}
            </Alert>
          ) : (
            <EmptyState
              compact
              icon={<SearchX size={26} />}
              title="Không tìm thấy ai"
              description={`Không có người dùng nào khớp với “${query}”.`}
            />
          )
        ) : (
          <>
            <Box sx={{ px: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                KẾT QUẢ TÌM KIẾM ({results.length}
                {hasMore ? "+" : ""})
              </Typography>
            </Box>
            <List disablePadding aria-label="Kết quả tìm kiếm người dùng">
              {visible.map((u) => (
                <ResultRow
                  key={u._id}
                  user={u}
                  onSendRequest={onSendRequest}
                  onCancelRequest={onCancelRequest}
                  onRespond={onRespond}
                  onMessage={onMessage}
                />
              ))}
            </List>

            {showExpandButton && (
              <Button fullWidth size="small" onClick={onExpand} sx={{ mt: 0.5, fontWeight: 700 }}>
                Xem tất cả kết quả
              </Button>
            )}

            {expanded && (
              <>
                {/* Mốc cuối danh sách: chạm tới là tải trang kế */}
                <Box ref={sentinelRef} aria-hidden sx={{ height: 1 }} />
                {isSearchingMore && <SkeletonRows count={2} />}
                {error && (
                  <Alert
                    severity="error"
                    sx={{ mt: 1 }}
                    action={
                      <Button color="inherit" size="small" onClick={onRetry}>
                        Thử lại
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                )}
                {!hasMore && !isSearchingMore && !error && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", py: 1 }}>
                    Đã hiển thị tất cả kết quả
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
