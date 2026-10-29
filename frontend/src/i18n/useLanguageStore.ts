import { create } from "zustand";
import { vi } from "./vi";
import { en } from "./en";
import type { SupportedLanguage, TranslationDictionary } from "./types";

interface LanguageState {
  language: SupportedLanguage;
  isHydrated: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  hydrateLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  vi,
  en,
};

const STORAGE_KEY = "chatapp_language";

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "vi";
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved === "vi" || saved === "en") return saved;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("en")) return "en";
  } catch {
    // LocalStorage blocked
  }
  return "vi";
}

function resolveNestedKey(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : null;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: "vi",
  isHydrated: false,

  setLanguage: (lang) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
        document.documentElement.lang = lang;
      } catch {
        // ignore
      }
    }
    set({ language: lang, isHydrated: true });
  },

  toggleLanguage: () => {
    const next = get().language === "vi" ? "en" : "vi";
    get().setLanguage(next);
  },

  hydrateLanguage: () => {
    if (typeof window === "undefined") return;
    const initial = getInitialLanguage();
    if (initial !== get().language) {
      set({ language: initial, isHydrated: true });
      document.documentElement.lang = initial;
    } else {
      set({ isHydrated: true });
    }
  },

  t: (key, params) => {
    const currentLang = get().language;
    const dict = dictionaries[currentLang] || dictionaries.vi;
    let template = resolveNestedKey(dict, key);

    // Fallback to Vietnamese if key is missing in English
    if (!template && currentLang !== "vi") {
      template = resolveNestedKey(dictionaries.vi, key);
    }

    if (!template) return key;

    if (params) {
      for (const [paramKey, val] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(val));
      }
    }

    return template;
  },
}));

