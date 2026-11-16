"use client";

import { ReactNode } from "react";
import { Box, ListItemIcon, MenuItem, Select, Typography } from "@mui/material";
import { Globe, Lock, Users } from "lucide-react";
import type { PostPrivacy } from "@/services/postsApi";
import { useTranslation } from "@/i18n/useTranslation";
import type { SupportedLanguage } from "@/i18n/types";

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

const PRIVACY_DESCS: Record<PostPrivacy, Record<SupportedLanguage, string>> = {
  public: {
    vi: "Mọi người đều xem được",
    en: "Anyone can view",
    "zh-CN": "所有人可见",
    "zh-TW": "所有人可查看",
    ko: "모든 사용자가 볼 수 있습니다",
    th: "ทุกคนสามารถดูได้",
  },
  friends: {
    vi: "Chỉ bạn bè của bạn",
    en: "Only your friends",
    "zh-CN": "仅您的好友可见",
    "zh-TW": "僅限您的朋友查看",
    ko: "내 친구만 볼 수 있습니다",
    th: "เฉพาะเพื่อนของคุณเท่านั้น",
  },
  only_me: {
    vi: "Không ai khác xem được",
    en: "Only you can view",
    "zh-CN": "仅自己可见",
    "zh-TW": "只限本人查看",
    ko: "나만 볼 수 있습니다",
    th: "เฉพาะคุณเท่านั้นที่ดูได้",
  },
};

const ORDER: PostPrivacy[] = ["public", "friends", "only_me"];

function getPrivacyTitle(privacy: PostPrivacy, t: (k: string) => string): string {
  if (privacy === "public") return t("feed.privacyPublic");
  if (privacy === "friends") return t("feed.privacyFriends");
  return t("feed.privacyOnlyMe");
}

function getPrivacyDesc(privacy: PostPrivacy, lang: SupportedLanguage): string {
  return PRIVACY_DESCS[privacy]?.[lang] || PRIVACY_DESCS[privacy]?.en || PRIVACY_DESCS[privacy]?.vi;
}

/** Biểu tượng + chữ nhỏ cho quyền riêng tư (không chỉ dựa vào icon). */
export function PrivacyLabel({ privacy }: { privacy: PostPrivacy }) {
  const { t, language } = useTranslation();
  const meta = PRIVACY_META[privacy];
  const label = getPrivacyTitle(privacy, t);
  const desc = getPrivacyDesc(privacy, language);

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
  const { t, language, tr } = useTranslation();

  return (
    <Select
      size="small"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PostPrivacy)}
      inputProps={{
        "aria-label": tr({
          vi: "Chọn người được xem bài viết",
          en: "Select post audience",
          "zh-CN": "选择谁可以看到您的帖子",
          "zh-TW": "選擇誰可以看到您的貼文",
          ko: "게시물을 볼 수 있는 사람 선택",
          th: "เลือกผู้ที่สามารถดูโพสต์ของคุณได้",
        }),
      }}
      labelId={labelId}
      renderValue={(v) => <PrivacyLabel privacy={v} />}
      sx={{ minWidth: 148, "& .MuiSelect-select": { py: 0.75 } }}
    >
      {ORDER.map((key) => {
        const item = PRIVACY_META[key];
        const label = getPrivacyTitle(key, t);
        const desc = getPrivacyDesc(key, language);

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
