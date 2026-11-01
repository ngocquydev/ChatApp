"use client";

import { useState } from "react";
import { Alert, Box, Button, Container, IconButton, Skeleton, Snackbar, Tooltip, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import UnderAttackCard from "./UnderAttackCard";
import CloudflareCard from "./CloudflareCard";
import AppWafConfigCard from "./AppWafConfigCard";
import BansCard from "./BansCard";
import EventsCard from "./EventsCard";
import { useWafAdmin } from "@/hooks/useWafAdmin";
import { wafApi, apiErrorMessage, type UnderAttackScope, type WafConfigPatch } from "@/services/wafApi";
import { APP_BAR_HEIGHT } from "@/theme/tokens";
import { useTranslation } from "@/i18n/useTranslation";

type PendingKey = "underAttack" | "sync" | "botFight" | "config" | "bans";
interface Toast {
  severity: "success" | "error";
  message: string;
}

function LoadingSkeleton() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }} aria-hidden>
      <Skeleton variant="rounded" height={180} sx={{ borderRadius: "16px" }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />
        <Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />
      </Box>
    </Box>
  );
}

/** Trung tâm bảo mật: điều phối dữ liệu và hành động cho các thẻ WAF (chỉ admin) */
export default function SecurityCenter() {
  const { tr } = useTranslation();
  const { data, loading, error, refresh } = useWafAdmin(
    tr("Không tải được dữ liệu bảo mật.", "Could not load security data."),
  );
  const [pending, setPending] = useState<PendingKey | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const run = async (key: PendingKey, action: () => Promise<unknown>, success: string) => {
    setPending(key);
    try {
      await action();
      setToast({ severity: "success", message: success });
      refresh();
    } catch (err) {
      setToast({ severity: "error", message: apiErrorMessage(err, tr("Thao tác thất bại. Vui lòng thử lại.", "Action failed. Please try again.")) });
    } finally {
      setPending(null);
    }
  };

  const onUnderAttack = (enabled: boolean, scope: UnderAttackScope) =>
    run("underAttack", () => wafApi.setUnderAttack(enabled, scope), enabled ? tr("Đã bật chế độ bị tấn công.", "Under Attack Mode enabled.") : tr("Đã tắt chế độ bị tấn công.", "Under Attack Mode disabled."));
  const onSaveConfig = (patch: WafConfigPatch) => run("config", () => wafApi.updateConfig(patch), tr("Đã lưu cấu hình tường lửa.", "Firewall settings saved."));

  const app = data?.status.app;

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pt: `${APP_BAR_HEIGHT + 24}px`, pb: 6 }}>
      <Container maxWidth="lg" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {tr("Trung tâm bảo mật", "Security center")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tr("Chống DDoS bằng Cloudflare và tường lửa trong ứng dụng.", "DDoS protection with Cloudflare and the in-app firewall.")}
            </Typography>
          </Box>
          <Tooltip title={tr("Tải lại", "Reload")}>
            <span>
              <IconButton onClick={refresh} disabled={loading} aria-label={tr("Tải lại dữ liệu bảo mật", "Reload security data")}>
                <RefreshCw size={20} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={refresh}>
                {tr("Thử lại", "Retry")}
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <LoadingSkeleton />
        ) : (
          data &&
          app && (
            <>
              <UnderAttackCard
                appEnabled={app.underAttack}
                cloudflareEnabled={data.status.cloudflare.underAttack}
                cloudflareConfigured={data.status.cloudflare.configured}
                pending={pending === "underAttack"}
                onToggle={onUnderAttack}
              />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>
                <CloudflareCard
                  status={data.status.cloudflare}
                  syncing={pending === "sync"}
                  botFightPending={pending === "botFight"}
                  onSync={() => run("sync", () => wafApi.syncCloudflare(), tr("Đã đồng bộ luật lên Cloudflare.", "Rules synced to Cloudflare."))}
                  onBotFight={(enabled) => run("botFight", () => wafApi.setBotFight(enabled), tr("Đã cập nhật Bot Fight Mode.", "Bot Fight Mode updated."))}
                />
                <AppWafConfigCard
                  key={JSON.stringify([app.allowedCountries, app.ipAllowlist, app.ipBlocklist])}
                  config={app}
                  pending={pending === "config"}
                  onSave={onSaveConfig}
                />
              </Box>
              <BansCard
                bans={data.bans}
                pending={pending === "bans"}
                onBan={(ip, minutes) => run("bans", () => wafApi.createBan(ip, minutes), tr(`Đã chặn ${ip}.`, `Banned ${ip}.`))}
                onUnban={(ip) => run("bans", () => wafApi.deleteBan(ip), tr(`Đã gỡ chặn ${ip}.`, `Unbanned ${ip}.`))}
              />
              <EventsCard events={data.events} />
            </>
          )
        )}
      </Container>

      <Snackbar
        open={toast !== null}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert variant="filled" severity={toast.severity} onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

