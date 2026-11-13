# Frontend rendering subscriptions

AppBar, PersonCall, RecentChatsPopover and FloatingChatBox select only the Zustand fields they consume. Multiple fields use `useShallow`; single fields use direct selectors. PostFeed and CommentItem subscribe only to the authenticated user.

This prevents unrelated store updates (message history, typing, token refresh, chat box unread counts) from invalidating these consumers. Relevant selected field changes still notify React. Parent renders and component-local state updates are unaffected.

## Verification

A controlled Node experiment using the installed Zustand vanilla store and shallow comparator applied 100 message updates. Whole-store subscription invalidations: 100; the floating chat selection invalidations: 0. Updating the selected online-user array then produced one notification. These are subscription measurements, not browser render timings or Core Web Vitals.

Browser profiling remains outstanding: compare React Profiler commits while receiving messages, typing and refreshing auth on the feed with floating chat open. Confirm message reception, online status, friend requests and profile changes still update their relevant views. No visual layout was changed.
