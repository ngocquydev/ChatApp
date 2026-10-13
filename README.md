# 💬 Realtime Chat Application

Hệ thống ứng dụng trò chuyện thời gian thực hiện đại (**Modern Realtime Chat Application**) được xây dựng theo kiến trúc Client - Server với **NestJS** ở phía Backend và **Next.js 16 (App Router + Turbopack + TypeScript)** ở phía Frontend, tích hợp **Material UI (MUI v9)**, **MongoDB**, **Redis**, **Firebase Auth**, **Cloudflare Turnstile** và **JWT HttpOnly Cookies**.

---

## 📑 Mục lục
- [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)
- [🏗️ Kiến trúc hệ thống & Công nghệ](#️-kiến-trúc-hệ-thống--công-nghệ)
- [📁 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [🚀 Hướng dẫn cài đặt & Khởi chạy](#-hướng-dẫn-cài-đặt--khởi-chạy)
  - [1. Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
  - [2. Khởi chạy cơ sở dữ liệu (Docker)](#2-khởi-chạy-cơ-sở-dữ-liệu-docker)
  - [3. Cấu hình & Chạy Backend](#3-cấu-hình--chạy-backend)
  - [4. Cấu hình & Chạy Frontend](#4-cấu-hình--chạy-frontend)
- [🔐 Cơ chế xác thực & Bảo mật (Authentication Flow)](#-cơ-chế-xác-thực--bảo-mật-authentication-flow)
- [📚 Tài liệu API (Swagger)](#-tài-liệu-api-swagger)
- [🧪 Kiểm thử & CI/CD Tự động (Testing & CI Quality Gate)](#-kiểm-thử--cicd-tự-động-testing--ci-quality-gate)
- [📋 Lịch sử cập nhật & Lộ trình phát triển](#-lịch-sử-cập-nhật--lộ-trình-phát-triển)

---

## ✨ Tính năng nổi bật

- **Kiến trúc Next.js 16 App Router & TypeScript**:
  - Frontend chuyển đổi toàn diện sang **Next.js 16 (App Router)** với TypeScript nghiêm ngặt, tách biệt rõ ràng Server & Client Components (`'use client'`).
  - Tích hợp chuẩn **`@mui/material-nextjs`** Emotion SSR caching, loại bỏ hoàn toàn hiện tượng chớp nháy giao diện (FOUC) khi tải trang.
- **Đăng nhập & Đăng ký đa phương thức**:
  - Đăng nhập & Đăng ký truyền thống bằng Email & Mật khẩu (mã hóa mật khẩu bằng `bcrypt` 10 salt rounds).
  - Tách biệt thông báo lỗi đăng nhập chuẩn xác: *"Email không tồn tại trên hệ thống!"* hoặc *"Mật khẩu không chính xác!"*.
  - Đăng nhập mạng xã hội (**Google & Facebook**) qua Firebase Authentication SDK với kiến trúc Custom Hook `useSocialAuth` tái sử dụng.
  - Tự động bắt và xử lý lỗi xung đột email Firebase (`auth/account-exists-with-different-credential` $\rightarrow$ *"Email này đã được đăng ký"*).
  - Đo lường độ mạnh mật khẩu thời gian thực (Password Strength Meter) với 3 mức độ (Yếu / Trung bình / Rất mạnh).
  - Nút ẩn/hiện mật khẩu tiện lợi trên toàn bộ các biểu mẫu.
- **Bảo mật phiên đăng nhập & Chống Bot / DDoS**:
  - Tích hợp **Cloudflare Turnstile** thông minh bảo vệ biểu mẫu đăng nhập khỏi bot tự động và brute-force.
  - Widget Turnstile tối ưu hóa cơ chế callback qua `useRef` và lifecycle cleanup, chống triệt để tình trạng xoay vòng re-render liên tục.
  - Cặp `AccessToken` (1 giờ) và `RefreshToken` (7 ngày) được lưu trữ trong **HttpOnly Cookie** (`sameSite: 'lax'`) chống đánh cắp qua XSS.
  - Tự động làm mới token (`auto-refresh`) qua Axios Response Interceptor khi AccessToken hết hạn mà không làm gián đoạn trải nghiệm người dùng.
  - Thu hồi token và đưa vào **Redis Blacklist** khi người dùng đăng xuất.
  - Phân quyền và bảo vệ route bằng NestJS Guards (`JwtAuthGuard`) và Next.js Route Guards.
- **Tối ưu hóa hiệu năng & Triệt tiêu API Call thừa**:
  - **Quản lý phiên thông minh qua cờ `has_session`**: Người dùng chưa từng đăng nhập khi vào `/login` hoặc `/register` sẽ không bị kích hoạt gọi ngầm `/auth/profile` hoặc `/auth/refresh` gây lỗi 401 trên DevTools Network.
  - **In-flight Promise Deduplication**: `useAuthStore` áp dụng bộ nhớ đệm Promise đang chờ (`checkAuthPromise`) cho hàm `checkAuth()`, triệt tiêu việc gọi đúp API `/auth/profile` khi reload trang (kể cả trong `React.StrictMode`).
  - Tối ưu luồng đăng nhập/đăng ký: trực tiếp tái sử dụng dữ liệu `profile` từ response ban đầu, loại bỏ các lệnh gọi API thừa.
- **Giao diện hiện đại, công thái học & Material UI v9**:
  - Chuẩn hóa chiều cao ô nhập liệu chuẩn công thái học 54px (`height: 54px`), font chữ rõ ràng, bố cục cân đối và dễ tương tác.
  - Chuẩn hóa 100% sang API `slotProps={{ input: { ... } }}` của MUI, loại bỏ hoàn toàn các cảnh báo deprecated `InputProps`.
  - Hỗ trợ ghi nhớ tài khoản đăng nhập (`Remember Me`) qua `localStorage`.
- **Tài liệu API chuẩn hóa**:
  - Swagger UI được cấu hình sẵn tại `/api-docs`.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

| Tầng | Công nghệ / Thư viện chính |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, TypeScript, Material UI (MUI v9) + @mui/material-nextjs, Emotion, Zustand, TanStack React Query v5, React Hook Form, Zod, Axios, Firebase Client SDK, Lucide React, Motion |
| **Backend** | NestJS (Express), TypeScript, Passport.js (JWT Strategy), Mongoose (MongoDB), Redis (IoRedis), Firebase Admin SDK, Cloudflare Turnstile, Class Validator |
| **Cơ sở dữ liệu & Cache** | MongoDB (lưu trữ người dùng, dữ liệu tin nhắn), Redis (Blacklist token, session người dùng, rate limiting) |
| **DevOps & Môi trường** | Docker & Docker Compose, GitHub Actions CI |

---

## 📁 Cấu trúc thư mục

```text
chat/
├── docker-compose.yml           # Khởi chạy container MongoDB & Redis
├── README.md                    # Tài liệu hướng dẫn dự án
│
├── backend/                     # Mã nguồn Backend (NestJS)
│   ├── src/
│   │   ├── common/              # Guards, Interceptors, Filters dùng chung
│   │   ├── modules/
│   │   │   ├── auth/            # Module xác thực (JWT, Firebase, Turnstile, Controller, Service)
│   │   │   │   ├── dto/         # Data Transfer Objects (SignInDto, CreateUserDto)
│   │   │   │   ├── guards/      # JWT Guards
│   │   │   │   ├── strategies/  # Passport JWT Strategy
│   │   │   │   └── types/       # TypeScript interfaces (AuthResult, JwtPayload, RequestWithCookies)
│   │   │   ├── redis/           # Module kết nối Redis, quản lý Blacklist & Session (Fail-safe mode)
│   │   │   └── users/           # Module quản lý thông tin User & Schema
│   │   ├── app.module.ts        # Module gốc của ứng dụng
│   │   └── main.ts              # Entry point cấu hình CORS, Cookie, Swagger
│   ├── test/                    # Kiểm thử E2E (Vitest & Supertest)
│   ├── .env.example             # Biến môi trường mẫu cho Backend
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                    # Mã nguồn Frontend (Next.js 16 + TypeScript)
    ├── src/
    │   ├── app/                 # Next.js App Router (File-system Based Routing)
    │   │   ├── chat/            # Route phòng trò chuyện (/chat)
    │   │   ├── login/           # Route đăng nhập (/login)
    │   │   ├── register/        # Route đăng ký (/register)
    │   │   ├── layout.tsx       # Root Layout (EmotionCacheProvider, ThemeProvider)
    │   │   ├── providers.tsx    # Client Providers (React Query, Auth Init, Theme)
    │   │   ├── page.tsx         # Trang chủ điều hướng
    │   │   └── not-found.tsx    # Giao diện lỗi 404 tùy biến
    │   ├── components/
    │   │   ├── common/          # Component dùng chung (TurnstileWidget, PasswordStrengthMeter)
    │   │   ├── layout/          # AppBar, Header, Drawer menu
    │   │   ├── pages/           # Login, Register, Home, ChatApp views
    │   │   └── section/         # Feed, Message, PersonCall
    │   ├── config/              # Cấu hình Firebase Client SDK
    │   ├── data/                # Dữ liệu tĩnh, nội dung hiển thị
    │   ├── hooks/               # Custom Hooks (useSocialAuth, useAuth, ...)
    │   ├── services/            # Cấu hình Axios Instance, interceptors & skipAuthRefresh
    │   ├── store/               # Zustand Store (useAuthStore với has_session & deduplication)
    │   ├── styles/              # Styles toàn cục (globals.css)
    │   └── theme/               # Cấu hình MUI Theme & tùy biến giao diện Input 54px
    ├── public/                  # Tệp tĩnh (ảnh, favicon, logo)
    ├── next.config.mjs          # Cấu hình Next.js (port 5173, headers, rewrite)
    ├── tsconfig.json            # Cấu hình TypeScript Frontend
    ├── eslint.config.mjs        # Cấu hình ESLint
    ├── .env.example             # Biến môi trường mẫu cho Frontend
    └── package.json
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18 trở lên (Khuyến nghị 20 hoặc 24 LTS)
- **Docker & Docker Compose**: Đã cài đặt và đang chạy
- **Git**

---

### 2. Khởi chạy cơ sở dữ liệu (Docker)
Tại thư mục gốc của dự án (`chat/`), khởi chạy container Redis và MongoDB:

```bash
docker compose up -d
```

Kiểm tra trạng thái container:
```bash
docker compose ps
```
- MongoDB chạy tại cổng: `localhost:27017`
- Redis chạy tại cổng: `localhost:6379`

---

### 3. Cấu hình & Chạy Backend

1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường (`backend/.env`):
   Tạo file `.env` dựa trên `.env.example`:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/chatapp
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   JWT_REFRESH_EXPIRES_IN=7d
   NODE_ENV=development

   # Cấu hình Firebase Admin SDK (cho đăng nhập Google/Facebook)
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Cloudflare Turnstile Secret Key
   SECRET_KEY_CLOUDFLARE=your_cloudflare_turnstile_secret_key
   ```

4. Khởi chạy Backend ở chế độ phát triển:
   ```bash
   npm run start:dev
   ```
   - Server Backend sẽ chạy tại: `http://localhost:3000`
   - Tài liệu Swagger Docs: `http://localhost:3000/api-docs`

---

### 4. Cấu hình & Chạy Frontend

1. Mở cửa sổ terminal mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường (`frontend/.env` hoặc `frontend/.env.local`):
   Tạo file `.env` dựa trên `.env.example`:
   ```env
   PORT_FE=5173
   PORT_BACKEND=3000

   # Backend URL
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

   # Firebase Client Config (cho Google/Facebook login)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Cloudflare Turnstile Site Key
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
   ```

4. Khởi chạy Frontend:
   ```bash
   npm run dev
   ```
   - Server Next.js phát triển sẽ chạy tại: `http://localhost:5173`

5. Build kiểm tra sản phẩm:
   ```bash
   npm run build
   npm run start
   ```

---

## 🔐 Cơ chế xác thực & Bảo mật (Authentication Flow)

```text
[ Người Dùng ]
      │
      ├─► Đăng nhập (Email/Password + Turnstile) ─► POST /auth/login
      │                                                │
      │                                                ├─► 1. Xác thực Turnstile Token
      │                                                ├─► 2. Kiểm tra tài khoản & Mật khẩu (Bcrypt)
      │                                                └─► 3. Tạo AccessToken (1h) & RefreshToken (7d)
      │                                                         │
      │   Nhận HttpOnly Cookies ◄───────────────────────────────┘
      │   (accessToken & refreshToken)
      │   Lưu cờ has_session = 'true' vào localStorage
      │
      ├─► Đăng nhập Mạng xã hội ────────────────► Firebase Client Popup (Google / FB)
      │                                                │
      │                                                ▼ Lấy IdToken
      │                                         POST /auth/firebase-login
      │                                                │
      │                                                ▼ Cấp Cookie Access & Refresh Token
      │
      ├─► Gọi API được bảo vệ (VD: /auth/profile)
      │         │
      │         ├─► [Hợp lệ 200] ──► Truy cập dữ liệu thành công
      │         │
      │         └─► [401 Hết hạn] ──► Axios Response Interceptor bắt lỗi
      │                                       │
      │                                       ▼ (nếu has_session == true)
      │                                 POST /auth/refresh
      │                                       │
      │                                       ▼
      │                                 Cấp lại AccessToken mới (HttpOnly)
      │                                 Tự động retry lại request ban đầu
      │
      └─► Đăng xuất ─────────────────────► POST /auth/logout
                                              │
                                              ▼
                                   Xóa Cookies + Xóa has_session
                                   Đưa AccessToken vào Redis Blacklist (TTL còn lại)
```

---

## 📚 Tài liệu API (Swagger)

Khi Backend đang chạy, truy cập đường dẫn sau để xem và thử nghiệm trực tiếp toàn bộ các API:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Các Endpoint chính:
| Phương thức | Endpoint | Mô tả | Yêu cầu xác thực |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản mới, trả về profile và cấp Token Cookie | ❌ |
| `POST` | `/auth/login` | Đăng nhập tài khoản (xác thực Turnstile) và cấp Token Cookie | ❌ |
| `POST` | `/auth/firebase-login` | Xác thực đăng nhập qua Firebase (Google/Facebook) | ❌ (Gửi Bearer IdToken) |
| `POST` | `/auth/refresh` | Làm mới AccessToken từ RefreshToken trong Cookie | ❌ (Cần Cookie refreshToken) |
| `GET` | `/auth/profile` | Lấy thông tin tài khoản người dùng đang đăng nhập | ✅ (Bearer / Cookie) |
| `POST` | `/auth/logout` | Đăng xuất, xóa Cookie và Blacklist Token trong Redis | ✅ |

---

## 🧪 Kiểm thử & CI/CD Tự động (Testing & CI Quality Gate)

Dự án được bảo vệ bởi hệ thống kiểm soát chất lượng **CI 2 lớp** (Local Git Hooks và GitHub Actions CI) nhằm đảm bảo không thể push mã nguồn lỗi lên nhánh `main`:

### 1. GitHub Actions CI (`.github/workflows/ci.yml`)
Mỗi khi có commit được `push` hoặc tạo `pull_request` vào nhánh `main`, GitHub Actions sẽ tự động kích hoạt 2 pipeline độc lập:
- **Backend CI**: Chạy linter (`oxlint --type-aware`), unit tests (`vitest run`), và build ứng dụng NestJS (`nest build`).
- **Frontend CI**: Chạy linter (`eslint .`), và build ứng dụng Next.js (`next build`).

### 2. Git Pre-Push Hook (Kiểm tra cục bộ trước khi push)
Tệp `.git/hooks/pre-push` được cấu hình để tự động chặn lệnh `git push` nếu phát hiện bất kỳ lỗi cú pháp, linting, unit test hay build nào:
```bash
git push origin main
# Hook sẽ tự động chạy: Backend Lint -> Tests -> Build -> Frontend Lint -> Build
# Nếu 1 trong các bước thất bại, quá trình push sẽ bị HỦY BỎ ngay lập tức!
```

> **Lưu ý**: Thư mục tiện ích nội bộ `scripts/` (chứa các script chạy kiểm tra cục bộ `check.ps1` / `check.sh`) được cấu hình trong `.gitignore` để đảm bảo remote repository luôn gọn gàng và không phụ thuộc file cục bộ.

### 3. Lệnh kiểm thử thủ công từng phần:
```bash
# Backend:
cd backend
npm run lint      # Kiểm tra lỗi TypeScript & Linting với Oxlint
npm run test      # Chạy Unit Tests với Vitest
npm run test:e2e  # Chạy E2E Tests luồng xác thực toàn diện
npm run build     # Build kiểm tra NestJS

# Frontend:
cd frontend
npm run lint      # Kiểm tra ESLint
npm run build     # Build kiểm tra Next.js production bundle
```

---

## 📋 Lịch sử cập nhật & Lộ trình phát triển

### ✅ Các tính năng & Cải tiến đã hoàn thành

1. **Di chuyển toàn diện sang Next.js 16 (App Router) & TypeScript**:
   - [x] Chuyển đổi toàn bộ mã nguồn Frontend từ React 19 (Vite + Javascript) sang **Next.js 16 App Router + Turbopack + TypeScript**.
   - [x] Tích hợp bộ đệm Emotion SSR bằng `@mui/material-nextjs` trong [RootLayout](file:///frontend/src/app/layout.tsx).
   - [x] Tái cấu trúc phân chia routes: `/login`, `/register`, `/chat`, `/` và trang `not-found.tsx` chuẩn Next.js.
   - [x] Giữ nguyên dev port 5173 và backend port 3000 đồng bộ môi trường.

2. **Kiến trúc Xác thực & Bảo mật nâng cao**:
   - [x] Cấu hình thời hạn token chuẩn an toàn: **AccessToken = 1 giờ**, **RefreshToken = 7 ngày**.
   - [x] Tích hợp **Cloudflare Turnstile** chống bot và brute-force phía Backend & Frontend.
   - [x] **Ổn định hóa Cloudflare Turnstile**: Khắc phục lỗi loop re-render widget bằng `callbacksRef` và cleanup lifecycle.
   - [x] Thiết kế lại **Redis Service**: cấu trúc key rõ ràng (`chat:blacklist:`, `chat:session:`, `chat:rate:`, `chat:online:`), hỗ trợ chế độ **Fail-safe** không làm gián đoạn luồng đăng nhập nếu Redis mất kết nối.
   - [x] Loại bỏ toàn bộ kiểu dữ liệu `any` trong Backend, chuẩn hóa định nghĩa TypeScript trong `auth.types.ts` và `users.types.ts`.
   - [x] Tách biệt thông báo lỗi đăng nhập: thông báo cụ thể tài khoản không tồn tại hoặc sai mật khẩu.
   - [x] Xử lý lỗi Firebase `auth/account-exists-with-different-credential` khi tài khoản đã liên kết với nhà cung cấp khác.

3. **Frontend UI & Trải nghiệm người dùng**:
   - [x] **Chuẩn hóa kích thước Input 54px**: Nâng cấp toàn bộ text fields, password fields lên chuẩn 54px thanh thoát, padding cân đối, xóa bỏ cảm giác chật chội.
   - [x] **Triệt tiêu lỗi 401 thừa trên trang Login/Register**: Tích hợp cờ `has_session` trong `localStorage` và `skipAuthRefresh` trên Axios, giữ cho DevTools Network luôn sạch sẽ khi chưa đăng nhập.
   - [x] Hoàn thiện toàn diện trang **Đăng ký (`/register`)**:
     - Form validation qua Zod & React Hook Form (Họ tên, Email, SĐT chuẩn VN, Mật khẩu có độ phức tạp cao, Xác nhận mật khẩu).
     - Thanh đo độ mạnh mật khẩu thời gian thực (Password Strength Meter).
     - Nút ẩn/hiện mật khẩu (Eye / EyeOff).
     - Điều khoản & chính sách checkbox.
     - Hỗ trợ đăng ký nhanh qua Google / Facebook.
   - [x] Tách Custom Hook tái sử dụng **`useSocialAuth`**: gom toàn bộ logic popup Firebase, bắt lỗi đóng popup và điều hướng thành 1 hook duy nhất dùng cho cả Login, Register và các modal trong tương lai.
   - [x] Tối ưu hóa API Call & Deduplication:
     - Thêm cơ chế **In-flight Promise Deduplication** (`checkAuthPromise`) trong `useAuthStore` giúp triệt tiêu việc gọi 2 lần `/auth/profile` khi reload trang.
     - Tận dụng trực tiếp `profile` trả về từ các API login/register để loại bỏ request `/auth/profile` thừa.
   - [x] Chuẩn hóa **Material UI**: thay thế toàn bộ thuộc tính `InputProps` cũ sang `slotProps={{ input: { ... } }}` để loại bỏ hoàn toàn các cảnh báo DOM.

---

### 📌 Lộ trình phát triển tiếp theo (Roadmap)
- [ ] **Tin nhắn thời gian thực (Realtime Messaging)**:
  - [ ] Tích hợp WebSocket Gateway (Socket.IO / NestJS WebSockets) cho phòng chat.
  - [ ] Gửi và nhận tin nhắn 1-1 theo thời gian thực (Direct Messages).
  - [ ] Hiển thị trạng thái đang soạn tin (*typing indicator*) và trạng thái đã xem (*seen status*).
- [ ] **Trạng thái & Quản lý nhóm**:
  - [ ] Theo dõi trạng thái trực tuyến của người dùng (Online / Offline status indicator) qua Redis Pub/Sub.
  - [ ] Tạo nhóm chat, thêm/xóa thành viên và chỉ định quyền nhóm trưởng (Group Chat).
- [ ] **Đa phương tiện & Tiện ích**:
  - [ ] Hỗ trợ gửi hình ảnh, video và tệp đính kèm trong khung chat (Cloudinary / S3 / Firebase Storage).
  - [ ] Thông báo đẩy trên trình duyệt khi có tin nhắn mới (Web Push Notifications).
- [ ] **Tài khoản cá nhân**:
  - [ ] Trang cập nhật thông tin cá nhân & tải ảnh đại diện (`/profile`).
  - [ ] Tính năng Quên mật khẩu & Đặt lại mật khẩu qua Email OTP (`/forgot-password`).

---

## 👥 Đóng góp & Phát triển
Mọi đóng góp, báo lỗi (issue) và yêu cầu tính năng mới (pull request) đều được hoan nghênh để hoàn thiện hệ sinh thái ứng dụng chat ngày một mạnh mẽ hơn!
