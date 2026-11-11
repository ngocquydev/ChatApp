# Short Video Explore

## Overview

`/explore` is a vertical short-video feed for videos attached to posts visible to the signed-in viewer. The backend feed already includes public posts and applies friend privacy rules, so the page reuses that cursor-paginated endpoint and filters for video media.

## Viewer behavior

- Desktop uses the shared left navigation beside a dark, full-height viewing stage. Mobile hides the desktop sidebar and keeps the video stage full-width.
- Each video occupies one stage and snaps into place while scrolling. Previous/next controls move between clips.
- Videos play inline, loop, and start muted when at least 65% of the video enters the viewport. Videos pause after scrolling away.
- The video controls provide play/pause, seek, elapsed time, and mute/unmute. The sound choice applies across clips.
- The heart button toggles the `love` reaction and displays the love count; comment actions reuse the existing post interaction.
- Sharing within ChatApp reuses the post sharing dialog. Public, non-sensitive videos can also be shared as direct media links through Facebook, X, WhatsApp, Telegram, a copy action, or the device share sheet when available. External shares do not increase the in-app share count.
- Friends-only, private, and sensitive videos do not expose direct external share links.
- Media flagged as sensitive is blurred until the viewer chooses to reveal it.
- Loading, retryable errors, empty results, and load-more states are shown.
- The previous friend discovery page is available at `/friends`.

## Posting a video

Select **Đăng video** on `/explore` to jump to the existing post composer on the home feed. Select **Ảnh/Video**, attach an MP4, WebM, or MOV file (up to 100 MB), choose **Công khai**, then publish. Public videos can appear in Explore; the same composer also supports the existing post privacy options.

## Verification

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm run build` — passed.
- `node --test tests/shortVideoActions.test.mjs` — passed (heart transitions, encoded social URLs, and private/sensitive sharing limits).
- Browser screenshot/runtime review was attempted previously with `scripts/capture-screenshot.ps1` but Chrome exited before producing an image. The current browser tooling has no authenticated test session for `/explore`. Visual behavior remains unverified; review `/explore` at 390 px and 1440 px with both light and dark schemes when browser access is available.
