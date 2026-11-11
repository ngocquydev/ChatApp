# Design and UI Guidelines

This document records ChatApp's frontend design-system and interaction constraints. Agent workflow is in [AGENTS.md](./AGENTS.md), and product scope is in [PRODUCT.md](./PRODUCT.md).

## Visual system

- Use theme tokens for colors. Do not hard-code hex/RGB colors in frontend components. Use MUI palette tokens or `@/theme/tokens`; add missing shared tokens to `src/theme/tokens.ts`. ESLint enforces this under `src/**`, except theme files and `SocialIcons.tsx`.
- Support light and dark schemes with scheme-aware tokens. Do not branch on `isDark`. Pin always-dark areas with `data-light=""`. In `sx`/`styled`, use CSS variables or `theme.vars.palette` where a scheme-aware value is required.
- Use the theme's Inter Variable font. Do not set component-specific `fontFamily`. Use `<BrandLogo />` for the product mark.
- Reuse shared components such as `BrandLogo`, `PresenceAvatar`, `EmptyState`, and `ConfirmDialog` from `src/components/common`.
- Numeric MUI `sx.borderRadius` values are multiplied by the theme base radius (12); use explicit strings such as `"16px"`, `"12px"`, and `"8px"` for pixel radii.

## Interaction and accessibility

- Use semantic interactive components (`Button`, `IconButton`, `ListItemButton`, `ButtonBase`, or `Link`). Do not make `Box`, `div`, or `Typography` clickable controls.
- Icon-only buttons need a Vietnamese `aria-label`. Do not convey state by color alone.
- Below 600 px, follow the app's master-detail navigation pattern and keep desktop features reachable on mobile.
- Data views need loading (Skeleton), empty (`EmptyState`), error with retry, and pending-action states.
- Confirm destructive actions with a `Dialog`, not `window.confirm`. Unimplemented controls must be disabled with a "sắp ra mắt" tooltip.
- Do not submit a message while `e.nativeEvent.isComposing` is true; this protects Telex/VNI input.
- Keep modal `disableScrollLock` behavior and do not autofocus fields on open.
- Each page has exactly one `<h1>`. `ClientShell` supplies `<main id="main-content">`; pages must not add a second `<main>`.
- Full-height layouts use `100dvh` and `APP_BAR_HEIGHT`, not `100vh`.
- Keep Vietnamese UI copy concise and use `…` instead of three dots. Translate visible text through the locale system described in [PRODUCT.md](./PRODUCT.md).
- Component files should generally stay near or below 250 lines; split larger components by responsibility.

## Existing design-system context

- Theme tokens, `globals.css`, `ChatApp` and its app components, `AppBar`, and `ClientShell` have been standardized around the design system.
- ESLint enforces the no-hard-coded-color rule. Dark mode is available via `ColorModeToggle` and follows the operating-system preference by default.
- Known cleanup areas include accessibility labels/click targets, complete loading/error/empty states, and large components such as `Profile.tsx`, `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `FloatingChatBox.tsx`, `PersonCall.tsx`, `Feed.tsx`, `Message.tsx`, `PostComments.tsx`, and the AppBar popover. Improve the touched accessibility and UX when editing these areas.
- Dark-mode browser review has not been completed in the documented environment. Verify visually when browser access is available and report any limitation.

## UI verification

Follow `frontend-ui-verification`. Check widths 320, 390, 768, 1024, and 1440 px, interaction states, keyboard access, and both color schemes when browser tools are available. If the browser cannot be opened, state that runtime UI verification remains outstanding.
