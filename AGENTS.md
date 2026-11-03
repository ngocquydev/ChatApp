# AGENTS.md — Hướng dẫn bắt buộc cho mọi agent làm việc trong repo ChatApp

> File này luôn được nạp tự động. Đọc kỹ **trước khi sửa code**. Skill chi tiết nằm ở `.agents/skills/*/SKILL.md`.

## 1. Dự án

Ứng dụng chat realtime + mạng xã hội, hỗ trợ 6 ngôn ngữ (Tiếng Việt, English, 简体中文, 繁體中文, 한국어, ไทย), tích hợp hệ thống kiểm duyệt nội dung độc hại & chống bot thông minh.

| Thành phần | Công nghệ | Chạy |
|---|---|---|
| `frontend/` | Next.js 16 (App Router), React 19, MUI v9, Zustand, Socket.IO + MQTT, RHF + Zod, i18n VI/EN | `npm run dev` (cổng 5173) |
| `admin/` | React 19, Vite, React Router v7, MUI v9, Zustand, Lucide, i18n VI/EN | `npm run dev` (cổng 5174) |
| `backend/` | NestJS, MongoDB, Redis, Socket.IO, Swagger, Moderation & Trust Engine (NLP, Vision, Isolation Forest, Autoencoder) | `npm run start:dev` (cổng 3000) |
| Hạ tầng | Docker (Mongo, Redis) | `docker compose up -d` (từ gốc repo) |
| Cổng chất lượng | lint + typecheck + test bảo mật/RAM/N+1 | `scripts/check.ps1` (Windows) / `scripts/check.sh` |

Trước khi push: `scripts/check.ps1`. Với frontend tối thiểu: `npm run typecheck` và `npm run lint` trong `frontend/`.

## 2. Quy trình làm việc

1. Đọc `using-agent-skills` để chọn skill phù hợp, **kích hoạt skill trước khi làm** (xem bảng §3).
2. Việc đụng ≥ 2 file → `incremental-implementation`; yêu cầu mơ hồ → `interview-me` / `spec-driven-development`.
3. Sửa đúng phạm vi yêu cầu. Giữ nguyên comment/docstring không liên quan. Không tự ý đổi hành vi nghiệp vụ.
4. **TỰ ĐỘNG LƯU ẢNH DEMO & CẬP NHẬT TÀI LIỆU KHI XONG TÍNH NĂNG (BẮT BUỘC 100%):**
   - Khi hoàn thành bất kỳ chức năng nào (tính năng mới, cập nhật UI/UX, hoặc module hệ thống):
     - **Tự động mở Docker kiểm tra:** Sử dụng MCP `docker` hoặc chạy `powershell -File .\scripts\ensure-docker.ps1` (tự động phát hiện và khởi động Docker Desktop nếu chưa chạy, chờ daemon sẵn sàng và kích hoạt `docker compose up -d` cho MongoDB & Redis).
     - **Tự động mở app & chụp ảnh demo:** Sử dụng MCP `chrome-devtools` / `puppeteer` hoặc chạy `powershell -File .\scripts\capture-screenshot.ps1 -Url http://localhost:5173 -OutputFile docs/assets/screenshots/<ten-tinh-nang>.png` để tự động mở trình duyệt và lưu ảnh demo sắc nét.
     - **Tự động cập nhật `README.md`:** Bổ sung mục tính năng tương ứng, tóm tắt cách dùng và nhúng ảnh demo trực quan vào `README.md`.
     - **Tự động cập nhật thư mục `docs/`:** Tạo hoặc cập nhật file chi tiết trong `docs/features/<ten-tinh-nang>.md` và cập nhật file `docs/demo.md` kèm hình ảnh demo đầy đủ.
   - Tuyệt đối không để tính năng mới xong mà tài liệu và ảnh demo bị bỏ quên.
5. **QUY TẮC ĐA NGÔN NGỮ (BẮT BUỘC 100% CẬP NHẬT ĐỦ CẢ 6 NGÔN NGỮ):**
   - Hệ thống hỗ trợ chính thức 6 ngôn ngữ:
     1. `vi`: **Tiếng Việt** (mặc định)
     2. `en`: **English**
     3. `zh-CN`: **Tiếng Trung Giản thể (Trung Quốc / 简体中文)**
     4. `zh-TW`: **Tiếng Trung Phồn thể (Đài Loan / 繁體中文)**
     5. `ko`: **Tiếng Hàn (한국어)**
     6. `th`: **Tiếng Thái Lan (ไทย)**
   - Khi tạo mới, sửa đổi hoặc thêm bất kỳ nội dung UI, tiêu đề trang, nhãn nút, placeholder, thông báo, modal hay trường dữ liệu nào, AI **BẮT BUỘC PHẢI CẬP NHẬT ĐỒNG THỜI VÀ ĐẦY ĐỦ TRÊN CẢ 6 NGÔN NGỮ** trong các tệp từ điển (`types.ts`, `vi.ts`, `en.ts`, `zh-CN.ts`, `zh-TW.ts`, `ko.ts`, `th.ts`) ở cả `frontend/` và `admin/`.
   - **CẤM TUYỆT ĐỐI** chỉ cập nhật 1 hoặc 2 ngôn ngữ rồi bỏ quên các ngôn ngữ còn lại.
   - **CẤM TUYỆT ĐỐI** hardcode văn bản tĩnh vào trong component JSX/TSX. Mọi văn bản hiển thị phải đi qua `t("namespace.key")` hoặc đối tượng đa ngôn ngữ đầy đủ.
