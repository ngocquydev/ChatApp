import { v } from "@/theme/tokens";

export interface ChatThemeConfig {
  id: "default" | "dating" | "sky" | "midnight" | "ocean" | "sunset";
  name: string;
  description: string;
  previewColor: string;
  background: string;
  bubbleMe: string;
  bubbleMeColor: string;
  bubblePartner: string;
  bubblePartnerColor: string;
  partnerBorder: string;
  metaTextColor: string;
  dayPillBg: string;
  dayPillColor: string;
  isDarkTheme?: boolean;
}

export const CHAT_THEMES: Record<string, ChatThemeConfig> = {
  default: {
    id: "default",
    name: "Mặc định",
    description: "Tinh gọn, tiêu chuẩn",
    previewColor: "var(--mui-palette-primary-main)",
    background: v.page,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-2563eb")} 0%, ${v.tone("fx-4f46e5")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: v.paper,
    bubblePartnerColor: "text.primary",
    partnerBorder: "divider",
    metaTextColor: "text.secondary",
    dayPillBg: "action.selected",
    dayPillColor: "text.secondary",
  },
  dating: {
    id: "dating",
    name: "Hẹn hò",
    description: "Ngọt ngào lãng mạn",
    previewColor: v.tone("fx-e11d48"),
    background: `radial-gradient(circle at 12% 15%, rgba(244, 63, 94, 0.16) 0%, transparent 45%), radial-gradient(circle at 88% 85%, rgba(236, 72, 153, 0.18) 0%, transparent 50%), ${v.page}`,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-e11d48")} 0%, ${v.tone("fx-db2777")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: v.paper,
    bubblePartnerColor: "text.primary",
    partnerBorder: "divider",
    metaTextColor: "text.secondary",
    dayPillBg: "action.selected",
    dayPillColor: "text.secondary",
  },
  sky: {
    id: "sky",
    name: "Bầu trời",
    description: "Trong xanh thoáng đãng",
    previewColor: v.tone("fx-0284c7"),
    background: `radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.2) 0%, transparent 50%), radial-gradient(circle at 82% 82%, rgba(14, 165, 233, 0.16) 0%, transparent 48%), ${v.page}`,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-0284c7")} 0%, ${v.tone("fx-0369a1")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: v.paper,
    bubblePartnerColor: "text.primary",
    partnerBorder: "divider",
    metaTextColor: "text.secondary",
    dayPillBg: "action.selected",
    dayPillColor: "text.secondary",
  },
  midnight: {
    id: "midnight",
    name: "Bóng đêm",
    description: "Huyền bí sao đêm",
    previewColor: v.tone("fx-6d28d9"),
    background: `radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.28) 0%, transparent 60%), linear-gradient(180deg, ${v.tone("090d16")} 0%, ${v.tone("0f172a")} 60%, ${v.tone("1e1b4b")} 100%)`,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-4f46e5")} 0%, ${v.tone("fx-7c3aed")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: "rgba(30, 41, 59, 0.9)",
    bubblePartnerColor: v.white,
    partnerBorder: "rgba(148, 163, 184, 0.22)",
    metaTextColor: "rgba(226, 232, 240, 0.78)",
    dayPillBg: "rgba(30, 41, 59, 0.85)",
    dayPillColor: v.white,
    isDarkTheme: true,
  },
  ocean: {
    id: "ocean",
    name: "Biển cả",
    description: "Tươi mát sâu thẳm",
    previewColor: v.tone("fx-0d9488"),
    background: `radial-gradient(circle at 25% 25%, rgba(13, 148, 136, 0.18) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.16) 0%, transparent 50%), ${v.page}`,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-0d9488")} 0%, ${v.tone("fx-0f766e")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: v.paper,
    bubblePartnerColor: "text.primary",
    partnerBorder: "divider",
    metaTextColor: "text.secondary",
    dayPillBg: "action.selected",
    dayPillColor: "text.secondary",
  },
  sunset: {
    id: "sunset",
    name: "Hoàng hôn",
    description: "Ấm áp rực rỡ",
    previewColor: v.tone("fx-f97316"),
    background: `radial-gradient(circle at 15% 20%, rgba(249, 115, 22, 0.16) 0%, transparent 48%), radial-gradient(circle at 85% 80%, rgba(219, 39, 119, 0.15) 0%, transparent 48%), ${v.page}`,
    bubbleMe: `linear-gradient(135deg, ${v.tone("fx-f97316")} 0%, ${v.tone("fx-e11d48")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: v.paper,
    bubblePartnerColor: "text.primary",
    partnerBorder: "divider",
    metaTextColor: "text.secondary",
    dayPillBg: "action.selected",
    dayPillColor: "text.secondary",
  },
};

export function getChatTheme(themeId?: string): ChatThemeConfig {
  if (themeId && CHAT_THEMES[themeId]) {
    return CHAT_THEMES[themeId];
  }
  return CHAT_THEMES.default;
}
