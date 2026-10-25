---
name: chatapp-design-system
description: The ChatApp frontend design contract — design tokens, MUI theme usage, shared components (BrandLogo, PresenceAvatar, EmptyState), layout rules and banned patterns. Use whenever you create or modify ANY UI under frontend/src (pages, components, theme, CSS), restyle a screen, or review a UI diff, so the interface stays consistent and no agent re-introduces hard-coded colors or ad-hoc styling.
---

# ChatApp Design System

The single source of truth for how ChatApp looks. Read this **before** touching UI code.
Pair it with `frontend-ui-engineering` (generic craft), `chatapp-ux-patterns` (chat-specific behavior),
`mui-nextjs-conventions` (framework gotchas) and `frontend-ui-verification` (proof it works).

## Where things live

| Concern | File |
|---|---|
| Color / radius / shadow / motion tokens | `frontend/src/theme/tokens.ts` |
| MUI theme (palette, typography, component overrides) | `frontend/src/theme/theme.ts` |
| Global CSS (font import, focus ring, skip link, keyframes, reduced motion) | `frontend/src/app/globals.css` |
| Brand mark | `frontend/src/components/common/BrandLogo.tsx` |
| Avatar + online/offline dot | `frontend/src/components/common/PresenceAvatar.tsx` |
| Empty states | `frontend/src/components/common/EmptyState.tsx` |
| Date/time formatting (vi-VN) | `frontend/src/utils/formatTime.ts` |
| Reference screen built to this contract | `frontend/src/components/pages/ChatApp.tsx` + `components/chat/app/*` |
| Nút đổi sáng/tối | `frontend/src/components/common/ColorModeToggle.tsx` |
| Logo Google/Facebook (ngoại lệ được phép dùng hex) | `frontend/src/components/common/SocialIcons.tsx` |

## Dark mode (đã có — mọi màn hình phải đúng ở CẢ HAI scheme)

Cơ chế: MUI `cssVariables` + `colorSchemeSelector: "data"` → `<html data-light | data-dark>`, đặt sớm bởi
`InitColorSchemeScript` (layout.tsx). Mặc định theo hệ điều hành, người dùng chọn qua `ColorModeToggle`
(lưu localStorage). **Component không bao giờ if/else `isDark`** — chỉ dùng token tự đổi theo scheme:

| Cần | Viết | Ghi chú |
|---|---|---|
| Chữ / nền / viền chuẩn | `"text.primary"`, `"text.secondary"`, `"background.paper"`, `"background.default"`, `"divider"`, `"primary.main"`, `"action.hover"` | khóa palette của MUI |
| Thang xám | `v.neutral[500]` hoặc chuỗi `"var(--mui-palette-neutral-500)"` | thang bị **đảo** ở dark (900 = chữ chính, 100 = nền trang) |
| Thang xanh thương hiệu | `v.brand[600]` | 50–200 ở dark là nền xanh trong suốt |
| Màu nhấn/trạng thái (xanh lá, đỏ, cam, tím…) | `v.tone("16a34a")` | thêm màu mới vào `toneLight` (+ `toneDarkOverrides` nếu cần sáng/dịu hơn ở dark) |
| Chữ trắng trên nền màu | `v.white` | không đổi |
| Nền card/paper | `v.paper` | đổi theo scheme |
| Nền gradient có chữ trắng, dùng màu đã có override dark | `"var(--mui-palette-tone-fx-4f46e5)"` (tiền tố `fx-`) | bản `fx-` không đổi theo scheme |

Khu vực **luôn tối** (AppBar, hero đăng nhập/đăng ký, trang quên mật khẩu, header drawer): thêm thuộc tính
`data-light=""` vào phần tử gốc của khu vực đó → mọi biến màu bên trong được ghim về giá trị scheme sáng
(giữ nguyên thiết kế gốc, không bị đảo). Nền cố định dùng `tone-0f172a` / `tone-1e293b`…, KHÔNG dùng `neutral-900`
(sẽ sáng lên ở dark mode).

Giới hạn đã biết: chữ trắng trên `primary.main` ở dark (#3b82f6) chỉ đạt ≈3.7:1 (đủ cho chữ đậm ≥14px/UI lớn,
không đạt AA cho chữ thường nhỏ) — dùng cho nút/chip chữ đậm, không dùng cho đoạn văn nhỏ.
Không dùng `alpha(theme.palette.x)` / `theme.palette.*` trong `sx`/`styled` (chỉ trả giá trị scheme sáng) —
dùng chuỗi `var(--mui-palette-...)` hoặc `theme.vars.palette.*`.

## Rules (non-negotiable)

1. **No raw hex / rgb in components.** Use theme tokens in `sx`:
   `color: "text.secondary"`, `bgcolor: "background.default"`, `borderColor: "divider"`,
   `bgcolor: "primary.main"`, `"action.hover"`, `"action.selected"`, `"success.main"`, `"error.main"`.
   Need a raw value (SVG fill, canvas, lucide `color=`)? Use the CSS-variable form (`v.*` / `var(--mui-palette-…)`) so it follows dark mode;
   only `<meta>`/canvas APIs that cannot read CSS variables may import raw hex from `@/theme/tokens`.
   Missing a token? **Add it to `tokens.ts`** (and the theme if it should be a palette entry) — don't inline it.
   ESLint (`no-restricted-syntax`) enforces this for all of `src/**` except `src/theme/**` and `SocialIcons.tsx`.
