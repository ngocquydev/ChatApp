"use client";

import { useState } from "react";
import { Alert, Box, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { ShieldAlert, ShieldCheck, Siren } from "lucide-react";
import SectionCard from "./SectionCard";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { UnderAttackScope } from "@/services/wafApi";
import { useTranslation } from "@/i18n/useTranslation";

interface UnderAttackCardProps {
  appEnabled: boolean;
  cloudflareEnabled: boolean | null | undefined;
  cloudflareConfigured: boolean;
  pending: boolean;
  onToggle: (enabled: boolean, scope: UnderAttackScope) => void;
}

function StatusChip({ on, label }: { on: boolean; label: string }) {
  return (
    <Chip
      size="small"
      icon={on ? <ShieldAlert size={14} aria-hidden /> : <ShieldCheck size={14} aria-hidden />}
      color={on ? "warning" : "default"}
      label={label}
      variant={on ? "filled" : "outlined"}
    />
  );
}

/** Bật/tắt Under Attack Mode trong app và trên Cloudflare; bật cần xác nhận vì ảnh hưởng mọi người dùng */
export default function UnderAttackCard({
  appEnabled,
  cloudflareEnabled,
  cloudflareConfigured,
  pending,
  onToggle,
}: UnderAttackCardProps) {
  const { tr } = useTranslation();
  const [confirmScope, setConfirmScope] = useState<UnderAttackScope | null>(null);
  const anyOn = appEnabled || Boolean(cloudflareEnabled);

  const request = (enabled: boolean, scope: UnderAttackScope) => {
    if (enabled) setConfirmScope(scope);
    else onToggle(false, scope);
  };

  return (
    <SectionCard
      id="under-attack"
      icon={<Siren size={22} />}
      title={tr("Chế độ bị tấn công (Under Attack)", "Under Attack Mode")}
      description={tr(
        "Bật khi đang bị DDoS: mọi khách truy cập phải qua xác minh trước khi thao tác.",
        "Turn on during a DDoS: every visitor must pass a check before acting.",
      )}
      action={
        <StatusChip on={anyOn} label={anyOn ? tr("Đang bật", "On") : tr("Đang tắt", "Off")} />
      }
    >
      {anyOn && (
        <Alert severity="warning">
          {tr(
            "Người dùng sẽ thấy bước xác minh. Nhớ tắt khi cuộc tấn công kết thúc.",
            "Users will see a verification step. Turn it off when the attack is over.",
          )}
        </Alert>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <FormControlLabel
          control={
            <Switch checked={appEnabled} disabled={pending} onChange={(_, checked) => request(checked, "app")} />
          }
          label={
            <Box>
              <Typography variant="body1">{tr("Trong ứng dụng", "In the app")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {tr("Thao tác ghi dữ liệu cần xác minh Turnstile.", "Write actions require a Turnstile check.")}
              </Typography>
            </Box>
          }
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(cloudflareEnabled)}
              disabled={pending || !cloudflareConfigured || cloudflareEnabled === null}
              onChange={(_, checked) => request(checked, "cloudflare")}
            />
          }
          label={
            <Box>
              <Typography variant="body1">{tr("Tại Cloudflare", "At Cloudflare")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {cloudflareConfigured
                  ? tr("Đặt Security Level = I'm Under Attack.", "Sets Security Level to I'm Under Attack.")
                  : tr("Cần cấu hình Cloudflare API token trước.", "Configure the Cloudflare API token first.")}
              </Typography>
            </Box>
          }
        />
      </Box>

      <ConfirmDialog
        open={confirmScope !== null}
        title={tr("Bật chế độ bị tấn công?", "Turn on Under Attack Mode?")}
        description={tr(
          "Mọi người dùng sẽ phải xác minh trước khi tiếp tục. Chỉ bật khi hệ thống đang bị tấn công.",
          "Every user will have to pass a check before continuing. Only enable during an attack.",
        )}
        confirmLabel={tr("Bật bảo vệ", "Turn on")}
        pending={pending}
        onClose={() => setConfirmScope(null)}
        onConfirm={() => {
          if (confirmScope) onToggle(true, confirmScope);
          setConfirmScope(null);
        }}
      />
    </SectionCard>
  );
}

