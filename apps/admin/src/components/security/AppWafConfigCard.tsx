"use client";

import { useState } from "react";
import { Box, Button, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import { ShieldHalf } from "lucide-react";
import SectionCard from "./SectionCard";
import { parseCidrList, parseCountryList } from "./wafLabels";
import type { WafAppConfig, WafConfigPatch } from "@/services/wafApi";
import { useTranslation } from "@/i18n/useTranslation";

interface AppWafConfigCardProps {
  config: WafAppConfig;
  pending: boolean;
  onSave: (patch: WafConfigPatch) => void;
}

type ToggleKey = "enabled" | "blockScanners" | "blockBadUserAgents" | "challengeForeignAuth";

/** Cấu hình WAF trong ứng dụng: bật/tắt nhóm luật và danh sách IP/quốc gia */
export default function AppWafConfigCard({ config, pending, onSave }: AppWafConfigCardProps) {
  const { tr } = useTranslation();
  // Cha truyền key theo nội dung cấu hình → form tự khởi tạo lại sau khi lưu thành công
  const [countries, setCountries] = useState(config.allowedCountries.join(", "));
  const [allowlist, setAllowlist] = useState(config.ipAllowlist.join("\n"));
  const [blocklist, setBlocklist] = useState(config.ipBlocklist.join("\n"));

  const parsedCountries = parseCountryList(countries);
  const parsedAllow = parseCidrList(allowlist);
  const parsedBlock = parseCidrList(blocklist);
  const hasErrors = parsedCountries.invalid.length + parsedAllow.invalid.length + parsedBlock.invalid.length > 0;

  const toggles: { key: ToggleKey; label: string; hint: string }[] = [
    { key: "enabled", label: tr("Bật tường lửa ứng dụng", "Enable application firewall"), hint: tr("Tắt sẽ bỏ qua mọi luật bên dưới.", "Turning off skips every rule below.") },
    { key: "blockScanners", label: tr("Chặn dò lỗ hổng", "Block vulnerability scans"), hint: "/.env, /.git, /wp-admin, *.php…" },
    { key: "blockBadUserAgents", label: tr("Chặn công cụ tấn công", "Block attack tools"), hint: "sqlmap, nikto, masscan…" },
    {
      key: "challengeForeignAuth",
      label: tr("Xác minh IP nước ngoài khi đăng ký/khôi phục", "Challenge foreign IPs on sign-up/recovery"),
      hint: tr("Chỉ áp dụng khi request đi qua Cloudflare.", "Only applies to requests through Cloudflare."),
    },
  ];

  const errorText = (invalid: string[]) =>
    invalid.length > 0 ? tr(`Không hợp lệ: ${invalid.slice(0, 3).join(", ")}`, `Invalid: ${invalid.slice(0, 3).join(", ")}`) : undefined;

  return (
    <SectionCard
      id="app-waf"
      icon={<ShieldHalf size={22} />}
      title={tr("Tường lửa trong ứng dụng", "In-app firewall")}
      description={tr("Lớp bảo vệ thứ hai, vẫn chạy khi request không qua Cloudflare.", "Second layer that still runs when traffic bypasses Cloudflare.")}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {toggles.map((t) => (
          <FormControlLabel
            key={t.key}
            control={
              <Switch
                checked={config[t.key]}
                disabled={pending || (t.key !== "enabled" && !config.enabled)}
                onChange={(_, checked) => onSave({ [t.key]: checked })}
              />
            }
            label={
              <Box>
                <Typography variant="body1">{t.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.hint}
                </Typography>
              </Box>
            }
          />
        ))}
      </Box>

      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (hasErrors) return;
          onSave({ allowedCountries: parsedCountries.values, ipAllowlist: parsedAllow.values, ipBlocklist: parsedBlock.values });
        }}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          size="small"
          label={tr("Quốc gia không cần xác minh", "Countries without challenge")}
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          error={parsedCountries.invalid.length > 0}
          helperText={errorText(parsedCountries.invalid) ?? tr("Mã ISO 2 chữ cái, vd. VN, SG", "ISO 2-letter codes, e.g. VN, SG")}
        />
        <TextField
          multiline
          minRows={2}
          label={tr("IP luôn cho phép (allowlist)", "Always-allowed IPs (allowlist)")}
          value={allowlist}
          onChange={(e) => setAllowlist(e.target.value)}
          error={parsedAllow.invalid.length > 0}
          helperText={errorText(parsedAllow.invalid) ?? tr("Mỗi dòng một IP hoặc CIDR. Bỏ qua mọi luật.", "One IP or CIDR per line. Skips every rule.")}
        />
        <TextField
          multiline
          minRows={2}
          label={tr("IP luôn chặn (blocklist)", "Always-blocked IPs (blocklist)")}
          value={blocklist}
          onChange={(e) => setBlocklist(e.target.value)}
          error={parsedBlock.invalid.length > 0}
          helperText={errorText(parsedBlock.invalid) ?? tr("Mỗi dòng một IP hoặc CIDR.", "One IP or CIDR per line.")}
        />
        <Box>
          <Button type="submit" variant="outlined" disabled={pending || hasErrors}>
            {pending ? tr("Đang lưu…", "Saving…") : tr("Lưu danh sách", "Save lists")}
          </Button>
        </Box>
      </Box>
    </SectionCard>
  );
}

