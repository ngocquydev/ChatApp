---
name: chatapp-ux-patterns
description: UX behavior rules for a realtime chat product in Vietnamese — mobile master–detail navigation, message grouping and scrolling, typing/presence/read indicators, IME-safe sending (Telex/VNI), destructive-action confirmation, honest "coming soon" controls, state coverage and microcopy. Use when building or changing chat, friends, notifications, forms or any interactive flow in this app.
---

# ChatApp UX Patterns

Behavioral counterpart to `chatapp-design-system`. These patterns are already implemented in
`components/pages/ChatApp.tsx` and `components/chat/app/*` — **reuse them, don't reinvent.**

## 1. Navigation & layout

- **Mobile (< `sm` = 600px) is master–detail:** show the list *or* the conversation, never a squeezed icon rail.
  Conversation view has a back button (`ArrowLeft`, `aria-label="Quay lại danh sách hội thoại"`) wired to `clearActiveConversation()`.
- **≥ `sm`:** sidebar (320 / 380 px) + conversation side by side.
- Every feature reachable on desktop must be reachable on mobile (the old 80 px rail hid Friends/Search/Add-friend — don't regress).
- Use `dialog fullScreen` on mobile for multi-step pickers (`AddFriendDialog` pattern).
- Respect safe areas: bottom bars use `pb: calc(10px + env(safe-area-inset-bottom))`.

## 2. Message list

- Group consecutive messages from the same sender within 5 minutes; avatar and timestamp only on the **last** of a group.
- Insert day separators ("Hôm nay", "Hôm qua", `dd/mm/yyyy`) — use `utils/formatTime.ts`, never raw `toLocaleTimeString([])`.
- **Auto-scroll rule:** scroll to bottom only when (a) the conversation changed, (b) the user is within ~120 px of the bottom, or (c) the user just sent a message. Never yank the viewport while someone reads history.
- Container is `role="log" aria-live="polite"`. Bubble text: `whiteSpace: pre-wrap; overflowWrap: anywhere`.
- Clear stale messages when switching conversations (store does this) and show a **skeleton**, not a blank panel or spinner.
- Status icons: sent = `Check`, read = `CheckCheck` (+ visually-hidden "Đã gửi/Đã xem"). Colour is supplementary.

## 3. Composer

- **Never send on Enter while `e.nativeEvent.isComposing`** — Vietnamese IMEs (Telex/VNI) use Enter to commit a syllable. (`MessageComposer`, `FloatingChatBox`).
- Enter = send, Shift+Enter = newline; show the hint on desktop only.
- Typing indicator: emit `typing=true` at most every 2.5 s, auto `false` after 5 s idle and on send/clear/unmount.
- Disable Send when the trimmed text is empty; give it `aria-label="Gửi tin nhắn"`.
- Remount the composer per conversation (`key={conversationId}`) so drafts don't leak across chats.

## 4. Presence & status

- Online dot + text ("Đang hoạt động" / "Ngoại tuyến") — never dot-only.
- Typing: header status text switches to "Đang soạn tin nhắn…" (`role="status"`), plus bubble dots in the list.
- Unread: bold name + preview, primary-coloured time, count pill with `aria-label="N tin nhắn chưa đọc"`, capped at `99+`.

## 5. Destructive & irreversible actions

- Confirm with a `Dialog` that names the target ("Bạn sẽ không còn là bạn bè với **An**"), a safe default (`Giữ lại`), and an `error`-coloured confirm button. Disable both while pending.
- Always report the outcome via toast (`success` / `info` / `error`) using the message returned by the store.

## 6. Honest controls

- If a feature isn't built yet (calls, attachments, emoji…), render it `disabled` inside a `Tooltip` "… — sắp ra mắt" with an `aria-label` that says so. Never ship a clickable button that does nothing.

## 7. State coverage (every data view)

| State | Required treatment |
|---|---|
| Loading | `Skeleton` shaped like the content, `aria-busy="true"` |
| Empty (no data) | `EmptyState` with a next-step action |
| Empty (no search match) | `EmptyState` echoing the query, no CTA needed |
| Error | message + retry; never a silent blank |
| Pending action | disabled control + progress; no double submit |
| Offline / realtime lost | surface it (banner/status) — don't fail silently |

## 8. Microcopy (Vietnamese)

- Sentence case, natural, short: "Tìm bạn mới", "Chưa có cuộc trò chuyện nào", "Hủy kết bạn".
- Buttons are verbs; empty states say what to do next; errors say what happened and how to recover.
- Use `…` (single char) for ellipsis. Don't mix English labels (`online` badge is the one accepted exception).
- Consistent vocabulary: hội thoại / tin nhắn / bạn bè / lời mời kết bạn / kết bạn / hủy kết bạn.

## 9. Motion

- Micro-animations only: 120–280 ms, `transform`/`opacity`, tokens in `theme/tokens.ts` (`motion`).
- Global `prefers-reduced-motion` is honoured in `globals.css` — don't add JS-driven animation that ignores it.
- Entry animation for new messages (`fadeInUp`) is the ceiling; no bouncing, no parallax.

## 10. Forms (auth, profile)

- Validate with `react-hook-form` + `zod`; show the message under the field (`helperText`) and keep `aria-invalid` accurate.
- Primary submit is the only `contained` button; show progress inside it and disable while submitting.
- Never block paste in password fields; offer show/hide with `aria-label`.
