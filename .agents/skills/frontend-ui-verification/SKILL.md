---
name: frontend-ui-verification
description: How to prove a ChatApp UI change actually works — static checks, hard-coded-style audit, breakpoint/state/keyboard checklist, how to verify when the browser tool is unavailable, and what to report. Use at the end of any frontend UI/UX change, before saying it is done, or when asked to review/QA the interface.
---

# Frontend UI Verification

"It compiles" is not "it works". Run these gates in order and report evidence, not impressions.

## Gate 1 — static (always, ~1 min)

```powershell
cd d:\Web\chat\frontend
npm run typecheck
npm run lint
```

- Zero new errors. Pre-existing warnings (e.g. `FloatingChatBox` exhaustive-deps) may remain — list them, don't hide them.
- Never silence with `@ts-ignore`, `eslint-disable`, `any` or by deleting code (see `constraint-driven-development`).
- Migrated files are protected by an ESLint rule that bans hex colors (see `eslint.config.mjs`). When you migrate another screen to tokens, **add it to that `files` list**.

## Gate 2 — design-contract audit

```powershell
# hard-coded colours in files you touched
Select-String -Path <changed files> -Pattern '#[0-9a-fA-F]{6}\b'
# fake buttons / clickable non-interactive elements
Select-String -Path <changed files> -Pattern '<(Box|div|Typography)[^>]*onClick'
# viewport units
Select-String -Path <changed files> -Pattern '100vh'
# icon-only controls missing labels: IconButton blocks without aria-label
```

Anything found must be fixed or consciously justified in the report.

## Gate 3 — runtime (browser)

Preferred: `browser-testing-with-devtools` skill (Chrome DevTools MCP) against `http://localhost:5173`
(`npm run dev` in `frontend/`, backend on `:3000`, `docker compose up -d` for Mongo/Redis).

Check at **320, 390, 768, 1024, 1440 px**:

- [ ] No console errors/warnings from your change (hydration, a11y, React keys, MUI prop warnings)
- [ ] No horizontal scroll; no clipped/overlapping content; sticky bars don't cover content
- [ ] Mobile (<600px): every desktop feature still reachable; back navigation works
- [ ] Loading → empty → error → populated states each look intentional
- [ ] Long names/messages, 99+ unread, emoji, Vietnamese diacritics, very long unbroken strings
- [ ] Keyboard only: Tab order logical, visible focus ring, Enter/Space activate, Esc closes dialogs/menus, focus returns to trigger
- [ ] Vietnamese IME (Telex): typing `chào` then Enter does not send mid-composition
- [ ] `prefers-reduced-motion` respected (DevTools → Rendering → emulate)
- [ ] Contrast OK (DevTools contrast picker / axe) — text ≥ 4.5:1

## If the browser tool is unavailable

(e.g. Playwright driver can't download in the sandbox.) Do **not** claim visual verification.

1. Complete Gates 1–2 and run `npm run build` (catches routing/metadata/server-client boundary errors).
2. Read the rendered structure from code: breakpoints (`xs/sm/md`), `display` toggles, overflow/min-height chains (`minHeight: 0` on flex children that scroll).
3. State clearly in the report: *"Not verified visually — please check at 390px and 1440px: <specific things to look at>"*.
4. Ask the user to run `npm run dev` and eyeball the listed screens.

## Report template

```
Verified: typecheck ✔ lint ✔ (N pre-existing warnings: …) build ✔/not run
Contract audit: hex=0, fake-buttons=0, 100vh=0 in changed files
Runtime: <what was exercised, at which widths> | NOT VERIFIED: <list>
Known gaps / follow-ups: <screens not yet migrated to tokens, etc.>
```

## Layout debugging cheatsheet

- A flex child that should scroll needs `minHeight: 0` (column) / `minWidth: 0` (row) on itself and its flex ancestors.
- Full-height app screens: root `height: 100dvh`, `pt: APP_BAR_HEIGHT`, panels `flex: 1; minHeight: 0; overflowY: auto`.
- `noWrap` truncation needs the parent to have `minWidth: 0`.

## Dark mode — bổ sung vào checklist

- Mỗi màn hình chạm tới: kiểm tra **cả light lẫn dark** ở 390 và 1440 px (đổi bằng nút trên AppBar / trang đăng nhập, hoặc đặt `localStorage["mui-mode"]` = `dark` / `light`).
- Soi: chữ trên nền (đặc biệt `text.secondary`, `neutral-400/500`), viền (`divider`), card nổi trên nền trang, input/placeholder, badge/chip nền nhạt, skeleton, bóng đổ, khối trắng/đen "lạc" scheme, ảnh/logo có nền trong suốt.
- Khu vực luôn tối (AppBar, hero auth, trang quên mật khẩu) phải **không đổi** khi bật dark — nếu đổi tức là thiếu `data-light=""`.
- Tương phản ở dark: chữ thường ≥ 4.5:1; chữ trắng trên `primary.main` dark chỉ ≈ 3.7:1 → chỉ dùng cho chữ đậm/UI lớn.
- Không có trình duyệt thì phải nêu rõ "chưa kiểm tra dark mode bằng mắt" trong báo cáo.