6. **TỰ ĐỘNG KIỂM TRA & PUSH GIT:** Khi xong việc, AI **bắt buộc tự động** chạy toàn bộ Quality Gates (§5), tạo commit chuẩn và chạy `git push origin main`. **Tuyệt đối không dừng lại hỏi người dùng có muốn push hay không.**
7. **QUY TẮC COMMIT GIT (BẮT BUỘC 100% TIẾNG ANH):**
   - Mọi commit message (cả tiêu đề và nội dung) **bắt buộc 100% viết bằng tiếng Anh** (`English only`). **CẤM TUYỆT ĐỐI** viết message commit bằng tiếng Việt hoặc bất kỳ ngôn ngữ nào khác.
   - Tuân theo chuẩn **Conventional Commits**:
     `<type>(<scope>): <short imperative description in English>`
     - Ví dụ chuẩn:
       - `feat(i18n): add full VI/EN bilingual support across all screens`
       - `fix(auth): handle expired refresh token in axios interceptor`
       - `refactor(posts): extract comment item into dedicated component`
       - `docs(readme): document moderation engine and commit guidelines`
       - `test(moderation): add unit tests for isolation forest anomaly detection`
     - Các loại type được phép: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `style`, `ci`.
8. Nếu gặp lỗi khi kiểm tra hoặc push: tự động đọc log, sửa dứt điểm và chạy lại cho đến khi push thành công. Không hạ chuẩn để qua cổng: cấm `@ts-ignore`, `eslint-disable`, xóa/skip test, `any` tràn lan (`constraint-driven-development`).
9. Sau khi đã push thành công lên `origin/main` mới báo cáo kết quả kèm bằng chứng cụ thể.

## 3. Chọn skill theo loại việc

| Việc | Skill phải dùng |
|---|---|
| **Bất kỳ thay đổi UI/UX nào trong `frontend/`** | `chatapp-design-system` → `chatapp-ux-patterns` → `mui-nextjs-conventions` → `frontend-ui-verification` |
| Component, layout, a11y, responsive | `frontend-ui-engineering` (+ `.agents/references/accessibility-checklist.md`) |
| Kiểm thử trên trình duyệt thật | `browser-testing-with-devtools` |
| Thiết kế API / hợp đồng frontend–backend | `api-and-interface-design` |
| Bug, test fail, lỗi build | `debugging-and-error-recovery` |
| Tính năng mới / thay đổi logic | `test-driven-development`, `planning-and-task-breakdown` |
| Auth, input người dùng, cookie, dữ liệu cá nhân | `security-and-hardening` |
| Tối ưu hiệu năng | `performance-optimization` |
| Log / metric / trace | `observability-and-instrumentation` |
| Review diff / PR | `code-review-and-quality` (+ `code-simplification`) |
| Commit, branch, release | `git-workflow-and-versioning` |
| Tài liệu, ADR | `documentation-and-adrs` |
| Dùng API framework/thư viện | `source-driven-development` (kiểm chứng với docs chính thức) |

## 4. Quy tắc UI/UX (tóm tắt — chi tiết ở `chatapp-design-system`)

- **Không hard-code màu hex/rgb** trong component. Dùng token theme (`"text.secondary"`, `"divider"`, `"primary.main"`, `"action.hover"`…) hoặc biến CSS theo scheme `v.neutral[500]` / `v.brand[600]` / `v.tone("16a34a")` / `v.paper` / `v.white` từ `"@/theme/tokens"`. Thiếu token → thêm vào `src/theme/tokens.ts`.
  ESLint **chặn** hex trong toàn bộ `src/**` (trừ `src/theme/**` và `SocialIcons.tsx`), kể cả hex nằm trong chuỗi gradient.
