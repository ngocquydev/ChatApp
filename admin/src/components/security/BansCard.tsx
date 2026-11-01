"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
} from "@mui/material";
import { Ban, ShieldCheck, Unlock } from "lucide-react";
import SectionCard from "./SectionCard";
import { isValidIpInput, wafReasonLabel } from "./wafLabels";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import type { WafBan } from "@/services/wafApi";
import { formatFullDateTime } from "@/utils/formatTime";
import { useTranslation } from "@/i18n/useTranslation";

interface BansCardProps {
  bans: WafBan[];
  pending: boolean;
  onBan: (ip: string, durationMinutes: number) => void;
  onUnban: (ip: string) => void;
}

const DURATIONS = [15, 60, 24 * 60, 7 * 24 * 60];

/** IP đang bị chặn (tự động hoặc thủ công) + form chặn thủ công; gỡ chặn cần xác nhận */
export default function BansCard({ bans, pending, onBan, onUnban }: BansCardProps) {
  const { tr } = useTranslation();
  const [ip, setIp] = useState("");
  const [duration, setDuration] = useState(60);
  const [touched, setTouched] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<string | null>(null);
  const ipInvalid = touched && ip.trim() !== "" && !isValidIpInput(ip);

  const durationLabel = (m: number) =>
    m < 60 ? tr(`${m} phút`, `${m} min`) : m < 24 * 60 ? tr(`${m / 60} giờ`, `${m / 60} h`) : tr(`${m / 1440} ngày`, `${m / 1440} d`);

  return (
    <SectionCard
      id="bans"
      icon={<Ban size={22} />}
      title={tr(`IP đang bị chặn (${bans.length})`, `Banned IPs (${bans.length})`)}
      description={tr(
        "IP tái phạm bị chặn tự động có thời hạn. Không thể chặn IP nội bộ hoặc của Cloudflare.",
        "Repeat offenders are banned temporarily. Internal and Cloudflare IPs can't be banned.",
      )}
    >
      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (!isValidIpInput(ip)) return;
          onBan(ip.trim(), duration);
          setIp("");
          setTouched(false);
        }}
        sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, alignItems: { sm: "flex-start" } }}
      >
        <TextField
          size="small"
          label={tr("Địa chỉ IP", "IP address")}
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onBlur={() => setTouched(true)}
          error={ipInvalid}
          helperText={ipInvalid ? tr("IP không hợp lệ", "Invalid IP") : " "}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size="small"
          label={tr("Thời hạn", "Duration")}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          helperText=" "
          sx={{ minWidth: 140 }}
        >
          {DURATIONS.map((m) => (
            <MenuItem key={m} value={m}>
              {durationLabel(m)}
            </MenuItem>
          ))}
        </TextField>
        <Button type="submit" variant="outlined" color="error" disabled={pending || ip.trim() === ""} sx={{ mt: { sm: 0.25 } }}>
          {tr("Chặn IP", "Ban IP")}
        </Button>
      </Box>

      {bans.length === 0 ? (
        <EmptyState
          compact
          icon={<ShieldCheck size={28} />}
          title={tr("Chưa có IP nào bị chặn", "No banned IPs")}
          description={tr("IP tái phạm sẽ xuất hiện ở đây.", "Repeat offenders will appear here.")}
        />
      ) : (
        <List disablePadding>
          {bans.map((ban) => (
            <ListItem
              key={ban.ip}
              divider
              disableGutters
              secondaryAction={
                <Tooltip title={tr("Gỡ chặn", "Unban")}>
                  <IconButton
                    edge="end"
                    aria-label={tr(`Gỡ chặn ${ban.ip}`, `Unban ${ban.ip}`)}
                    onClick={() => setUnbanTarget(ban.ip)}
                    disabled={pending}
                  >
                    <Unlock size={18} />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemText
                primary={
                  <Box component="span" sx={{ display: "inline-flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                    <Box component="span" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {ban.ip}
                    </Box>
                    {ban.cloudflareRuleId && <Chip size="small" variant="outlined" label={tr("Chặn cả ở Cloudflare", "Also at Cloudflare")} />}
                  </Box>
                }
                secondary={`${wafReasonLabel(ban.reason, tr)} · ${tr("hết hạn", "expires")} ${formatFullDateTime(ban.expiresAt)}`}
                sx={{ pr: 6 }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <ConfirmDialog
        open={unbanTarget !== null}
        title={tr("Gỡ chặn IP?", "Unban IP?")}
        description={tr(
          `IP ${unbanTarget ?? ""} sẽ truy cập lại được ngay (kể cả qua Cloudflare).`,
          `IP ${unbanTarget ?? ""} will regain access immediately (including via Cloudflare).`,
        )}
        confirmLabel={tr("Gỡ chặn", "Unban")}
        pending={pending}
        onClose={() => setUnbanTarget(null)}
        onConfirm={() => {
          if (unbanTarget) onUnban(unbanTarget);
          setUnbanTarget(null);
        }}
      />
    </SectionCard>
  );
}

