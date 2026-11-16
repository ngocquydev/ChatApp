"use client";

import { Alert, Box, Button, Chip, FormControlLabel, List, ListItem, ListItemIcon, ListItemText, Switch, Typography } from "@mui/material";
import { CheckCircle2, CircleDashed, Cloud, RefreshCw } from "lucide-react";
import SectionCard from "./SectionCard";
import { securityLevelLabel } from "./wafLabels";
import type { CloudflareStatus } from "@/services/wafApi";
import { useTranslation } from "@/i18n/useTranslation";

interface CloudflareCardProps {
  status: CloudflareStatus;
  syncing: boolean;
  botFightPending: boolean;
  onSync: () => void;
  onBotFight: (enabled: boolean) => void;
}

const REQUIRED_ENV = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_FRONTEND_HOST", "CLOUDFLARE_API_HOST"];

/** Trạng thái zone Cloudflare, Bot Fight Mode và các luật WAF do ChatApp quản lý */
export default function CloudflareCard({ status, syncing, botFightPending, onSync, onBotFight }: CloudflareCardProps) {
  const { tr } = useTranslation();

  if (!status.configured) {
    return (
      <SectionCard
        id="cloudflare"
        icon={<Cloud size={22} />}
        title="Cloudflare"
        description={tr("Chưa kết nối Cloudflare API.", "Cloudflare API is not connected.")}
      >
        <Alert severity="info">
          {tr("Thêm các biến sau vào backend/.env rồi khởi động lại backend:", "Add these variables to backend/.env and restart the backend:")}
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, "& code": { overflowWrap: "anywhere" } }}>
            {REQUIRED_ENV.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </Box>
        </Alert>
      </SectionCard>
    );
  }

  const rules = status.rules ?? [];
  const deployedCount = rules.filter((r) => r.deployed).length;

  return (
    <SectionCard
      id="cloudflare"
      icon={<Cloud size={22} />}
      title="Cloudflare"
      description={
        status.zone
          ? `${status.zone.name} · ${status.zone.plan ?? tr("Không rõ gói", "Unknown plan")}`
          : tr("Không đọc được thông tin zone.", "Could not read zone details.")
      }
      action={
        <Chip
          size="small"
          color={status.autoBan ? "success" : "default"}
          variant="outlined"
          label={status.autoBan ? tr("Tự chặn: bật", "Auto-ban: on") : tr("Tự chặn: tắt", "Auto-ban: off")}
        />
      }
    >
      {(status.warnings ?? []).map((w) => (
        <Alert key={w} severity="warning">
          {w}
        </Alert>
      ))}

      <Typography variant="body2">
        {tr("Security Level:", "Security Level:")} <strong>{securityLevelLabel(status.securityLevel, tr)}</strong>
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={Boolean(status.botFightMode)}
            disabled={botFightPending || status.botFightMode === null}
            onChange={(_, checked) => onBotFight(checked)}
          />
        }
        label={
          <Box>
            <Typography variant="body1">Bot Fight Mode</Typography>
            <Typography variant="body2" color="text.secondary">
              {tr(
                "Chặn bot tự động ở biên. Gói Free không đặt được ngoại lệ — có thể chặn nhầm client không phải trình duyệt.",
                "Blocks automated bots at the edge. The Free plan has no exceptions — non-browser clients may be blocked.",
              )}
            </Typography>
          </Box>
        }
      />

      <Box>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
          {tr(`Luật WAF (${deployedCount}/${rules.length} đã triển khai)`, `WAF rules (${deployedCount}/${rules.length} deployed)`)}
        </Typography>
        <List dense disablePadding>
          {rules.map((rule) => (
            <ListItem key={rule.ref} disableGutters>
              <ListItemIcon sx={{ minWidth: 32, color: rule.deployed ? "success.main" : "text.secondary" }}>
                {rule.deployed ? <CheckCircle2 size={18} aria-hidden /> : <CircleDashed size={18} aria-hidden />}
              </ListItemIcon>
              <ListItemText
                primary={rule.description || rule.ref}
                secondary={`${rule.deployed ? tr("Đã triển khai", "Deployed") : tr("Chưa triển khai", "Not deployed")} · ${rule.action}`}
                slotProps={{ primary: { sx: { overflowWrap: "anywhere" } } }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Box>
        <Button
          variant="contained"
          startIcon={<RefreshCw size={16} aria-hidden />}
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? tr("Đang đồng bộ…", "Syncing…") : tr("Đồng bộ luật lên Cloudflare", "Sync rules to Cloudflare")}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {tr("Luật do bạn tự tạo trên Cloudflare được giữ nguyên.", "Rules you created on Cloudflare are kept.")}
        </Typography>
      </Box>
    </SectionCard>
  );
}

