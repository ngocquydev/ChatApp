---
name: mui-nextjs-conventions
description: Conventions and known gotchas for this project's stack — Next.js 16 App Router, React 19, MUI v9 (with Emotion CSS layers), zustand, react-hook-form + zod, lucide-react. Use when writing or debugging frontend code that uses MUI components/theme/sx, Next metadata/viewport, client/server component boundaries, or when a MUI/Next API behaves differently than older docs suggest.
---

# MUI v9 + Next.js 16 conventions (ChatApp frontend)

Verify against official docs (see `source-driven-development`) — these are the project's local rules and the traps already hit.

## Stack facts

- Next `16.x` App Router, React `19`, MUI `@mui/material ^9`, `@mui/material-nextjs/v16-appRouter`, Emotion.
- `AppRouterCacheProvider options={{ enableCssLayer: true }}` → MUI styles live in a CSS `@layer`; **unlayered** CSS (e.g. `globals.css`) always wins over MUI styles. Don't fight it with `!important`; use theme overrides or `sx`.
- Path alias: `@/` → `frontend/src/`. Prefer it over `../../`.
- State: zustand stores in `src/store/*`. Server data hooks via TanStack Query where present.
- Scripts (run from `frontend/`): `npm run typecheck`, `npm run lint`, `npm run build`, `npm run dev` (port 5173).

## MUI v9 gotchas

| Trap | Do this |
|---|---|
| `components.MuiButton.styleOverrides.containedPrimary` (and other `<variant><Color>` keys) no longer type-check | Use `contained` / `outlined` / `root`, or target with `&.MuiButton-colorPrimary` |
| Overriding `outlined.borderColor` globally clobbers `color="error"` etc. | Don't override borders at the variant level; set per-instance `sx` |
| `TextField` props `InputProps` / `inputProps` are legacy | Use `slotProps={{ input: {...}, htmlInput: {...} }}` |
| `Dialog`/`Tooltip` `PaperProps`/`componentsProps` legacy | Use `slotProps={{ paper: {...} }}` |
| `ToggleButtonGroup` buttons keep inner borders/radius | Style via `& .MuiToggleButtonGroup-grouped` (see `FriendsPanel`) |
| `Tooltip` on a `disabled` button warns / doesn't fire | Wrap the button in `<span>` |
| `styled(Badge)<{ isonline?: string }>` leaks unknown DOM props | Use `shouldForwardProp` (see `PresenceAvatar`) |
| Outlined input height is theme-forced to 54px | Use `size="small"` (42px) in dense UI — theme handles it; multiline is exempt |
| `AppBar` default colour is `primary` | Theme sets dark slate; `color="inherit"` is the default prop |
| Opening a Dialog/Menu locks body scroll → page jumps by the scrollbar width | Project decision (README): `disableScrollLock` is the **theme default** for Dialog/Popover/Menu; also do **not** `autoFocus` inputs on modal open |

## `sx` rules

- Colors, spacing, radius → tokens/theme keys (see `chatapp-design-system`). Strings like `"text.secondary"`, `"divider"`, `"action.hover"` resolve through the theme.
- Responsive values: object form `{ xs: ..., sm: ... }`. **Arrays mean breakpoints**, not CSS fallbacks — don't use `["100vh","100dvh"]` for fallback.
- Prefer `ListItemButton`, `ButtonBase`, `Button`, `Link` for anything clickable; add `component="div"` to `ButtonBase` when its children contain block elements.
- Keyframes: shared ones live in `globals.css` (`blink`, `fadeInUp`, `typingDot`); component-specific ones use the `"@keyframes name": {...}` key inside `sx`/`styled`.

## Next.js 16 rules

- `viewport` and `themeColor` go in `export const viewport: Viewport` — **not** in `metadata`.
- Every component using hooks, event handlers, `window`, `localStorage`, zustand, or MUI event props needs `"use client"`. Keep server components for static shells/metadata.
- Navigation: `next/link` for links, `useRouter().push` for imperative; don't build `Typography onClick` fake links.
- Browser-only code in effects, guarded by `typeof window`; never read `localStorage` during render.
- Fonts: Inter Variable via `@fontsource-variable/inter` imported in `globals.css` (no network at runtime, includes Vietnamese subset).

## Forms

- `react-hook-form` + `zodResolver`; error text via `helperText`, `error={!!errors.x}`.
- Auth pages are intentionally full-bleed and hide the AppBar (`ClientShell.hideAppBarRoutes`).

## Realtime / stores

- Socket + MQTT lifecycle is owned by `useChatStore` (`connectSocket`/`disconnectSocket`); components call them in an effect with proper cleanup.
- Selecting a conversation: `selectConversation(conv)`; leaving it (mobile back): `clearActiveConversation()`.
- Store actions that mutate friends return `{ success, message }` — surface `message` in a toast.

## Pre-merge commands

```
cd frontend
npm run typecheck
npm run lint
npm run build   # when touching routing, metadata, config or many files
```

## Dark mode / CSS variables (MUI v9)

- `theme.ts` bật `cssVariables: { colorSchemeSelector: "data" }` + `colorSchemes: { light, dark }`. Selector sinh ra là `:root,[data-light]` và `[data-dark]` (**không** phải `data-mui-color-scheme`).
- `layout.tsx` phải có `<InitColorSchemeScript attribute="data" defaultMode="system" />` đầu `<body>` và `suppressHydrationWarning` trên `<html>`; `providers.tsx`: `<ThemeProvider defaultMode="system">` + `<CssBaseline enableColorScheme />`. Đổi `attribute`/`colorSchemeSelector` ở một nơi thì phải đổi nơi kia.
- Trong `sx`/`styled`: `theme.palette.*` và `alpha()` luôn là giá trị scheme sáng → dùng `var(--mui-palette-…)` hoặc `theme.vars.palette.*`. Biến thể theo scheme trong style override: `theme.applyStyles("dark", {...})`.
- Palette tùy biến (`neutral`, `brand`, `tone`) được khai báo bằng module augmentation trong `theme.ts`; thêm key mới phải sửa cả `PaletteOptions`.
- Hook `useColorScheme()` trả `mode` = `undefined` ở lần render đầu/SSR → đừng render khác nhau theo `mode` trước khi mount (xem `ColorModeToggle` dùng `useSyncExternalStore`).
- `<meta name="theme-color">` (viewport.themeColor) không hiểu `var()` → dùng hex thật từ `neutralScale` trong tokens, kèm `media` light/dark.
- Phần tử gắn `data-light=""` sẽ ghim mọi biến màu bên trong về scheme sáng (dùng cho khu vực luôn tối).
