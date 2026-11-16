"use client";

import { useEffect, useRef } from "react";

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
