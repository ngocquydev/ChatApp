# 💬 Realtime Chat Application

Hệ thống ứng dụng trò chuyện thời gian thực hiện đại (**Modern Realtime Chat Application**) được xây dựng theo kiến trúc Client - Server với **NestJS** ở phía Backend và **React 19 (Vite)** ở phía Frontend, tích hợp **MongoDB**, **Redis**, **Firebase Auth**, **Cloudflare Turnstile** và **JWT HttpOnly Cookies**.

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
- [🧪 Kiểm thử (Testing)](#-kiểm-thử-testing)
- [📋 Lịch sử cập nhật & Lộ trình phát triển](#-lịch-sử-cập-nhật--lộ-trình-phát-triển)

---

## ✨ Tính năng nổi bật

- **Đăng nhập & Đăng ký đa phương thức**:
  - Đăng nhập & Đăng ký truyền thống bằng Email & Mật khẩu (mã hóa mật khẩu bằng `bcrypt` 10 salt rounds).
  - Tách biệt thông báo lỗi đăng nhập chuẩn xác: *"Email không tồn tại trên hệ thống!"* hoặc *"Mật khẩu không chính xác!"*.
  - Đăng nhập mạng xã hội (**Google & Facebook**) qua Firebase Authentication SDK với kiến trúc Custom Hook `useSocialAuth` dùng chung.
  - Tự động bắt và xử lý lỗi xung đột email Firebase (`auth/account-exists-with-different-credential` $\rightarrow$ *"Email này đã được đăng ký"*).
  - Đo lường độ mạnh mật khẩu thời gian thực (Password Strength Meter) với 3 mức độ (Yếu / Trung bình / Rất mạnh).
  - Nút ẩn/hiện mật khẩu tiện lợi trên toàn bộ các biểu mẫu.
- **Bảo mật phiên đăng nhập & Chống Bot / DDoS**:
  - Tích hợp **Cloudflare Turnstile** thông minh bảo vệ biểu mẫu đăng nhập khỏi bot tự động và tấn công brute-force.
  - Cặp `AccessToken` (1 giờ) và `RefreshToken` (7 ngày) được lưu trữ trong **HttpOnly Cookie** (`sameSite: 'lax'`) chống đánh cắp qua XSS.
  - Tự động làm mới token (`auto-refresh`) qua Axios Response Interceptor khi AccessToken hết hạn mà không làm gián đoạn trải nghiệm người dùng.
  - Thu hồi token và đưa vào **Redis Blacklist** khi người dùng đăng xuất.
  - Phân quyền và bảo vệ route bằng NestJS Guards (`JwtAuthGuard`) và React Router (`ProtectedRoute`).
- **Tối ưu hóa hiệu năng & Chống gọi trùng lặp (Deduplication)**:
  - Áp dụng cơ chế **In-flight Promise Deduplication** trong `useAuthStore` cho hàm `checkAuth()`: triệt tiêu việc gọi đúp API `/auth/profile` khi reload trang (kể cả trong `React.StrictMode`).
  - Tối ưu luồng đăng nhập/đăng ký: trực tiếp tái sử dụng dữ liệu `profile` từ response ban đầu, loại bỏ các lệnh gọi API thừa.
- **Giao diện hiện đại & Chuẩn hóa React 19 / MUI**:
  - Giao diện xây dựng bằng **React 19**, **Material UI (MUI)**, **Lucide Icons** và **Motion Animations**.
  - Chuẩn hóa 100% sang API `slotProps={{ input: { ... } }}` của MUI, loại bỏ hoàn toàn các cảnh báo deprecated `InputProps`.
  - Hỗ trợ ghi nhớ tài khoản đăng nhập (`Remember Me`) qua `localStorage`.
- **Tài liệu API chuẩn hóa**:
  - Swagger UI được cấu hình sẵn tại `/api-docs`.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

| Tầng | Công nghệ / Thư viện chính |
| :--- | :--- |
| **Frontend** | React 19, Vite, Material UI (MUI), Zustand, TanStack React Query, React Hook Form, Zod, Axios, Firebase Client SDK, Lucide React, Motion |
| **Backend** | NestJS (Express), TypeScript, Passport.js (JWT Strategy), Mongoose (MongoDB), Redis (IoRedis), Firebase Admin SDK, Cloudflare Turnstile, Class Validator |
| **Cơ sở dữ liệu & Cache** | MongoDB (lưu trữ người dùng, dữ liệu tin nhắn), Redis (Blacklist token, session người dùng, rate limiting) |
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
└── frontend/                    # Mã nguồn Frontend (React + Vite)
    ├── src/
    │   ├── components/
    │   │   ├── common/          # Component dùng chung (TurnstileWidget)
    │   │   ├── layout/          # AppBar, Header, Drawer menu
    │   │   ├── pages/           # Login, Register, Home, ChatApp
    │   │   └── section/         # Feed, Message, PersonCall
    │   ├── config/              # Cấu hình Firebase Client SDK
    │   ├── data/                # Dữ liệu tĩnh, nội dung hiển thị (loginData, registerData)
    │   ├── hooks/               # Custom Hooks (useSocialAuth)
    │   ├── routes/              # Cấu hình React Router & ProtectedRoute
    │   ├── services/            # Cấu hình Axios Instance & Response Interceptors
    │   ├── store/               # Zustand Store (useAuthStore với in-flight deduplication)
    │   ├── App.jsx              # Khởi tạo React Query, Router Provider & khôi phục phiên
    │   └── main.jsx             # Entry point Frontend (React 19)
    ├── .env.example             # Biến môi trường mẫu cho Frontend
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

3. Cấu hình biến môi trường (`frontend/.env`):
   Tạo file `.env` dựa trên `.env.example`:
   ```env
   VITE_BACKEND_URL=http://localhost:3000
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Cloudflare Turnstile Site Key
   VITE_SITE_KEY=your_cloudflare_turnstile_site_key
   ```

4. Khởi chạy Frontend:
   ```bash
   npm run dev
   ```
   - Mở trình duyệt tại: `http://localhost:5173`

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
      │                                       ▼
      │                                 POST /auth/refresh
      │                                       │
      │                                       ▼
      │                                 Cấp lại AccessToken mới (HttpOnly)
      │                                 Tự động retry lại request ban đầu
      │
      └─► Đăng xuất ─────────────────────► POST /auth/logout
                                              │
                                              ▼
                                   Xóa Cookies + Đưa AccessToken
                                   vào Redis Blacklist (với TTL còn lại)
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

## 🧪 Kiểm thử (Testing)

### Backend E2E Tests:
Chạy bộ kiểm thử luồng xác thực toàn diện (Đăng ký $\rightarrow$ Đăng nhập $\rightarrow$ Gọi API bảo vệ $\rightarrow$ Đăng xuất $\rightarrow$ Xác thực blacklist):
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

## 📋 Lịch sử cập nhật & Lộ trình phát triển

### ✅ Các tính năng & Cải tiến đã hoàn thành

1. **Kiến trúc Xác thực & Bảo mật nâng cao**:
   - [x] Cấu hình thời hạn token chuẩn an toàn: **AccessToken = 1 giờ**, **RefreshToken = 7 ngày**.
   - [x] Tích hợp **Cloudflare Turnstile** chống bot và tấn công brute-force phía Backend & Frontend.
   - [x] Thiết kế lại **Redis Service**: cấu trúc key rõ ràng (`chat:blacklist:`, `chat:session:`, `chat:rate:`, `chat:online:`), hỗ trợ chế độ **Fail-safe** không làm gián đoạn luồng đăng nhập nếu Redis mất kết nối.
   - [x] Loại bỏ toàn bộ kiểu dữ liệu `any` trong Backend, chuẩn hóa định nghĩa TypeScript trong `auth.types.ts` và `users.types.ts`.
   - [x] Tách biệt thông báo lỗi đăng nhập: thông báo cụ thể tài khoản không tồn tại hoặc sai mật khẩu.
   - [x] Xử lý lỗi Firebase `auth/account-exists-with-different-credential` khi tài khoản đã liên kết với nhà cung cấp khác.

2. **Frontend UI & Trải nghiệm người dùng**:
   - [x] Hoàn thiện toàn diện trang **Đăng ký (`/register`)**:
     - Form validation qua Zod & React Hook Form (Họ tên, Email, SĐT chuẩn VN, Mật khẩu có độ phức tạp cao, Xác nhận mật khẩu).
     - Thanh đo độ mạnh mật khẩu thời gian thực (Password Strength Meter).
     - Nút ẩn/hiện mật khẩu (Eye / EyeOff).
     - Điều khoản & chính sách checkbox.
     - Hỗ trợ đăng ký nhanh qua Google / Facebook.
   - [x] Tách Custom Hook tái sử dụng **`useSocialAuth`**: gom toàn bộ logic popup Firebase, bắt lỗi đóng popup và điều hướng thành 1 hook duy nhất dùng cho cả Login, Register và các modal trong tương lai.
   - [x] Tối ưu hóa API Call & Deduplication:
     - Thêm cơ chế **In-flight Promise Deduplication** (`checkAuthPromise`) trong `useAuthStore` giúp triệt tiêu việc gọi 2 lần `/auth/profile` khi reload trang.
     - Thêm `hasCheckedRef` trong `Layout` của `App.jsx` chống double invocation từ `React.StrictMode`.
     - Tận dụng trực tiếp `profile` trả về từ các API login/register để loại bỏ request `/auth/profile` thừa.
   - [x] Chuẩn hóa **Material UI & React 19**: thay thế toàn bộ thuộc tính `InputProps` cũ sang `slotProps={{ input: { ... } }}` để loại bỏ hoàn toàn các cảnh báo DOM.

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
