"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CursorPage } from "@/services/postsApi";

type Status = "loading" | "ready" | "error";

export interface PagedList<T extends { _id: string }> {
  items: T[];
  status: Status;
  /** Lỗi tải trang đầu (không có dữ liệu để hiển thị) */
  error: string | null;
  isLoadingMore: boolean;
  /** Lỗi khi tải thêm — danh sách đã có vẫn được giữ nguyên */
  loadMoreError: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** Tải lại từ đầu (nút "Thử lại" / làm mới) */
  reload: () => void;
  prepend: (item: T) => void;
  /** Thêm vào cuối danh sách (vd. bình luận mới nhất) */
  append: (item: T) => void;
  patch: (id: string, updater: (item: T) => T) => void;
  remove: (id: string) => void;
}

/**
 * Danh sách phân trang theo con trỏ (cursor) dùng chung cho bài viết và bình luận.
 * Component dùng hook nên được remount (`key`) khi nguồn dữ liệu đổi — hook chỉ tải trang đầu khi mount.
 */
export function usePagedList<T extends { _id: string }>(
  fetchPage: (after: string | null) => Promise<CursorPage<T>>,
  errorMessage: (err: unknown) => string,
): PagedList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const busyRef = useRef(false);
  const fetchRef = useRef(fetchPage);
  const errorRef = useRef(errorMessage);
  useEffect(() => {
    fetchRef.current = fetchPage;
    errorRef.current = errorMessage;
  });

  const fetchFirst = useCallback(async () => {
    const seq = ++seqRef.current;
    busyRef.current = true;
    try {
      const page = await fetchRef.current(null);
      if (seq !== seqRef.current) return;
      cursorRef.current = page.nextCursor;
      setItems(page.items);
      setHasMore(page.hasMore);
      setError(null);
      setLoadMoreError(null);
      setStatus("ready");
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(errorRef.current(err));
      setStatus("error");
    } finally {
      if (seq === seqRef.current) busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Bỏ kết quả của yêu cầu đang bay khi unmount: tăng "thế hệ" để mọi phản hồi cũ bị bỏ qua
    const invalidate = () => {
      seqRef.current += 1;
    };
    void fetchFirst();
    return invalidate;
  }, [fetchFirst]);

  const reload = useCallback(() => {
    setStatus("loading");
    setError(null);
    void fetchFirst();
  }, [fetchFirst]);

  const loadMore = useCallback(() => {
    if (busyRef.current || !cursorRef.current) return;
    const seq = seqRef.current;
    busyRef.current = true;
    setIsLoadingMore(true);
    setLoadMoreError(null);
    fetchRef
      .current(cursorRef.current)
      .then((page) => {
        if (seq !== seqRef.current) return;
        cursorRef.current = page.nextCursor;
        // Loại bản ghi trùng (bài mới đăng chen vào giữa các trang)
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p._id));
          return [...prev, ...page.items.filter((p) => !seen.has(p._id))];
        });
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        if (seq !== seqRef.current) return;
        setLoadMoreError(errorRef.current(err));
      })
      .finally(() => {
        if (seq !== seqRef.current) return;
        busyRef.current = false;
        setIsLoadingMore(false);
      });
  }, []);

  const prepend = useCallback((item: T) => {
    setItems((prev) => [item, ...prev.filter((p) => p._id !== item._id)]);
  }, []);

  const append = useCallback((item: T) => {
    setItems((prev) => (prev.some((p) => p._id === item._id) ? prev : [...prev, item]));
  }, []);

  const patch = useCallback((id: string, updater: (item: T) => T) => {
    setItems((prev) => prev.map((p) => (p._id === id ? updater(p) : p)));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p._id !== id));
  }, []);

  return {
    items,
    status,
    error,
    isLoadingMore,
    loadMoreError,
    hasMore,
    loadMore,
    reload,
    prepend,
    append,
    patch,
    remove,
  };
}
