# Accessibility Checklist (WCAG 2.1 AA) — ChatApp

Referenced by `frontend-ui-engineering` and `chatapp-design-system`. Use as a PR/QA checklist.

## 1. Perceivable

- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 18px / 14px bold). Use `text.primary` / `text.secondary`; `#94a3b8` is icon/placeholder only.
- [ ] UI component & icon contrast ≥ 3:1 (borders of inputs, focus ring, status dots).
- [ ] Status never conveyed by colour alone (online/offline, read/unread, error → add text, icon shape or `aria-label`).
- [ ] Images/avatars: meaningful `alt` (user's name) or `alt=""` when decorative; decorative SVG/lucide icons `aria-hidden`.
- [ ] Text can be zoomed to 200% without loss; layout reflows at 320px with no horizontal scroll.
- [ ] Respect `prefers-reduced-motion` (global rule in `globals.css`).

## 2. Operable

- [ ] Everything reachable and operable with keyboard; logical Tab order; no keyboard traps.
- [ ] Visible focus indicator on every interactive element (global `:focus-visible` ring; don't set `outline: none` without a replacement).
- [ ] Interactive elements are real `button`/`a`/`input` (MUI `Button`, `IconButton`, `ListItemButton`, `ButtonBase`, `Link`) — not `div onClick`.
- [ ] Skip link to `#main-content` exists in `ClientShell`.
- [ ] Dialogs/menus: focus moves in, `Esc` closes, focus returns to the trigger. (MUI does this — don't `disableRestoreFocus`/`disableEnforceFocus`.)
- [ ] Touch targets ≥ 40×40 px for primary actions (≥ 44 recommended on mobile).
- [ ] No time limits on essential actions; toasts auto-hide ≥ 3.5 s and are dismissible.

## 3. Understandable

- [ ] `<html lang="vi">`; foreign phrases marked with `lang` if long.
- [ ] Form fields have a visible label or `aria-label`; errors are text, associated via `helperText`/`aria-describedby`; `aria-invalid` reflects state.
- [ ] Destructive actions confirm via dialog with clear wording.
- [ ] Consistent navigation and naming across screens.

## 4. Robust / semantics

- [ ] One `<h1>` per page; heading levels don't skip; headings aren't used for styling.
- [ ] Landmarks: `header`/AppBar, `nav`, one `main`, `aside` for sidebars, `section` with `aria-label` where needed.
- [ ] Icon-only buttons have `aria-label` in Vietnamese; toggle buttons use `aria-pressed`; disclosure buttons use `aria-expanded` / `aria-controls` / `aria-haspopup`.
- [ ] Tabs use `role=tablist/tab/tabpanel` with `aria-controls` ↔ `aria-labelledby` (MUI `Tabs` + ids).
- [ ] Live regions: chat log `role="log" aria-live="polite"`; transient status (`typing`, save results) `role="status"`; errors `role="alert"`.
- [ ] Lists are `ul/li` or MUI `List`; current item `aria-current`.

## 5. Chat-specific

- [ ] Incoming messages announced politely, not interrupting typing.
- [ ] Unread count exposed textually (`"3 tin nhắn chưa đọc"`).
- [ ] IME-safe Enter handling (`nativeEvent.isComposing`).
- [ ] Message timestamps/status available as text (visually hidden is fine).

## Tooling

- DevTools → Lighthouse (Accessibility), Elements → Accessibility tree, Rendering → emulate `prefers-reduced-motion` / vision deficiencies.
- `axe DevTools` extension or `@axe-core/playwright` for automated scan; automated tools catch ~30–40% — still test keyboard & screen reader manually (NVDA/VoiceOver) for primary flows.
