"use client";

import { ReactNode } from "react";
import { Box, ListItemIcon, MenuItem, Select, Typography } from "@mui/material";
import { Globe, Lock, Users } from "lucide-react";
import type { PostPrivacy } from "@/services/postsApi";
import { useTranslation } from "@/i18n/useTranslation";

export const PRIVACY_META: Record<
  PostPrivacy,
  { labelVi: string; labelEn: string; descVi: string; descEn: string; icon: ReactNode }
> = {
  public: {
    labelVi: "Công khai",
    labelEn: "Public",
    descVi: "Mọi người đều xem được",
    descEn: "Anyone can view",
    icon: <Globe size={16} aria-hidden />,
  },
  friends: {
    labelVi: "Bạn bè",
    labelEn: "Friends",
    descVi: "Chỉ bạn bè của bạn",
    descEn: "Only your friends",
    icon: <Users size={16} aria-hidden />,
  },
  only_me: {
    labelVi: "Chỉ mình tôi",
    labelEn: "Only me",
    descVi: "Không ai khác xem được",
    descEn: "Only you can view",
    icon: <Lock size={16} aria-hidden />,
  },
};

const ORDER: PostPrivacy[] = ["public", "friends", "only_me"];

/** Biểu tượng + chữ nhỏ cho quyền riêng tư (không chỉ dựa vào icon). */
export function PrivacyLabel({ privacy }: { privacy: PostPrivacy }) {
  const { isVietnamese } = useTranslation();
  const meta = PRIVACY_META[privacy];
  const label = isVietnamese ? meta.labelVi : meta.labelEn;
  const desc = isVietnamese ? meta.descVi : meta.descEn;

  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }} title={desc}>
      {meta.icon}
      <Typography component="span" variant="caption">
        {label}
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
  const { isVietnamese } = useTranslation();

  return (
    <Select
      size="small"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PostPrivacy)}
      inputProps={{ "aria-label": isVietnamese ? "Chọn người được xem bài viết" : "Select post audience" }}
      labelId={labelId}
      renderValue={(v) => <PrivacyLabel privacy={v} />}
      sx={{ minWidth: 148, "& .MuiSelect-select": { py: 0.75 } }}
    >
      {ORDER.map((key) => {
        const item = PRIVACY_META[key];
        const label = isVietnamese ? item.labelVi : item.labelEn;
        const desc = isVietnamese ? item.descVi : item.descEn;

        return (
          <MenuItem key={key} value={key}>
            <ListItemIcon sx={{ minWidth: 28 }}>{item.icon}</ListItemIcon>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {desc}
              </Typography>
            </Box>
          </MenuItem>
        );
      })}
    </Select>
  );
}