- **Dark mode là bắt buộc**: mọi UI phải đúng ở cả light và dark. Không viết `if (isDark)`; chỉ dùng token tự đổi theo scheme. Khu vực luôn tối (AppBar, hero auth…) gắn `data-light=""`. Không dùng `theme.palette.*`/`alpha()` trong `sx`/`styled` (chỉ ra giá trị scheme sáng) — dùng `var(--mui-palette-…)`. Chi tiết: `chatapp-design-system` → mục Dark mode.
- Font **Inter Variable** (đặt trong theme). Không đặt `fontFamily` riêng; không dùng icon Android / chữ monospace làm logo → dùng `<BrandLogo />`.
- Dùng component dùng chung: `BrandLogo`, `PresenceAvatar`, `EmptyState` (`src/components/common`). Không tự viết lại `StyledBadge`/empty state.
- Phần tử bấm được phải là `Button` / `IconButton` / `ListItemButton` / `ButtonBase` / `Link`. **Cấm** `Box|div|Typography onClick`.
- Nút chỉ có icon **phải có `aria-label`** (tiếng Việt). Trạng thái không chỉ dựa vào màu.
- Cao toàn màn hình dùng `100dvh` + `APP_BAR_HEIGHT`; **không** dùng `100vh`.
- Mobile (< 600px) là **master–detail**; mọi tính năng ở desktop phải truy cập được trên mobile.
- Mọi view dữ liệu phải có: loading (Skeleton) · rỗng (`EmptyState`) · lỗi (kèm thử lại) · đang xử lý.
- Hành động phá hủy dùng `Dialog` xác nhận, **không** `window.confirm`. Nút chưa làm → `disabled` + tooltip "sắp ra mắt", không để nút "chết".
- Ô nhập tin nhắn **không gửi khi đang gõ IME** (`e.nativeEvent.isComposing`) — bắt buộc cho Telex/VNI.
- Modal: giữ `disableScrollLock` (đã đặt mặc định ở theme) và **không** `autoFocus` khi mở (tránh giật khung hình — quy ước trong README).
- Mỗi trang đúng 1 `<h1>`; `<main id="main-content">` do `ClientShell` cung cấp, trang không thêm `<main>` thứ hai.
- Một file component > ~250 dòng thì phải tách (mẫu: `ChatApp.tsx` + `components/chat/app/*`).
- Văn bản UI: tiếng Việt, câu ngắn, dùng `…` thay `...`.

## 5. Định nghĩa "xong" cho frontend

```powershell
cd frontend
npm run typecheck      # bắt buộc, 0 lỗi
npm run lint           # bắt buộc, 0 lỗi (warning cũ ở FloatingChatBox là đã biết)
npm run build          # khi đổi routing/metadata/config hoặc nhiều file
```

- Kiểm tra runtime ở 320 / 390 / 768 / 1024 / 1440 px theo `frontend-ui-verification`.
- Nếu **không** mở được trình duyệt (vd. Playwright không tải được driver), **không được tuyên bố đã kiểm tra giao diện** — nêu rõ phần chưa verify và chỉ dẫn người dùng tự kiểm tra.

## 6. Hiện trạng migrate sang design system

- Đã chuẩn hóa: theme + tokens, `globals.css`, `ChatApp` (+ `components/chat/app/*`), `AppBar` (logo, aria, nav), `ClientShell` (skip link, `<main>`).
- **Màu sắc đã migrate toàn bộ** (Profile, Login, Register, ForgotPassword, FloatingChatBox, PersonCall, Feed, Message, PostComments, AppBar, AuthGuard, not-found…): không còn hex trong `src/**` ngoài `theme/**` và `SocialIcons.tsx`; ESLint chặn tái phát.
- **Dark mode đã có** (`ColorModeToggle` ở AppBar/Drawer, trang Đăng nhập, Đăng ký; mặc định theo hệ điều hành).
- **Còn nợ (không thuộc việc màu sắc — làm dần khi chạm tới)**: `aria-label`/`Box onClick`/state loading-lỗi-rỗng, tách file > 250 dòng ở `Profile.tsx`, `Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `FloatingChatBox.tsx`, `PersonCall.tsx`, `Feed.tsx`, `Message.tsx`, `PostComments.tsx`, popover trong `AppBar.tsx`.
  Quy tắc "để lại sạch hơn lúc tới": khi sửa file nào trong danh sách này, hãy xử lý luôn phần a11y/UX bạn chạm vào.
- Chưa kiểm tra bằng trình duyệt thật ở dark mode (môi trường agent không mở được trình duyệt) — người làm tiếp nên rà bằng mắt các màn hình trong `frontend-ui-verification`.

## 7. Bài viết (posts) — mẫu cần theo

- Backend: `backend/src/modules/posts/` (đăng/xóa mềm/like/bình luận/chia sẻ, riêng tư `public|friends|only_me`, phân trang cursor). Ảnh tải lên lưu ở `backend/uploads/posts/` (đã gitignore), chỉ nhận `/uploads/posts/<uuid>.(jpg|png|webp|gif)`.
- Frontend: dùng chung `components/posts/PostFeed` cho Bảng tin (`Feed.tsx`), tab "Bài viết" ở `/profile` và trang `/profile/[id]`. Danh sách cursor dùng `hooks/usePagedList` + `hooks/useInfiniteSentinel`; xác nhận xóa dùng `components/common/ConfirmDialog`.
- `sx.borderRadius` dạng số được **nhân với 12** (theme.shape.borderRadius): dùng chuỗi px (`"16px"`, `"12px"`, `"8px"`).
- Reset dữ liệu test: dùng `deleteMany`, không drop DB khi app đang chạy (mất index unique → test sai).

## 8. Bảo mật & dữ liệu

- Không commit `.env*` thật; token nằm trong HttpOnly cookie, không đưa vào `localStorage`.
- Không log dữ liệu cá nhân/token. Mọi input người dùng phải được validate (Zod ở FE, class-validator/DTO ở BE) — xem `security-and-hardening`.
