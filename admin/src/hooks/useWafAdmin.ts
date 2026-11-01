"use client";

import { useCallback, useEffect, useState } from "react";
import { wafApi, apiErrorMessage, type WafBan, type WafEvent, type WafStatus } from "@/services/wafApi";

interface WafAdminData {
  status: WafStatus;
  bans: WafBan[];
  events: WafEvent[];
}

/** Tải trạng thái WAF, danh sách IP bị chặn và nhật ký sự kiện cho trang quản trị */
export function useWafAdmin(fallbackError: string) {
  const [data, setData] = useState<WafAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([wafApi.getStatus(), wafApi.listBans(), wafApi.listEvents()])
      .then(([status, bans, events]) => {
        if (cancelled) return;
        setData({ status, bans, events });
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(apiErrorMessage(err, fallbackError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, fallbackError]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  return { data, loading, error, refresh };
}

