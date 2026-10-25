"use client";

import { useEffect, useRef } from "react";

/**
 * Gắn vào một phần tử "mốc" ở cuối danh sách: khi nó vào gần khung nhìn thì gọi `onReach`
 * (cuộn vô hạn). Observer dựng lại sau mỗi lần `signal` đổi (vd. số mục) để nếu mốc vẫn còn
 * trong khung nhìn thì tiếp tục tải trang kế.
 */
export function useInfiniteSentinel(
  onReach: () => void,
  enabled: boolean,
  signal: number,
  rootMargin = "0px 0px 320px 0px",
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reachRef = useRef(onReach);
  useEffect(() => {
    reachRef.current = onReach;
  });

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reachRef.current();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, signal, rootMargin]);

  return ref;
}
