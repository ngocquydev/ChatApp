"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { apiErrorMessage, fetchPublicProfile, type PublicProfile } from "@/services/postsApi";

type State =
  | { status: "loading"; profile: null; error: null; notFound: false }
  | { status: "ready"; profile: PublicProfile; error: null; notFound: false }
  | { status: "error"; profile: null; error: string; notFound: boolean };

const LOADING: State = { status: "loading", profile: null, error: null, notFound: false };

/** Tải hồ sơ công khai (thông tin, quan hệ bạn bè, số bạn bè) của một người dùng. */
export function usePublicProfile(userId: string) {
  const [state, setState] = useState<State>(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPublicProfile(userId)
      .then((profile) => {
        if (!cancelled) setState({ status: "ready", profile, error: null, notFound: false });
      })
      .catch((err) => {
        if (cancelled) return;
        const notFound = axios.isAxiosError(err) && [400, 404].includes(err.response?.status ?? 0);
        setState({
          status: "error",
          profile: null,
          notFound,
          error: notFound ? "Không tìm thấy người dùng này." : apiErrorMessage(err, "Không tải được trang cá nhân."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const reload = useCallback(() => {
    setState(LOADING);
    setAttempt((a) => a + 1);
  }, []);

  /** Cập nhật cục bộ sau khi kết bạn/hủy kết bạn mà không phải tải lại */
  const patchProfile = useCallback((patch: Partial<PublicProfile>) => {
    setState((s) => (s.status === "ready" ? { ...s, profile: { ...s.profile, ...patch } } : s));
  }, []);

  /** Tải lại âm thầm (không hiện skeleton) — dùng sau khi đổi quan hệ bạn bè để lấy requestId mới */
  const refresh = useCallback(async () => {
    try {
      const profile = await fetchPublicProfile(userId);
      setState({ status: "ready", profile, error: null, notFound: false });
    } catch {
      // Giữ nguyên dữ liệu đang hiển thị
    }
  }, [userId]);

  return { ...state, reload, patchProfile, refresh };
}
