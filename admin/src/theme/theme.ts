import { createTheme } from "@mui/material/styles";
import {
  BrandStep,
  NeutralStep,
  brandScale,
  motion,
  neutralScale,
  radius,
  shadows,
  toneDarkOverrides,
  toneLight,
  v,
} from "./tokens";

// Mở rộng palette để `sx={{ color: "neutral.500" }}` và `--mui-palette-neutral-500` hoạt động
declare module "@mui/material/styles" {
  interface Palette {
    neutral: Record<NeutralStep, string>;
    brand: Record<BrandStep, string>;
    tone: Record<string, string>;
  }
  interface PaletteOptions {
    neutral?: Record<NeutralStep, string>;
    brand?: Record<BrandStep, string>;
    tone?: Record<string, string>;
  }
}

const fontFamily =
  '"Inter Variable", "Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const darkTone = { ...toneLight, ...toneDarkOverrides } as Record<string, string>;

const theme = createTheme({
  // Dark mode: biến CSS + chọn scheme qua thuộc tính data-mui-color-scheme (đặt bởi InitColorSchemeScript)
  cssVariables: { colorSchemeSelector: "data" },
  defaultColorScheme: "light",
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#2563eb", light: "#3b82f6", dark: "#1d4ed8", contrastText: "#ffffff" },
        secondary: { main: "#7c3aed" },
        success: { main: "#16a34a" },
        warning: { main: "#d97706" },
        error: { main: "#dc2626" },
        text: { primary: "#0f172a", secondary: "#64748b", disabled: "#94a3b8" },
        divider: "#e2e8f0",
        background: { default: "#f1f5f9", paper: "#ffffff" },
        action: {
          hover: "rgba(15, 23, 42, 0.04)",
          selected: "rgba(37, 99, 235, 0.08)",
          focus: "rgba(37, 99, 235, 0.12)",
        },
        neutral: neutralScale.light,
        brand: brandScale.light,
        tone: { ...toneLight },
      },
    },
    dark: {
      palette: {
        primary: { main: "#3b82f6", light: "#60a5fa", dark: "#2563eb", contrastText: "#ffffff" },
        secondary: { main: "#a78bfa" },
        success: { main: "#4ade80" },
        warning: { main: "#fbbf24" },
        error: { main: "#f87171" },
        text: { primary: "#f1f5f9", secondary: "#94a3b8", disabled: "#6b7a95" },
        divider: "#243049",
        background: { default: "#0a0f1c", paper: "#111a2e" },
        action: {
          hover: "rgba(255, 255, 255, 0.06)",
          selected: "rgba(59, 130, 246, 0.16)",
          focus: "rgba(59, 130, 246, 0.24)",
        },
        neutral: neutralScale.dark,
        brand: brandScale.dark,
        tone: darkTone,
      },
    },
  },
  shape: { borderRadius: radius.md },
  typography: {
    fontFamily,
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.03em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.015em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    caption: { lineHeight: 1.4 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: v.page },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          fontWeight: 600,
          transition: `background-color ${motion.base} ${motion.ease}, border-color ${motion.base} ${motion.ease}, box-shadow ${motion.base} ${motion.ease}, transform ${motion.fast} ${motion.ease}`,
          "&:active:not(.Mui-disabled)": { transform: "scale(0.98)" },
        },
        sizeSmall: { borderRadius: radius.sm },
        contained: {
          "&:hover": { boxShadow: shadows.sm },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `background-color ${motion.base} ${motion.ease}, color ${motion.base} ${motion.ease}, transform ${motion.fast} ${motion.ease}`,
          "&:active:not(.Mui-disabled)": { transform: "scale(0.94)" },
        },
      },
    },

    MuiButtonBase: {
      defaultProps: { disableRipple: false },
      styleOverrides: {
        root: {
          "&:focus, &:focus-visible, &.Mui-focusVisible": {
            outline: "none !important",
            boxShadow: "none !important",
          },
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          "&.Mui-focused": { boxShadow: "none !important" },
        },
        input: {
          "&:focus, &:focus-visible": { outline: "none !important" },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          transition: `box-shadow ${motion.base} ${motion.ease}, background-color ${motion.base} ${motion.ease}`,
          "&:not(.MuiInputBase-multiline)": { height: "54px" },
          "&.MuiInputBase-sizeSmall:not(.MuiInputBase-multiline)": { height: "42px" },
          "&.Mui-focused": { boxShadow: "none" },
          "&.Mui-focused.Mui-error": { boxShadow: "none" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: "1px",
          },
        },
        input: {
          height: "100%",
          boxSizing: "border-box",
          padding: "0 14px",
          fontSize: "1rem",
          "&:focus, &:focus-visible": { outline: "none !important" },
        },
        notchedOutline: { borderColor: v.neutral[300] },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: v.neutral[200] },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        // AppBar luôn tối ở cả hai scheme (nền cố định, chữ trắng)
        root: ({ theme: t }) => ({
          backgroundColor: "#0f172a",
          color: "#ffffff",
          backgroundImage: "none",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          ...t.applyStyles("dark", { backgroundColor: "#0d1424" }),
        }),
      },
    },

    MuiDialog: {
      // Quy ước dự án (README): không khóa scroll để trang không bị giật khi mở modal
      defaultProps: { disableScrollLock: true },
      styleOverrides: {
        paper: {
          borderRadius: radius.xl,
          boxShadow: shadows.lg,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, padding: "20px 24px 12px" } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: "12px 24px 20px", gap: 4 } },
    },

    MuiPopover: {
      defaultProps: { disableScrollLock: true },
      styleOverrides: {
        paper: { boxShadow: shadows.lg, border: `1px solid ${v.neutral[200]}` },
      },
    },
    MuiMenu: {
      defaultProps: { disableScrollLock: true },
      styleOverrides: {
        paper: { borderRadius: radius.md, marginTop: 6 },
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: { root: { borderRadius: radius.sm, minHeight: 40 } },
    },

    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: "#1e293b",
          color: "#ffffff",
          fontSize: "0.75rem",
          fontWeight: 500,
          borderRadius: 8,
          padding: "6px 10px",
          ...t.applyStyles("dark", { backgroundColor: "#2b3750" }),
        }),
        arrow: ({ theme: t }) => ({
          color: "#1e293b",
          ...t.applyStyles("dark", { color: "#2b3750" }),
        }),
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: "3px 3px 0 0" },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          color: v.neutral[500],
          "&.Mui-selected": { color: v.brand[600] },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: radius.pill },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, alignItems: "center" },
        filled: { fontWeight: 600 },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          backgroundColor: v.brand[500],
          color: "#ffffff",
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 700 },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          transition: `background-color ${motion.fast} ${motion.ease}`,
          "&.Mui-selected": {
            backgroundColor: v.brand[50],
            "&:hover": { backgroundColor: v.brand[100] },
          },
        },
      },
    },

    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: { root: { backgroundColor: v.neutral[200] } },
    },

    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: radius.pill } },
    },
  },
});

export default theme;
