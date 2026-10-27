import { v } from "@/theme/tokens";

export interface ChatThemeConfig {
  id: "default" | "dating" | "sky" | "midnight" | "ocean";
  name: string;
  description: string;
  previewColor: string;
  background: string;
  bubbleMe: string;
  bubbleMeColor: string;
  bubblePartner: string;
  bubblePartnerColor: string;
  isDarkTheme?: boolean;
}

export const CHAT_THEMES: Record<string, ChatThemeConfig> = {
  default: {
    id: "default",
    name: "Mặc định",
    description: "Giao diện gốc tiêu chuẩn",
    previewColor: "var(--mui-palette-primary-main)",
    background: "background.default",
    bubbleMe: "primary.main",
    bubbleMeColor: "primary.contrastText",
    bubblePartner: "background.paper",
    bubblePartnerColor: "text.primary",
  },
  dating: {
    id: "dating",
    name: "Hẹn hò",
    description: "Ngọt ngào lãng mạn",
    previewColor: v.tone("e11d48"),
    background:
      "radial-gradient(circle at 10% 10%, rgba(244, 63, 94, 0.15) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(236, 72, 153, 0.18) 0%, transparent 45%), linear-gradient(135deg, rgba(254, 242, 242, 0.8) 0%, rgba(253, 242, 248, 0.9) 100%)",
    bubbleMe: `linear-gradient(135deg, ${v.tone("e11d48")} 0%, ${v.tone("be123c")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: "rgba(255, 255, 255, 0.95)",
    bubblePartnerColor: v.tone("0f172a"),
  },
  sky: {
    id: "sky",
    name: "Bầu trời",
    description: "Trong xanh thoáng đãng",
    previewColor: v.tone("0284c7"),
    background:
      "radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(14, 165, 233, 0.15) 0%, transparent 45%), linear-gradient(180deg, rgba(240, 249, 255, 0.85) 0%, rgba(224, 242, 254, 0.95) 100%)",
    bubbleMe: `linear-gradient(135deg, ${v.tone("0284c7")} 0%, ${v.tone("0369a1")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: "rgba(255, 255, 255, 0.95)",
    bubblePartnerColor: v.tone("0f172a"),
  },
  midnight: {
    id: "midnight",
    name: "Bóng đêm",
    description: "Huyền bí huyền ảo",
    previewColor: v.tone("6366f1"),
    background:
      `radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 60%), linear-gradient(180deg, ${v.tone("090d16")} 0%, ${v.tone("0f172a")} 60%, ${v.tone("1e1b4b")} 100%)`,
    bubbleMe: `linear-gradient(135deg, ${v.brand[600]} 0%, ${v.tone("7c3aed")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: "rgba(30, 41, 59, 0.85)",
    bubblePartnerColor: v.white,
    isDarkTheme: true,
  },
  ocean: {
    id: "ocean",
    name: "Biển cả",
    description: "Tươi mát sâu thẳm",
    previewColor: v.tone("0d9488"),
    background:
      "radial-gradient(circle at 30% 30%, rgba(13, 148, 136, 0.18) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), linear-gradient(180deg, rgba(240, 253, 250, 0.85) 0%, rgba(204, 251, 241, 0.95) 100%)",
    bubbleMe: `linear-gradient(135deg, ${v.tone("0d9488")} 0%, ${v.tone("0f766e")} 100%)`,
    bubbleMeColor: v.white,
    bubblePartner: "rgba(255, 255, 255, 0.95)",
    bubblePartnerColor: v.tone("0f172a"),
  },
};

export function getChatTheme(themeId?: string): ChatThemeConfig {
  if (themeId && CHAT_THEMES[themeId]) {
    return CHAT_THEMES[themeId];
  }
  return CHAT_THEMES.default;
}