2. **Typography:** Inter Variable (loaded in `globals.css`, set in `theme.ts`). Never set `fontFamily` per component
   (no `monospace` wordmarks). Use MUI variants (`h5`, `subtitle2`, `body2`, `caption`) — avoid hand-tuned `fontSize` except
   for tiny badges/captions.
3. **Contrast (WCAG AA):** body text uses `text.primary` / `text.secondary` (#64748b = 4.8:1). `neutral[400]` (#94a3b8,
   2.6:1) is **only** for decorative icons and placeholders — never for readable text.
4. **Radius scale:** 8 (small controls) · 12 (default, `theme.shape.borderRadius`) · 16 (cards, inputs groups) · 20 (dialogs) · pill (chips/badges).
   Don't invent `10px`, `14px`, `18px`, `24px` outside chat bubbles (18/6).
5. **Shadows:** flat by default; `shadows.sm|md|lg` from tokens for floating layers only (menus, dialogs). No stacked/colored glow shadows on content.
6. **Gradients:** only on brand moments (auth hero). Not on buttons, bubbles, avatars, or empty-state icons.
7. **Purple/indigo:** the primary brand is blue (`primary.main` #2563eb). `secondary` violet is accent-only; don't make screens purple.
8. **Spacing:** MUI spacing scale (`p: 1.5`, `gap: 2`) — no arbitrary px for layout.
9. **Heights:** full-height screens use `100dvh` (not `100vh`, which breaks on mobile browser chrome) and subtract `APP_BAR_HEIGHT` (64) via `pt`.
10. **One `<h1>` per page.** Landmarks: `ClientShell` owns `<main id="main-content">`; pages must not add another `<main>`.
11. **Icons:** `lucide-react` for UI icons. Decorative icons get `aria-hidden`; icon-only buttons get `aria-label` (Vietnamese).
12. **Language:** all user-facing copy is Vietnamese, sentence case, no trailing `...` — use `…`.

## Use the shared components

- Logo → `<BrandLogo />` (never the Android icon, never plain text).
- User picture with presence → `<PresenceAvatar name src online size />` (no per-file `StyledBadge`).
- Nothing to show → `<EmptyState icon title description action />` (never a bare centered `Typography`).
- Loading content → `Skeleton` rows shaped like the final content (spinners only for buttons/short inline actions).
- Destructive action → `Dialog` confirm (see `FriendsPanel`) — **never `window.confirm`/`alert`**.
- Toast → `Snackbar` + `Alert` (`filled`), bottom-center, 3.5 s.

## Theme recipe for new controls

- Buttons: `variant="contained"` for the single primary action, `outlined`/text for the rest. `textTransform` and radius come from the theme — don't repeat them in `sx`.
- Inputs: default MUI `TextField` (54px high). In dense areas use `size="small"` (42px) — the theme handles it; don't hard-code `height`.
- Lists of interactive rows: `ListItemButton` (focus, hover, `selected` state free) — **never `Box onClick`**.
- Tabs: MUI `Tabs` with `id`/`aria-controls`; segmented choices: `ToggleButtonGroup exclusive`.

## Component size & structure

- A component file > ~250 lines must be split (presentational pieces + one orchestrator). `ChatApp.tsx` is the template.
- Presentational components receive data and callbacks via props; stores are read in the orchestrator.
- Keep `use client` only where hooks/browser APIs are used.

## Banned patterns (reject in review)

- `#rrggbb`, `rgba(...)` literals in `sx` / `style` (except inside `tokens.ts`/`theme.ts`/`globals.css`).
- `Box/div/Typography onClick` acting as button or link. Use `Button`, `IconButton`, `ListItemButton`, `ButtonBase`, or `Link`.
- Icon-only controls without `aria-label`.
- `100vh` for layout height; fixed `64px` literals (use `APP_BAR_HEIGHT`).
- Dead controls (buttons that do nothing). Either implement, or render `disabled` with a tooltip "… — sắp ra mắt".
- Color as the only status signal (online/read/error must also have text, icon shape or `aria-label`).
- Copy-pasted styled wrappers for something that already exists in `components/common`.

## Definition of done for UI work

Run the checklist in `frontend-ui-verification`; additionally confirm:
- [ ] `grep -rn "#[0-9a-fA-F]\{6\}" <changed files>` returns nothing outside tokens/theme/css/SocialIcons
- [ ] Đã xem ở cả light và dark (hoặc nêu rõ chưa kiểm tra): chữ đọc được, không có khối trắng/đen "lạc" scheme
- [ ] Khu vực luôn tối đã có `data-light=""`
- [ ] Uses shared components where applicable
- [ ] Empty, loading, error and permission states are all designed
- [ ] Works at 320 / 768 / 1024 / 1440 px
