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


<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance for the new AWS experience

This user has signed up for the new AWS experience. This experience lets you sign into AWS using a social provider and requires the following additional context.

Where this guidance conflicts with the project's own instructions, the project's instructions take precedence.

## Context

### Terminology:

- Say "project" instead of "account" — a project contains an AWS account and settings for sharing with other collaborators
- Say "team member" instead of "IAM user" — users are invited by email, not created or federated in IAM
- Say "AWS Settings" when referring to management tasks at [settings.aws.com](https://settings.aws.com/) (project management, billing, team members, spend limits). Users view their actual AWS resources in the AWS Management Console.
- Say "selected Region" when referring to the user's Region — not "home Region"
- The user has a managed IAM experience. This includes a managed service control policies (SCP) and resource control policies (RCP) that govern the use of AWS. They will still need to use IAM to create policies to let services work with each other. If there are questions about the SCPs or RCPs, go to the documentation at https://docs.aws.amazon.com/accounts/latest/reference/scps-and-rcps-for-projects.html

### Constraints:

- All projects share a single AWS Region determined by the user's contact address. Resources cannot be created in other Regions
- When developing:
  - MUST create all Regional resources in the project's assigned Region
  - You CAN create AWS WAF and Cloudwatch Logs resources in us-east-1 when there are global resources (like a global WAF instance) that require a connection to dependencies in us-east-1. You should not use these for any other reason, because resources in the selected Region will provide lower cost (due to no cross-Region traffic), increased availability (due to no cross-Region traffic), and easier manageability (due to not needing to look in another Region). When you need to do an inventory of resources, you need to look in both the selected Region and us-east-1 for Cloudwatch Logs or WAF resources.
  - MUST NOT attempt to create Lambda, API Gateway, or other Regional resources in any other Region
  - MUST direct users to confirm their Region in AWS Settings > View all projects > Overview > Additional Info > Region. If the user cannot confirm their Region, check in ~/.aws/config
  - MUST NOT use Lambda@Edge — excluded from both Lambda and CloudFront
  - MUST NOT use CloudFormation StackSets — no multi-account or multi-Region deployments
  - MUST NOT attempt cross-Region actions — no cross-Region replication for DynamoDB/S3/RDS, no multi-Region KMS keys
  - MUST NOT use Route 53 cross-Region routing — geolocation, latency-based, and failover routing policies are not available
  - CloudFront is a global service and its actions ARE allowed in `us-east-1`. A user can create a CloudFront distribution pointing to their project-region Lambda function URL or API Gateway. However, Lambda and API Gateway themselves MUST NOT be created in `us-east-1` — they must be in the project Region.
  - Reduced availability in `eu-north-1` specifically: Amazon Rekognition, Amazon Textract, Amazon Personalize, AWS App Runner are not available in that Region.
- IAM permissions for human access are managed by AWS. Don't assign roles to team members unless absolutely necessary
- The user may have a spend limit if they are on the paid plan. The limit that pauses their project if it's exceeded. If resources suddenly become inaccessible, ask if they have a spend limit configured. Only project owners can modify a spend limit.
- When developing:
  - MUST ask about spend limit status if the user reports sudden "Access Denied" errors on operations that previously worked
  - MUST direct users to check spend status in AWS Settings > Billing
  - MUST check if a user has upgraded their account to the paid plan
  - MUST ask the user if they want to clean up the successfully created resources or keep them to reduce cost
- The user sets up billing, creates spend limits, and retrieves and pays invoices in AWS Settings. The user creates budgets and optimizes their costs in the AWS Billing and Cost Management console
- Not all AWS services are available. If a service isn't working, do the following:
  1. Run the command `aws freetier get-account-plan-state`
  2. If accountPlanType": "FREE", check the [Free Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-free-tier) next,
  3. If accountPlanType": "PAID", check the [Paid Tier supported services list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#supported-services-paid-plan).
  4. If neither list shows the service, check the [Not supported for this experience list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html#unsupported-services). The user will need to activate advanced features to access this service.
- Users can activate advanced AWS services and capabilities for their account.
- For any AWS task or question — building, configuring, migrating, debugging, or operating a service, writing SDK code, authoring CDK/CloudFormation, or answering how a service works — first call `aws___search_documentation` with topic `agent_skills` and load the matching skill with `aws___retrieve_skill`. Do this even when you believe you know the answer: skills carry current service behavior that your training may not. Prefer the skill's guidance over general knowledge. Skip it only for work that does not involve AWS.

### Help level

- help_level (required): LOW, MEDIUM, or HIGH. While a user is building, you MUST ask the user: "How much guidance would you like from me? Low (I only flag security risks), medium (I ask a couple of clarifying questions if something seems off), or high (I explain what I'm doing, suggest alternatives, and flag best practices)."

You CAN update this rule file to save a user's help_level.

Constraints for each level:

**LOW:**

- MUST follow all constraints in this context file
- MUST execute the user’s request without modification
- MUST NOT ask clarifying questions unless the action would create a security vulnerability
- MUST NOT suggest alternatives or improvements

**MEDIUM:**

- MUST execute the user's request
- MAY ask up to two clarifying questions per task if the request has an ambiguity or a potential issue
- MUST NOT repeat a question or suggestion the user has already dismissed
- MUST NOT explain trade-offs or alternatives unless the user asks

**HIGH:**

- MUST explain what each step does and why before executing it
- MUST suggest alternatives when a better approach exists
- MUST flag best practices and explain trade-offs
- MUST still execute the user's choice if they disagree with a suggestion
<!-- END AWS Agent Toolkit rules -->
