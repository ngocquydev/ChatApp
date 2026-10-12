# 💬 Realtime Chat Application

Hệ thống ứng dụng trò chuyện thời gian thực hiện đại (Modern Realtime Chat Application) được xây dựng theo kiến trúc Client - Server với **NestJS** ở phía Backend và **React 19 (Vite)** ở phía Frontend, tích hợp **MongoDB**, **Redis**, **Firebase Auth** và **JWT HttpOnly Cookies**.

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
- [🔐 Cơ chế xác thực (Authentication Flow)](#-cơ-chế-xác-thực-authentication-flow)
- [📚 Tài liệu API (Swagger)](#-tài-liệu-api-swagger)
- [🧪 Kiểm thử (Testing)](#-kiểm-thử-testing)
- [📋 Checklist các thay đổi & Lộ trình](#-checklist-các-thay-đổi--lộ-trình)

---

## ✨ Tính năng nổi bật

- **Đăng nhập & Đăng ký đa phương thức**:
  - Đăng nhập truyền thống bằng Email & Mật khẩu (mã hóa mật khẩu bằng `bcrypt`).
  - Đăng nhập mạng xã hội (Google & Facebook) thông qua Firebase Authentication.
- **Bảo mật phiên đăng nhập & Chống Bot / DDoS**:
  - Tích hợp **Cloudflare Turnstile** thông minh bảo vệ biểu mẫu đăng nhập khỏi bot và tấn công brute-force.
  - Cặp `AccessToken` và `RefreshToken` được lưu trong **HttpOnly Cookie** chống tấn công XSS.
  - Tự động làm mới token (`auto-refresh`) qua Axios Response Interceptor khi AccessToken hết hạn.
  - Thu hồi token và đưa vào **Redis Blacklist** khi người dùng đăng xuất.
  - Phân quyền và bảo vệ route bằng NestJS Guards (`JwtAuthGuard`) và React `ProtectedRoute`.
- **Giao diện hiện đại & Mượt mà**:
  - Xây dựng bằng React 19, Material UI (MUI), Lucide Icons và Motion Animations.
  - Hiệu ứng gõ chữ mượt mà (Smooth Typewriter), thông báo lỗi rõ ràng, trạng thái loading trực quan.
  - Hỗ trợ ghi nhớ tài khoản đăng nhập (`Remember Me`).
- **Tài liệu API chuẩn hóa**:
  - Swagger UI được cấu hình sẵn tại `/api-docs`.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

| Tầng | Công nghệ / Thư viện chính |
| :--- | :--- |
| **Frontend** | React 19, Vite, Material UI (MUI), Zustand, TanStack React Query, React Hook Form, Zod, Axios, Firebase SDK, Lucide React, Motion |
| **Backend** | NestJS (Express), TypeScript, Passport.js (JWT Strategy), Mongoose, Redis (IoRedis / Cache Manager), Firebase Admin SDK, Class Validator |
| **Cơ sở dữ liệu & Cache** | MongoDB (lưu trữ người dùng, dữ liệu tin nhắn), Redis (cache, blacklist token, session) |
| **DevOps & Môi trường** | Docker & Docker Compose |

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
│   │   │   ├── auth/            # Module xác thực (JWT, Firebase, Controller, Service)
│   │   │   │   ├── dto/         # Data Transfer Objects (Login, Register)
│   │   │   │   ├── guards/      # JWT Guards
│   │   │   │   └── strategies/  # Passport JWT Strategy
│   │   │   ├── redis/           # Module kết nối và thao tác Redis
│   │   │   └── users/           # Module quản lý thông tin User & Schema
│   │   ├── app.module.ts        # Module gốc của ứng dụng
│   │   └── main.ts              # Entry point cấu hình CORS, Cookie, Swagger
│   ├── test/                    # Kiểm thử E2E (Vitest & Supertest)
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                    # Mã nguồn Frontend (React + Vite)
    ├── src/
    │   ├── components/
    │   │   ├── layout/          # AppBar, Header, Drawer menu
    │   │   ├── pages/           # Login, Home, ChatApp
    │   │   └── section/         # Feed, Message, PersonCall
    │   ├── config/              # Cấu hình Firebase Client SDK
    │   ├── data/                # Dữ liệu tĩnh, nội dung hiển thị
    │   ├── routes/              # Cấu hình React Router & ProtectedRoute
    │   ├── services/            # Cấu hình Axios Instance & Interceptors
    │   ├── store/               # Zustand Store (useAuthStore)
    │   ├── App.jsx              # Khởi tạo React Query & Router Provider
    │   └── main.jsx             # Entry point Frontend
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18 trở lên (Khuyến nghị 20+)
- **Docker & Docker Compose**: Đã cài đặt và đang chạy
- **Git**

---

### 2. Khởi chạy cơ sở dữ liệu (Docker)
Tại thư mục gốc của dự án (`d:\Web\chat`), khởi chạy container Redis và MongoDB:

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
   Tạo file `.env` với nội dung mẫu:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/chatapp
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
   JWT_REFRESH_EXPIRES_IN=7d
   NODE_ENV=development

   # Cấu hình Firebase Admin SDK (cho đăng nhập Google/Facebook)
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
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

3. Cấu hình biến môi trường (`frontend/.env`):
   ```env
   VITE_BACKEND_URL=http://localhost:3000
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. Khởi chạy Frontend:
   ```bash
   npm run dev
   ```
   - Mở trình duyệt tại: `http://localhost:5173`

---

## 🔐 Cơ chế xác thực (Authentication Flow)

```text
[ Người Dùng ]
      │
      ├─► Đăng nhập (Email/Password) ────► POST /auth/login
      │                                       │
      │                                       ▼
      │                             Xác thực mật khẩu (Bcrypt)
      │                                       │
      │                                       ▼
      │                             Tạo Access & Refresh Token
      │                                       │
      │   Nhận HttpOnly Cookies ◄─────────────┘
      │   (accessToken & refreshToken)
      │
      ├─► Gọi API được bảo vệ (VD: /auth/profile)
      │         │
      │         ├─► [Hợp lệ 200] ──► Truy cập dữ liệu
      │         │
      │         └─► [401 Hết hạn] ──► Axios Interceptor bắt lỗi
      │                                       │
      │                                       ▼
      │                                 POST /auth/refresh
      │                                       │
      │                                       ▼
      │                                 Cấp lại AccessToken mới
      │                                 Thử lại request ban đầu tự động
      │
      └─► Đăng xuất ─────────────────────► POST /auth/logout
                                              │
                                              ▼
                                   Xóa Cookies + Đưa AccessToken
                                   vào Redis Blacklist
```

---

## 📚 Tài liệu API (Swagger)

Khi Backend đang chạy, truy cập đường dẫn sau để xem và thử nghiệm trực tiếp toàn bộ các API:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

### Các Endpoint chính:
| Phương thức | Endpoint | Mô tả | Yêu cầu xác thực |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Đăng ký tài khoản mới và cấp Token Cookie | ❌ |
| `POST` | `/auth/login` | Đăng nhập tài khoản và cấp Token Cookie | ❌ |
| `POST` | `/auth/firebase-login` | Xác thực đăng nhập qua Firebase (Google/Facebook) | ❌ (Gửi Bearer IdToken) |
| `POST` | `/auth/refresh` | Làm mới AccessToken từ RefreshToken trong Cookie | ❌ (Cần Cookie refreshToken) |
| `GET` | `/auth/profile` | Lấy thông tin tài khoản người dùng đang đăng nhập | ✅ (Bearer / Cookie) |
| `POST` | `/auth/logout` | Đăng xuất, xóa Cookie và Blacklist Token trong Redis | ✅ |

---

## 🧪 Kiểm thử (Testing)

### Backend E2E Tests:
Chạy bộ kiểm thử luồng xác thực toàn diện (Đăng ký -> Đăng nhập -> Gọi API bảo vệ -> Đăng xuất -> Xác thực blacklist):
```bash
cd backend
npm run test:e2e
```

### Frontend Build Kiểm tra:
```bash
cd frontend
npm run build
```

---

## 📋 Checklist các thay đổi & Lộ trình

### 📂 Checklist các file đã thay đổi (Modified Files)

#### 🔹 Phía Frontend:
- [x] [`frontend/src/store/useAuthStore.js`](frontend/src/store/useAuthStore.js): Bổ sung `checkAuth()`, quản lý các trạng thái `isCheckingAuth`, `isLoggingIn`, chuẩn hóa dữ liệu trả về cho `loginMe`, `loginfirebase` và `logout`.
- [x] [`frontend/src/services/api.js`](frontend/src/services/api.js): Cấu hình Axios với `withCredentials: true`, triển khai Interceptor tự động bắt lỗi `401 Unauthorized` để gọi `/auth/refresh` và retry request với hàng đợi `failedQueue`.
- [x] [`frontend/src/routes/ProtectedRoute.jsx`](frontend/src/routes/ProtectedRoute.jsx): Thêm trạng thái chờ `isCheckingAuth` với màn hình loading đẹp mắt, ngăn ngừa việc văng ra `/login` khi F5 hoặc mở tab mới.
- [x] [`frontend/src/App.jsx`](frontend/src/App.jsx): Gọi `checkAuth()` trong `useEffect` khi `Layout` mount để tự động khôi phục phiên đăng nhập trên toàn ứng dụng.
- [x] [`frontend/src/components/pages/Login.jsx`](frontend/src/components/pages/Login.jsx): Xóa import lỗi `da from "zod/v4/locales"`, thêm tự động redirect về `/` nếu đã login, thêm tính năng "Ghi nhớ đăng nhập" qua `localStorage`, loading indicator trên các nút và chuẩn hóa hiển thị lỗi.
- [x] [`frontend/vite.config.js`](frontend/vite.config.js): Cập nhật alias `@` sang chuẩn ESM `fileURLToPath` để loại bỏ hoàn toàn cảnh báo của Vite.

#### 🔹 Phía Backend & DevOps:
- [x] [`backend/src/modules/auth/auth.controller.ts`](backend/src/modules/auth/auth.controller.ts): Bổ sung tạo Access & Refresh Token Cookie cho `POST /auth/firebase-login`, loại bỏ decorator `@Post('refresh')` bị khai báo trùng lặp.
- [x] [`backend/src/modules/auth/auth.service.ts`](backend/src/modules/auth/auth.service.ts): Cập nhật cấu hình Cookie sang `sameSite: 'lax'` để đảm bảo truyền nhận cookie giữa port `5173` và `3000`.
- [x] [`docker-compose.yml`](docker-compose.yml): Xóa thuộc tính `version: "3.8"` lỗi thời để loại bỏ cảnh báo khi chạy `docker compose up`.
- [x] [`README.md`](README.md): Soạn thảo tài liệu toàn diện hướng dẫn cài đặt, kiến trúc, sơ đồ luồng xác thực, Swagger API và checklist phát triển.

---

### ✅ Chi tiết các thay đổi về mặt tính năng (Feature Changelog)
- [x] **Xác thực phiên làm việc (Session Rehydration)**:
  - Bổ sung `checkAuth()` trong `useAuthStore` để khôi phục phiên từ Cookie HttpOnly khi người dùng F5 hoặc mở tab mới.
  - Thêm cờ `isCheckingAuth` để ngăn `ProtectedRoute` chuyển hướng vội về `/login` trước khi kiểm tra xong token.
  - Tự động điều hướng người dùng đã đăng nhập từ `/login` về trang chủ `/`.
- [x] **Cơ chế tự động làm mới Token (Auto Refresh Token)**:
  - Kích hoạt Axios Response Interceptor đón bắt mã lỗi `401 Unauthorized`.
  - Tự động gọi `POST /auth/refresh` bằng RefreshToken lưu trong Cookie và gửi lại request ban đầu.
  - Tích hợp hàng đợi `failedQueue` để xử lý mượt mà khi nhiều API đồng thời gặp lỗi 401.
- [x] **Tối ưu trải nghiệm Form đăng nhập (Login UX/UI)**:
  - Hiển thị spinner và trạng thái `Đang đăng nhập...` trên nút bấm khi gửi request.
  - Vô hiệu hóa nút Submit và các nút mạng xã hội trong lúc đang xử lý để tránh spam request.
  - Thêm tính năng **Ghi nhớ đăng nhập (Remember Me)** lưu email vào `localStorage`.
  - Chuẩn hóa hiển thị thông báo lỗi từ ValidationPipe của NestJS (xử lý cả dạng mảng chuỗi).
- [x] **Đăng nhập mạng xã hội (Social Auth)**:
  - Tích hợp Firebase Popup Auth cho cả **Google** và **Facebook**.
  - Bổ sung trạng thái loading riêng (`isGoogleLoading`, `isFacebookLoading`) và xử lý êm đẹp sự kiện tắt popup (`auth/popup-closed-by-user`).
- [x] **Đồng bộ Backend & Bảo mật**:
  - Endpoint `POST /auth/firebase-login` được bổ sung việc tạo và gán cặp HttpOnly Cookie (`accessToken`, `refreshToken`) giống như đăng nhập thường.
  - Cập nhật cấu hình Cookie sang `sameSite: 'lax'` giúp tương thích chia sẻ cookie giữa hai domain khác port (`localhost:5173` và `localhost:3000`).
  - Xóa decorator `@Post('refresh')` bị khai báo trùng lặp trong `auth.controller.ts`.
- [x] **Dọn dẹp môi trường & Cấu hình**:
  - Xóa import thừa `da from "zod/v4/locales"` gây lỗi bundle.
  - Chuẩn hóa cấu hình Path Alias `@` trong `vite.config.js` sang chuẩn ESM `fileURLToPath`.
  - Xóa thuộc tính `version: "3.8"` lỗi thời trong `docker-compose.yml` để loại bỏ cảnh báo Docker.

---

### 📌 Lộ trình phát triển tiếp theo (Roadmap Checklist)
- [ ] **Xác thực & Tài khoản**:
  - [ ] Hoàn thiện giao diện & tính năng Đăng ký tài khoản mới (`/register`).
  - [ ] Tính năng Quên mật khẩu & Đặt lại mật khẩu qua Email OTP (`/forgot-password`).
  - [ ] Trang cập nhật thông tin cá nhân & tải ảnh đại diện (`/profile`).
- [ ] **Tin nhắn thời gian thực (Realtime Messaging)**:
  - [ ] Tích hợp WebSocket Gateway (Socket.IO / NestJS WebSockets) cho phòng chat.
  - [ ] Gửi và nhận tin nhắn 1-1 theo thời gian thực (Direct Messages).
  - [ ] Hiển thị trạng thái đang soạn tin (*typing indicator*) và trạng thái đã xem (*seen status*).
- [ ] **Trạng thái & Quản lý nhóm**:
  - [ ] Theo dõi trạng thái trực tuyến của người dùng (Online / Offline status indicator) qua Redis Pub/Sub.
  - [ ] Tạo nhóm chat, thêm/xóa thành viên và chỉ định quyền nhóm trưởng (Group Chat).
- [ ] **Đa phương tiện & Tiện ích**:
  - [ ] Hỗ trợ gửi hình ảnh, video và tệp đính kèm trong khung chat.
  - [ ] Thông báo đẩy trên trình duyệt khi có tin nhắn mới (Web Push Notifications).

---

## 👥 Đóng góp & Phát triển
Mọi đóng góp, báo lỗi (issue) và yêu cầu tính năng mới (pull request) đều được hoan nghênh để hoàn thiện hệ sinh thái ứng dụng chat ngày một mạnh mẽ hơn!
