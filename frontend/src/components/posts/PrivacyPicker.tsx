"use client";

import { ReactNode } from "react";
import { Box, ListItemIcon, MenuItem, Select, Typography } from "@mui/material";
import { Globe, Lock, Users } from "lucide-react";
import type { PostPrivacy } from "@/services/postsApi";

export const PRIVACY_META: Record<PostPrivacy, { label: string; description: string; icon: ReactNode }> = {
  public: { label: "Công khai", description: "Mọi người đều xem được", icon: <Globe size={16} aria-hidden /> },
  friends: { label: "Bạn bè", description: "Chỉ bạn bè của bạn", icon: <Users size={16} aria-hidden /> },
  only_me: { label: "Chỉ mình tôi", description: "Không ai khác xem được", icon: <Lock size={16} aria-hidden /> },
};

const ORDER: PostPrivacy[] = ["public", "friends", "only_me"];

/** Biểu tượng + chữ nhỏ cho quyền riêng tư (không chỉ dựa vào icon). */
export function PrivacyLabel({ privacy }: { privacy: PostPrivacy }) {
  const meta = PRIVACY_META[privacy];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }} title={meta.description}>
      {meta.icon}
      <Typography component="span" variant="caption">
        {meta.label}
      </Typography>
    </Box>
  );
}

interface PrivacyPickerProps {
  value: PostPrivacy;
  onChange: (value: PostPrivacy) => void;
  disabled?: boolean;
  labelId: string;
}

/** Chọn ai được xem bài viết. */
export default function PrivacyPicker({ value, onChange, disabled, labelId }: PrivacyPickerProps) {
  return (
    <Select
      size="small"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PostPrivacy)}
      inputProps={{ "aria-label": "Chọn người được xem bài viết" }}
      labelId={labelId}
      renderValue={(v) => <PrivacyLabel privacy={v} />}
      sx={{ minWidth: 148, "& .MuiSelect-select": { py: 0.75 } }}
    >
      {ORDER.map((key) => (
        <MenuItem key={key} value={key}>
          <ListItemIcon sx={{ minWidth: 28 }}>{PRIVACY_META[key].icon}</ListItemIcon>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {PRIVACY_META[key].label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {PRIVACY_META[key].description}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  );
}
