import { useCallback } from "react";
import { useLanguageStore } from "./useLanguageStore";

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const isHydrated = useLanguageStore((state) => state.isHydrated);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);
  const hydrateLanguage = useLanguageStore((state) => state.hydrateLanguage);
  const t = useLanguageStore((state) => state.t);

  const tr = useCallback(
    (viText: string, enText: string): string => (language === "vi" ? viText : enText),
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
  };
}


