import type { SupportedLanguage } from "@/i18n/types";

export type ReactionType = "like" | "love" | "care" | "haha" | "wow" | "sad" | "angry";

export interface ReactionDefinition {
  type: ReactionType;
  emoji: string;
  labelVi: string;
  labelEn: string;
  color: string;
}

export const REACTIONS: ReactionDefinition[] = [
  {
    type: "like",
    emoji: "👍",
    labelVi: "Thích",
    labelEn: "Like",
    color: "primary.main",
  },
  {
    type: "love",
    emoji: "❤️",
    labelVi: "Yêu thích",
    labelEn: "Love",
    color: "error.main",
  },
  {
    type: "care",
    emoji: "🥰",
    labelVi: "Thương thương",
    labelEn: "Care",
    color: "warning.main",
  },
  {
    type: "haha",
    emoji: "😆",
    labelVi: "Haha",
    labelEn: "Haha",
    color: "warning.main",
  },
  {
    type: "wow",
    emoji: "😮",
    labelVi: "Wow",
    labelEn: "Wow",
    color: "warning.main",
  },
  {
    type: "sad",
    emoji: "😢",
    labelVi: "Buồn",
    labelEn: "Sad",
    color: "warning.main",
  },
  {
    type: "angry",
    emoji: "😡",
    labelVi: "Phẫn nộ",
    labelEn: "Angry",
    color: "error.dark",
  },
];

export const REACTION_LABELS: Record<ReactionType, Record<SupportedLanguage, string>> = {
  like: {
    vi: "Thích",
    en: "Like",
    "zh-CN": "赞",
    "zh-TW": "讚",
    ko: "좋아요",
    th: "ถูกใจ",
  },
  love: {
    vi: "Yêu thích",
    en: "Love",
    "zh-CN": "爱心",
    "zh-TW": "大愛",
    ko: "최고예요",
    th: "รักเลย",
  },
  care: {
    vi: "Thương thương",
    en: "Care",
    "zh-CN": "抱抱",
    "zh-TW": "加油",
    ko: "힘내요",
    th: "ห่วงใย",
  },
  haha: {
    vi: "Haha",
    en: "Haha",
    "zh-CN": "哈哈",
    "zh-TW": "哈哈",
    ko: "웃겨요",
    th: "ฮ่าๆ",
  },
  wow: {
    vi: "Wow",
    en: "Wow",
    "zh-CN": "哇",
    "zh-TW": "哇",
    ko: "멋져요",
    th: "ว้าว",
  },
  sad: {
    vi: "Buồn",
    en: "Sad",
    "zh-CN": "心碎",
    "zh-TW": "心碎",
    ko: "슬퍼요",
    th: "เศร้า",
  },
  angry: {
    vi: "Phẫn nộ",
    en: "Angry",
    "zh-CN": "愤怒",
    "zh-TW": "憤怒",
    ko: "화나요",
    th: "โกรธ",
  },
};

export function getReactionLabel(type: ReactionType, lang: SupportedLanguage = "vi"): string {
  return REACTION_LABELS[type]?.[lang] || REACTION_LABELS[type]?.en || REACTION_LABELS[type]?.vi || type;
}

export const REACTION_MAP: Record<ReactionType, ReactionDefinition> = REACTIONS.reduce(
  (acc, r) => {
    acc[r.type] = r;
    return acc;
  },
  {} as Record<ReactionType, ReactionDefinition>,
);
