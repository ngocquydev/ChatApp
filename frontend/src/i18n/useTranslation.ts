import { useCallback } from "react";
import { useLanguageStore } from "./useLanguageStore";
import type { SupportedLanguage } from "./types";
import { SUPPORTED_LANGUAGES } from "./types";

export type MultiLangMap = Partial<Record<SupportedLanguage, string>> & { vi: string; en: string };

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const isHydrated = useLanguageStore((state) => state.isHydrated);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);
  const hydrateLanguage = useLanguageStore((state) => state.hydrateLanguage);
  const t = useLanguageStore((state) => state.t);

  const tr = useCallback(
    (viOrMap: string | MultiLangMap, enText?: string): string => {
      if (typeof viOrMap === "object" && viOrMap !== null) {
        return viOrMap[language] || viOrMap.en || viOrMap.vi;
      }
      return language === "vi" ? viOrMap : (enText ?? viOrMap);
    },
    [language]
  );

  return {
    t,
    tr,
    language,
    isHydrated,
    hydrateLanguage,
    setLanguage,
    toggleLanguage,
    isVietnamese: language === "vi",
    isEnglish: language === "en",
    isSimplifiedChinese: language === "zh-CN",
    isTraditionalChinese: language === "zh-TW",
    isKorean: language === "ko",
    isThai: language === "th",
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
