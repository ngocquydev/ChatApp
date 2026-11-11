export const colors = {
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb", // primary.main
    700: "#1d4ed8", // primary.dark
    800: "#1e40af",
    900: "#1e3a8a",
  },
  // Thang xám slate: nền, viền, chữ
  neutral: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8", // CHỈ dùng cho icon/placeholder, KHÔNG dùng cho chữ nội dung (contrast 2.6:1)
    500: "#64748b", // text.secondary (contrast 4.8:1 trên nền trắng)
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a", // text.primary
    950: "#090d16",
  },
  success: "#16a34a",
  successSoft: "#f0fdf4",
  successText: "#166534",
  warning: "#d97706",
  danger: "#dc2626",
  online: "#22c55e",
  offline: "#94a3b8",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  xs: "0 1px 2px rgba(15, 23, 42, 0.06)",
  sm: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
  md: "0 6px 16px -4px rgba(15, 23, 42, 0.12)",
  lg: "0 16px 32px -12px rgba(15, 23, 42, 0.18)",
  focus: "none",
} as const;

export const APP_BAR_HEIGHT = 64;

export const motion = {
  fast: "120ms",
  base: "180ms",
  slow: "280ms",
  ease: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const NEUTRAL_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;
export const BRAND_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900,
] as const;
export type NeutralStep = (typeof NEUTRAL_STEPS)[number];
export type BrandStep = (typeof BRAND_STEPS)[number];

export const neutralScale: Record<
  "light" | "dark",
  Record<NeutralStep, string>
> = {
  light: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#090d16",
  },
  dark: {
    50: "#0d1424",
    100: "#0a0f1c",
    200: "#243049",
    300: "#33415c",
    400: "#6b7a95",
    500: "#94a3b8",
    600: "#a8b5c9",
    700: "#c3cddc",
    800: "#dbe3ee",
    900: "#f1f5f9",
    950: "#f8fafc",
  },
};

export const brandScale: Record<"light" | "dark", Record<BrandStep, string>> = {
  light: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  dark: {
    50: "rgba(59, 130, 246, 0.14)",
    100: "rgba(59, 130, 246, 0.22)",
    200: "rgba(96, 165, 250, 0.32)",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#3b82f6",
    700: "#2563eb",
    800: "#93c5fd",
    900: "#bfdbfe",
  },
};

export const toneLight = {
  "0f172a": "#0f172a",
  "1e293b": "#1e293b",
  "334155": "#334155",
  "090d16": "#090d16",
  "171836": "#171836",
  "2d251f": "#2d251f",
  "1e40af": "#1e40af",
  "1e3a8a": "#1e3a8a",
  "1e1b4b": "#1e1b4b",
  "312e81": "#312e81",
  "881337": "#881337",
  "22c55e": "#22c55e",
  "16a34a": "#16a34a",
  "10b981": "#10b981",
  "059669": "#059669",
  "34d399": "#34d399",
  "4ade80": "#4ade80",
  "166534": "#166534",
  "065f46": "#065f46",
  f0fdf4: "#f0fdf4",
  ecfdf5: "#ecfdf5",
  ef4444: "#ef4444",
  dc2626: "#dc2626",
  be123c: "#be123c",
  f43f5e: "#f43f5e",
  db2777: "#db2777",
  e11d48: "#e11d48",
  ec4899: "#ec4899",
  c026d3: "#c026d3",
  fef2f2: "#fef2f2",
  fee2e2: "#fee2e2",
  fca5a5: "#fca5a5",
  f59e0b: "#f59e0b",
  d97706: "#d97706",
  eab308: "#eab308",
  f97316: "#f97316",
  ea580c: "#ea580c",
  "7c3aed": "#7c3aed",
  "8b5cf6": "#8b5cf6",
  a855f7: "#a855f7",
  "6d28d9": "#6d28d9",
  "6366f1": "#6366f1",
  "4f46e5": "#4f46e5",
  "4338ca": "#4338ca",
  "818cf8": "#818cf8",
  "06b6d4": "#06b6d4",
  "0284c7": "#0284c7",
  "0369a1": "#0369a1",
  "0d9488": "#0d9488",
  "0f766e": "#0f766e",
  e0f2fe: "#e0f2fe",
  "fx-166534": "#166534",
  "fx-065f46": "#065f46",
  "fx-16a34a": "#16a34a",
  "fx-059669": "#059669",
  "fx-dc2626": "#dc2626",
  "fx-be123c": "#be123c",
  "fx-e11d48": "#e11d48",
  "fx-db2777": "#db2777",
  "fx-4338ca": "#4338ca",
  "fx-6d28d9": "#6d28d9",
  "fx-7c3aed": "#7c3aed",
  "fx-4f46e5": "#4f46e5",
  "fx-2563eb": "#2563eb",
  "fx-0284c7": "#0284c7",
  "fx-0369a1": "#0369a1",
  "fx-0d9488": "#0d9488",
  "fx-0f766e": "#0f766e",
  "fx-d97706": "#d97706",
  "fx-f97316": "#f97316",
} as const;

export const toneDarkOverrides: Partial<
  Record<keyof typeof toneLight, string>
> = {
  f0fdf4: "rgba(34, 197, 94, 0.14)",
  ecfdf5: "rgba(16, 185, 129, 0.14)",
  fef2f2: "rgba(239, 68, 68, 0.14)",
  fee2e2: "rgba(239, 68, 68, 0.2)",
  e0f2fe: "rgba(14, 165, 233, 0.18)",
  "166534": "#86efac",
  "065f46": "#6ee7b7",
  "16a34a": "#4ade80",
  "059669": "#34d399",
  dc2626: "#f87171",
  be123c: "#fb7185",
  "4338ca": "#a5b4fc",
  "6d28d9": "#c4b5fd",
  "4f46e5": "#818cf8",
  "0284c7": "#38bdf8",
  d97706: "#fbbf24",
};

const cssVar = (path: string) => `var(--mui-palette-${path})`;
export const v = {
  neutral: Object.fromEntries(
    NEUTRAL_STEPS.map((s) => [s, cssVar(`neutral-${s}`)]),
  ) as Record<NeutralStep, string>,
  brand: Object.fromEntries(
    BRAND_STEPS.map((s) => [s, cssVar(`brand-${s}`)]),
  ) as Record<BrandStep, string>,
  tone: (hex: keyof typeof toneLight) => cssVar(`tone-${hex}`),
  white: cssVar("common-white"),
  paper: cssVar("background-paper"),
  page: cssVar("background-default"),
} as const;
