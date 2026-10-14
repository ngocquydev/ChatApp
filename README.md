# 💬 Realtime Chat Application

Hệ thống ứng dụng trò chuyện và mạng xã hội thời gian thực hiện đại (**Modern Realtime Chat & Social Platform**) được xây dựng theo kiến trúc Client - Server với **NestJS** ở phía Backend và **Next.js 16 (App Router + Turbopack + TypeScript)** ở phía Frontend, tích hợp **Socket.IO (WebSockets)**, **Material UI (MUI v9)**, **MongoDB**, **Redis**, **Firebase Auth**, **Cloudflare Turnstile** và **JWT HttpOnly Cookies**.

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
- [⚡ Giao thức Thời Gian Thực (WebSocket & Socket.IO Events)](#-giao-thức-thời-gian-thực-websocket--socketio-events)
- [📚 Tài liệu API (Swagger)](#-tài-liệu-api-swagger)
- [🧪 Kiểm thử & CI/CD Tự động (Testing & CI Quality Gate)](#-kiểm-thử--cicd-tự-động-testing--ci-quality-gate)
- [📋 Lịch sử cập nhật & Lộ trình phát triển](#-lịch-sử-cập-nhật--lộ-trình-phát-triển)

---

## ✨ Tính năng nổi bật

### 1. Nhắn tin thời gian thực (Realtime Messaging with Socket.IO)
- **Kiến trúc WebSocket Gateway 2 chiều**: Tích hợp `@nestjs/websockets` và `@nestjs/platform-socket.io` phía Server cùng `socket.io-client` phía Client.
- **Trò chuyện 1-1 tức thì**: Gửi và nhận tin nhắn theo thời gian thực không độ trễ, tự động cuộn đến tin nhắn mới nhất.
- **Chỉ báo đang soạn tin (Typing Indicator)**: Hiển thị trạng thái gõ phím của đối phương trong phòng chat theo thời gian thực (tự động tắt sau 2 giây ngưng gõ).
- **Trạng thái đã xem (Seen Status)**: Cập nhật trạng thái tin nhắn đã đọc ngay khi người nhận mở cuộc hội thoại.
- **Theo dõi trạng thái trực tuyến (Online/Offline Status)**: Quản lý danh sách người dùng đang online trên toàn hệ thống thông qua WebSocket rooms và broadcast sự kiện kết nối/ngắt kết nối.

### 2. Hệ thống Tìm bạn & Quản lý quan hệ bạn bè thật (Friendship System)
- **100% Dữ liệu thực**: Loại bỏ hoàn toàn mock data, đồng bộ quan hệ bạn bè từ MongoDB qua Mongoose Schema (`Friendship`).
- **Tìm kiếm bạn bè toàn hệ thống**: Tìm kiếm theo tên hoặc email với thông tin quan hệ thời gian thực:
  - `none`: Chưa kết bạn (hiển thị nút *Kết bạn*).
  - `pending_sent`: Đã gửi lời mời (hiển thị nút *Đã gửi (Hủy)*).
  - `pending_received`: Nhận được lời mời (hiển thị nút *Chấp nhận* / *Từ chối*).
  - `friends`: Đã là bạn bè (hiển thị nút *Nhắn tin*).
- **Tự động kết bạn 2 chiều (Auto-accept)**: Nếu người dùng B gửi lời mời cho người dùng A khi người dùng A đã gửi lời mời trước đó, hệ thống tự động xác nhận quan hệ bạn bè ngay lập tức.
- **Hủy kết bạn (Unfriend)** và **Hủy lời mời đã gửi (Cancel Request)** tức thì.
- **Realtime Friend Alerts**: Nhận thông báo lời mời kết bạn và bạn bè mới qua Socket.IO mà không cần reload trang.

### 3. Tối ưu hóa UI/UX Không chớp giật (Zero-Flicker Search)
- **Zero-Collapse UI**: Khi kết quả tìm kiếm đang hiển thị, danh sách người dùng không bao giờ bị unmount khi người dùng gõ thêm ký tự. Thanh `LinearProgress` mỏng chạy ở mép trên thông báo trạng thái cập nhật ngầm mà không gây co giãn chiều cao dropdown (`Layout Shift`).
- **Chống Race Condition (`searchSeq`)**: Gán sequence ID cho từng phím gõ, loại bỏ hoàn toàn tình trạng các phản hồi mạng chậm ghi đè lên kết quả mới.
- **Triệt tiêu hiện tượng giật trang khi mở Modal**: Áp dụng `disableScrollLock` trên Material UI Dialogs, giữ nguyên thanh cuộn trang web và loại bỏ `autoFocus` giật khung hình.

### 4. Đăng nhập & Đăng ký bảo mật cao
- **Đa phương thức xác thực**:
  - Đăng ký & Đăng nhập bằng Email/Password (mật khẩu mã hóa `bcrypt` 10 rounds).
  - Đăng nhập mạng xã hội Google & Facebook qua Firebase Authentication SDK và Custom Hook `useSocialAuth`.
  - Phân tách lỗi đăng nhập cụ thể: *"Email không tồn tại"* hoặc *"Mật khẩu không chính xác"*.
- **Chống Bot & Brute-force với Cloudflare Turnstile**:
  - Tích hợp Turnstile widget với cơ chế lifecycle cleanup, chống vòng lặp re-render.
- **Bảo mật phiên bằng HttpOnly Cookie**:
  - Cặp `AccessToken` (1 giờ) và `RefreshToken` (7 ngày) lưu trong HttpOnly Cookie (`sameSite: 'lax'`) chống XSS.
  - Tự động làm mới token ngầm qua Axios Response Interceptors khi token hết hạn.
  - Đăng xuất đưa token vào **Redis Blacklist** (hỗ trợ chế độ Fail-safe).
- **Tối ưu hóa gọi API (Deduplication)**:
  - Quản lý phiên qua cờ `has_session`, triệt tiêu lỗi 401 khi chưa đăng nhập.
  - In-flight Promise Deduplication (`checkAuthPromise`) loại bỏ việc gọi lặp API `/auth/profile` khi reload trang.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

| Tầng | Công nghệ / Thư viện chính |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router + Turbopack), React 19, TypeScript, Material UI (MUI v9) + @mui/material-nextjs, Emotion, Zustand, Socket.IO Client, TanStack React Query v5, React Hook Form, Zod, Axios, Firebase Client SDK, Lucide React, Motion |
| **Backend** | NestJS (Express), TypeScript, WebSockets (@nestjs/websockets, @nestjs/platform-socket.io), Passport.js (JWT Strategy), Mongoose (MongoDB), Redis (IoRedis), Firebase Admin SDK, Cloudflare Turnstile, Class Validator |
| **Cơ sở dữ liệu & Cache** | MongoDB (lưu trữ người dùng, quan hệ bạn bè, cuộc hội thoại và tin nhắn), Redis (Blacklist token, session người dùng, rate limiting) |
| **DevOps & Môi trường** | Docker & Docker Compose, GitHub Actions CI, Git Pre-Push Quality Gate |

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
│   │   ├── errorHandleer/       # Exception Filter toàn cục chuẩn hóa response lỗi
│   │   ├── modules/
│   │   │   ├── auth/            # Xác thực JWT, OTP, Firebase, Turnstile, Cookie
│   │   │   ├── chat/            # WebSocket Gateway, Chat Service, Hội thoại & Tin nhắn
│   │   │   │   ├── dto/         # SendMessageDto
│   │   │   │   ├── schemas/     # ConversationSchema, MessageSchema (Mongoose)
│   │   │   │   ├── chat.controller.ts
│   │   │   │   ├── chat.gateway.ts     # Socket.IO Gateway (message, typing, seen, status)
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── chat.service.spec.ts
│   │   │   ├── friends/         # Hệ thống bạn bè & tìm kiếm quan hệ
│   │   │   │   ├── dto/         # FriendRequestDto, RespondRequestDto
│   │   │   │   ├── schemas/     # FriendshipSchema (Mongoose)
│   │   │   │   ├── friends.controller.ts
│   │   │   │   ├── friends.service.ts
│   │   │   │   └── friends.service.spec.ts
│   │   │   ├── mail/            # Module gửi email thông báo và OTP
│   │   │   ├── redis/           # Module kết nối Redis, Blacklist & Session
│   │   │   └── users/           # Quản lý hồ sơ User & tìm kiếm người dùng
│   │   ├── app.module.ts        # Module gốc của ứng dụng
│   │   └── main.ts              # Entry point cấu hình CORS, Cookie, Swagger, Validation
│   ├── test/                    # Kiểm thử E2E (Vitest & Supertest)
│   ├── .env.example             # Biến môi trường mẫu cho Backend
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                    # Mã nguồn Frontend (Next.js 16 + TypeScript)
    ├── src/
    │   ├── app/                 # Next.js App Router (File-system Based Routing)
    │   │   ├── chat/            # Giao diện ứng dụng nhắn tin (/chat)
    │   │   ├── login/           # Giao diện đăng nhập (/login)
    │   │   ├── register/        # Giao diện đăng ký (/register)
    │   │   ├── profile/         # Quản lý hồ sơ cá nhân (/profile)
    │   │   ├── layout.tsx       # Root Layout (EmotionCacheProvider, ThemeProvider)
    │   │   ├── providers.tsx    # Client Providers (Theme, Auth Init)
    │   │   └── page.tsx         # Trang chủ kết nối bảng tin & danh bạ
    │   ├── components/
    │   │   ├── common/          # Component dùng chung (AuthGuard, Turnstile, PasswordMeter)
    │   │   ├── layout/          # AppBar với Search dropdown mượt mà, Drawer menu
    │   │   ├── pages/           # Login, Register, Home, ChatApp views
    │   │   └── section/         # Feed, Message, PersonCall (Sidebar danh bạ & Tìm bạn)
    │   ├── hooks/               # Custom Hooks (useSocialAuth)
    │   ├── services/            # Axios API client cấu hình interceptor & credentials
    │   ├── store/               # Zustand Stores (useAuthStore, useChatStore, useFriendStore)
    │   └── theme/               # Cấu hình Material UI Theme
    ├── next.config.mjs          # Cấu hình Next.js (port 5173, headers)
    ├── package.json
    └── tsconfig.json
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18 trở lên (Khuyến nghị 20 hoặc 22/24 LTS)
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

   # Firebase Admin SDK (cho đăng nhập Google/Facebook)
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
   - Server Backend: `http://localhost:3000`
   - Tài liệu Swagger API Docs: `http://localhost:3000/api-docs`

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

   # Backend URL (REST & Socket.IO)
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
   - Ứng dụng Frontend phát triển chạy tại: `http://localhost:5173`

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
      ├─► Kết nối WebSocket Realtime ──────────► ws://localhost:3000 (Socket.IO)
      │                                                │
      │                                                ▼ Gửi AccessToken qua handshake auth
      │                                         Tham gia phòng cá nhân `user:{userId}`
      │                                         Broadcast trạng thái Online
      │
      ├─► Gọi API được bảo vệ (VD: /friends, /chat)
      │         │
      │         ├─► [Hợp lệ 200] ──► Truy cập dữ liệu thành công
      │         │
      │         └─► [401 Hết hạn] ──► Axios Response Interceptor bắt lỗi
      │                                       │
      │                                       ▼ (nếu has_session == true)
      │                                 POST /auth/refresh
      │                                       │
      │                                       ▼ Cấp lại AccessToken mới (HttpOnly)
      │                                         Tự động retry lại request ban đầu
      │
      └─► Đăng xuất ─────────────────────► POST /auth/logout
                                              │
                                              ▼
                                   Xóa Cookies + Xóa has_session
                                   Đưa AccessToken vào Redis Blacklist
                                   Ngắt kết nối Socket.IO
```

---

## ⚡ Giao thức Thời Gian Thực (WebSocket & Socket.IO Events)

Gateway WebSocket được cấu hình với namespace mặc định tại `http://localhost:3000`.

### 1. Luồng xác thực kết nối
Client kết nối tới WebSocket kèm token:
```typescript
io('http://localhost:3000', {
  auth: { token: accessToken },
  withCredentials: true,
});
```

### 2. Bảng sự kiện Socket.IO

| Chiều | Tên sự kiện | Dữ liệu truyền (Payload) | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Client ➔ Server** | `message:send` | `{ receiverId, text, conversationId? }` | Gửi tin nhắn trực tiếp đến người dùng |
| **Client ➔ Server** | `typing` | `{ conversationId, isTyping: boolean }` | Báo trạng thái người dùng đang gõ/ngưng gõ |
| **Client ➔ Server** | `message:read` | `{ conversationId }` | Đánh dấu đã xem toàn bộ tin nhắn trong phòng |
| **Server ➔ Client** | `message:new` | `MessageDocument` | Nhận tin nhắn mới tức thì |
| **Server ➔ Client** | `typing` | `{ conversationId, userId, isTyping }` | Cập nhật chỉ báo soạn tin của đối phương |
| **Server ➔ Client** | `message:seen` | `{ conversationId, readerId, readAt }` | Nhận thông báo tin nhắn đã được đọc |
| **Server ➔ Client** | `user:status` | `{ userId, online: boolean }` | Cập nhật trạng thái online/offline của bạn bè |
| **Server ➔ Client** | `friend:request_received` | `{ request }` | Nhận thông báo lời mời kết bạn mới |
| **Server ➔ Client** | `friend:accepted` | `{ friendshipId, user }` | Thông báo lời mời kết bạn đã được chấp thuận |

---

## 📚 Tài liệu API (Swagger)

Khi Backend đang chạy, truy cập đường dẫn sau để xem và thử nghiệm trực tiếp toàn bộ các API:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Các Endpoint chính:

#### 1. Nhóm Xác thực (`/auth`)
| Phương thức | Endpoint | Mô tả | Xác thực |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản mới, trả về profile và cấp Token Cookie | ❌ |
| `POST` | `/auth/login` | Đăng nhập tài khoản (xác thực Turnstile) và cấp Token Cookie | ❌ |
| `POST` | `/auth/firebase-login` | Xác thực đăng nhập qua Firebase (Google/Facebook) | ❌ |
| `POST` | `/auth/refresh` | Làm mới AccessToken từ RefreshToken trong Cookie | ❌ |
| `GET` | `/auth/profile` | Lấy thông tin tài khoản người dùng đang đăng nhập | ✅ |
| `POST` | `/auth/logout` | Đăng xuất, xóa Cookie và Blacklist Token trong Redis | ✅ |

#### 2. Nhóm Bạn bè (`/friends`)
| Phương thức | Endpoint | Mô tả | Xác thực |
| :--- | :--- | :--- | :---: |
| `GET` | `/friends` | Lấy danh sách bạn bè chính thức của người dùng | ✅ |
| `GET` | `/friends/requests` | Lấy danh sách lời mời kết bạn đã nhận & đã gửi | ✅ |
| `GET` | `/friends/search?q=...` | Tìm kiếm người dùng kèm trạng thái quan hệ (`relationStatus`) | ✅ |
| `POST` | `/friends/request` | Gửi lời mời kết bạn (hỗ trợ auto-accept nếu đối phương đã gửi) | ✅ |
| `PATCH` | `/friends/requests/:id/respond` | Chấp nhận (`accept`) hoặc từ chối (`reject`) lời mời kết bạn | ✅ |
| `DELETE` | `/friends/requests/:id` | Hủy lời mời kết bạn đã gửi | ✅ |
| `DELETE` | `/friends/:friendId` | Hủy kết bạn (Unfriend) | ✅ |

#### 3. Nhóm Tin nhắn & Hội thoại (`/chat`)
| Phương thức | Endpoint | Mô tả | Xác thực |
| :--- | :--- | :--- | :---: |
| `GET` | `/chat/conversations` | Lấy danh sách các cuộc hội thoại gần nhất | ✅ |
| `POST` | `/chat/conversations` | Tạo hoặc lấy cuộc hội thoại 1-1 với người dùng mục tiêu | ✅ |
| `GET` | `/chat/conversations/:id/messages` | Lấy lịch sử tin nhắn trong cuộc hội thoại (phân trang) | ✅ |
| `POST` | `/chat/messages` | Gửi tin nhắn qua REST API (fallback khi socket gián đoạn) | ✅ |
| `PATCH` | `/chat/conversations/:id/read` | Đánh dấu các tin nhắn trong hội thoại là đã xem | ✅ |

---

## 🧪 Kiểm thử & CI/CD Tự động (Testing & CI Quality Gate)

Dự án được bảo vệ bởi hệ thống kiểm soát chất lượng **CI 2 lớp** (Local Git Hooks và GitHub Actions CI) nhằm đảm bảo không thể push mã nguồn lỗi lên nhánh `main`:

### 1. GitHub Actions CI (`.github/workflows/ci.yml`)
Mỗi khi có commit được `push` hoặc tạo `pull_request` vào nhánh `main`, GitHub Actions sẽ tự động kích hoạt 2 pipeline độc lập:
- **Backend CI**: Chạy linter (`oxlint --type-aware`), unit tests (`vitest run`), và build ứng dụng NestJS (`nest build`).
- **Frontend CI**: Chạy linter (`eslint .`), và build ứng dụng Next.js (`next build`).

### 2. Git Pre-Push Hook (Kiểm tra cục bộ trước khi push)
Tệp `.git/hooks/pre-push` tự động chạy 4 cổng kiểm soát chất lượng nghiêm ngặt trước mỗi lần `git push`:
1. `➡️ [1/4] Backend Lint & Types` (`oxlint --type-aware`)
2. `➡️ [2/4] Backend Unit Tests` (`vitest run` - 38/38 tests passed)
3. `➡️ [3/4] Backend Build` (`nest build`)
4. `➡️ [4/4] Frontend Lint & Build` (`eslint .` & `next build` với Turbopack)

### 3. Lệnh kiểm thử thủ công từng phần:
```bash
# Backend:
cd backend
npm run lint      # Kiểm tra lỗi TypeScript & Linting với Oxlint
npm run test      # Chạy 38 Unit Tests với Vitest
npm run test:e2e  # Chạy E2E Tests
npm run build     # Build kiểm tra NestJS

# Frontend:
cd frontend
npm run lint      # Kiểm tra ESLint
npm run build     # Build kiểm tra Next.js Turbopack production bundle
```

---

## 📋 Lịch sử cập nhật & Lộ trình phát triển

### ✅ Các tính năng & Cải tiến đã hoàn thành

1. **Tin nhắn thời gian thực (Realtime Messaging)**:
   - [x] Tích hợp WebSocket Gateway (`@nestjs/websockets`, `@nestjs/platform-socket.io`) cho phòng chat.
   - [x] Gửi và nhận tin nhắn 1-1 theo thời gian thực (Direct Messages).
   - [x] Chỉ báo đang soạn tin (*typing indicator*) và trạng thái đã xem (*seen status*).
   - [x] Theo dõi trạng thái trực tuyến của người dùng (Online / Offline status indicator).

2. **Hệ thống Bạn bè & Tìm kiếm Realtime (Friendship System)**:
   - [x] Thiết kế Mongoose Schema `Friendship` với unique compound index chống trùng lặp.
   - [x] Loại bỏ hoàn toàn mock data, kết nối danh bạ và bạn bè thật 100%.
   - [x] Tìm kiếm người dùng toàn hệ thống kèm trạng thái quan hệ: `none`, `pending_sent`, `pending_received`, `friends`.
   - [x] Luồng tự động kết bạn (Auto-accept) khi 2 người cùng gửi lời mời cho nhau.
   - [x] Gửi lời mời, Hủy lời mời đã gửi, Chấp nhận, Từ chối, và Hủy kết bạn (Unfriend).
   - [x] Đồng bộ thông báo bạn bè mới qua Socket.IO.

3. **Tối ưu hóa UI/UX & Triệt tiêu Chớp giật (Zero-Flicker Search)**:
   - [x] **Zero-Collapse List**: Giữ nguyên danh sách kết quả trên DOM khi gõ tiếp, tích hợp `LinearProgress` chạy ngầm.
   - [x] **Chống Race Condition**: Bổ sung `searchSeq` trong `useFriendStore`, loại bỏ xung đột response mạng bất đồng bộ.
   - [x] Khắc phục hiện tượng giật trang khi mở modal (`disableScrollLock`, loại bỏ autoFocus giật cuộn).
   - [x] Đồng bộ giao diện tìm kiếm mượt mà trên Header (`AppBar.tsx`), Sidebar (`PersonCall.tsx`) và Modal Chat (`ChatApp.tsx`).

4. **Di chuyển toàn diện sang Next.js 16 (App Router) & TypeScript**:
   - [x] Chuyển đổi toàn bộ mã nguồn Frontend sang Next.js 16 App Router + Turbopack + TypeScript.
   - [x] Tích hợp bộ đệm Emotion SSR bằng `@mui/material-nextjs` trong RootLayout.
   - [x] Tái cấu trúc phân chia routes: `/login`, `/register`, `/chat`, `/` và `not-found.tsx`.

5. **Kiến trúc Xác thực & Bảo mật nâng cao**:
   - [x] Cặp token chuẩn an toàn: AccessToken = 1 giờ, RefreshToken = 7 ngày trong HttpOnly Cookie.
   - [x] Tích hợp Cloudflare Turnstile chống bot và brute-force.
   - [x] Redis Token Blacklist với chế độ Fail-safe.
   - [x] Tách biệt thông báo lỗi đăng nhập chuẩn xác.
   - [x] Xử lý lỗi Firebase `auth/account-exists-with-different-credential`.
   - [x] Chuẩn hóa kích thước ô nhập liệu công thái học 54px trên toàn bộ form.
   - [x] In-flight Promise Deduplication triệt tiêu việc gọi lặp API `/auth/profile`.

---

### 📌 Lộ trình phát triển tiếp theo (Roadmap)
- [ ] **Nhóm chat (Group Chat)**:
  - [ ] Tạo nhóm chat, thêm/xóa thành viên và chỉ định quyền nhóm trưởng / phó nhóm.
  - [ ] Đổi tên nhóm và ảnh đại diện nhóm.
- [ ] **Đa phương tiện & Tệp đính kèm**:
  - [ ] Hỗ trợ gửi hình ảnh, video, âm thanh và tệp đính kèm trong tin nhắn.
  - [ ] Tích hợp dịch vụ lưu trữ đám mây (Cloudinary / AWS S3 / Firebase Storage).
- [ ] **Thông báo đẩy (Push Notifications)**:
  - [ ] Web Push Notifications khi người dùng không mở tab trình duyệt.
- [ ] **Cập nhật Hồ sơ cá nhân**:
  - [ ] Trang cập nhật thông tin cá nhân & đổi ảnh đại diện (`/profile`).
  - [ ] Tính năng Quên mật khẩu & Đặt lại mật khẩu qua Email OTP (`/forgot-password`).

---

## 👥 Đóng góp & Phát triển
Mọi đóng góp, báo lỗi (issue) và yêu cầu tính năng mới (pull request) đều được hoan nghênh để hoàn thiện hệ sinh thái ứng dụng chat ngày một mạnh mẽ hơn!
