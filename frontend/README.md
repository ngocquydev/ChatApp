# 💻 ChatApp - Frontend Client

Nền tảng giao diện người dùng thời gian thực hiện đại (**Modern Realtime Client**) cho ChatApp, được phát triển trên nền tảng **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**, kết hợp thiết kế hệ thống **Material UI (MUI v9)**, cơ chế truyền dữ liệu nhị phân hiệu năng cao **MQTT + Protobuf**, **Socket.IO** và các chuẩn bảo mật, SEO tối tân.

---

## 📑 Mục lục
- [✨ Tính năng & Điểm nhấn chính](#-tính-năng--điểm-nhấn-chính)
- [🛠️ Công nghệ cốt lõi](#️-công-nghệ-cốt-lõi)
- [📁 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [🚀 Cài đặt & Khởi chạy](#-cài-đặt--khởi-chạy)
  - [1. Cài đặt Dependencies](#1-cài-đặt-dependencies)
  - [2. Cấu hình biến môi trường (.env)](#2-cấu-hình-biến-môi-trường-env)
  - [3. Lệnh chạy dự án](#3-lệnh-chạy-dự-án)
- [🌐 Tối ưu hóa SEO & Chống Bot Scraper](#-tối-ưu-hóa-seo--chống-bot-scraper)
- [⚡ Giao thức Thời Gian Thực (Dual-Engine: Socket.IO + MQTT/Protobuf)](#-giao-thức-thời-gian-thực-dual-engine-socketio--mqttprotobuf)
- [🔐 Kiến trúc Quản lý Phiên & Bảo mật](#-kiến-trúc-quản-lý-phiên--bảo-mật)

---

## ✨ Tính năng & Điểm nhấn chính

1. **Hiệu năng & Tốc độ cao với Next.js 16 & Turbopack**:
   - Sử dụng App Router tối ưu hóa SSR / Client Components.
   - Biên dịch và HMR cực nhanh với trình dựng Turbopack (`next dev -p 5173`).
   - Tối ưu kích thước bundle và nạp trang tĩnh với code splitting tự động.

2. **Giao diện người dùng đẳng cấp (Material UI v9 & Emotion)**:
   - Hệ thống giao diện đồng bộ, thanh lịch với palette màu hiện đại.
   - Triệt tiêu hoàn toàn hiện tượng layout shift và FOUC khi SSR nhờ `@mui/material-nextjs`.
   - Hiệu ứng chuyển động mượt mà với `motion` (Framer Motion) và thông báo âm thanh tương tác sống động (`/public/sounds`).

3. **Tìm kiếm bạn bè Zero-Flicker & Zero-Collapse**:
   - Danh sách tìm kiếm không bị giật hay co giãn khi gõ liên tục.
   - Xử lý xung đột mạng (Race Condition) bằng `searchSeq`, bảo đảm phản hồi chính xác 100%.

4. **Trò chuyện trực tiếp & Đa dạng trải nghiệm**:
   - Khung chat nổi (Floating Chat Box) linh hoạt và trang trò chuyện toàn màn hình (`/chat`).
   - Trực quan hóa trạng thái trực tuyến (Online/Offline) và vị trí bạn bè (Radar / Location map).

5. **Đăng nhập & Đăng ký an toàn**:
   - Hỗ trợ đăng nhập truyền thống (Email/Password) và Đăng nhập xã hội (Google, Facebook qua Firebase Auth).
   - Tích hợp Cloudflare Turnstile CAPTCHA chống tấn công dò mật khẩu và bot tự động.

---

## 🛠️ Công nghệ cốt lõi

| Nhóm | Công nghệ / Thư viện |
| :--- | :--- |
| **Framework & Core** | Next.js 16.4.2 (App Router), React 19.2.8, TypeScript 5.8 |
| **Styling & Icons** | Material UI (MUI v9), Emotion, Lucide React, Material Icons |
| **State Management** | Zustand (AuthStore, ChatStore, FriendStore...) |
| **Realtime Engine** | Socket.IO Client, MQTT Client (`mqtt.js`), Protobuf (`protobufjs`) |
| **Data Fetching** | Axios (Auto interceptors & Token refresh), TanStack React Query v5 |
| **Form & Validation** | React Hook Form, Zod Schema |
| **Authentication** | Firebase Client SDK (OAuth), Cloudflare Turnstile, HttpOnly Cookies |
| **SEO & Web Standards** | Next.js Metadata API, Dynamic Sitemap (`sitemap.ts`), JSON-LD Schema.org, Robots.txt |

---

## 📁 Cấu trúc thư mục

```text
frontend/
├── public/                      # Tệp tĩnh công khai
│   ├── favicon.svg              # Logo & biểu tượng ứng dụng
│   ├── icons.svg                # Sprite icons
│   ├── robots.txt               # Quy tắc chống bot cào data & tối ưu SEO
│   └── sounds/                  # Âm thanh thông báo, tin nhắn đến
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── chat/                # Trang chat chính (/chat)
│   │   ├── login/               # Trang đăng nhập (/login)
│   │   ├── register/            # Trang đăng ký tài khoản (/register)
│   │   ├── forgot-password/     # Trang khôi phục mật khẩu (/forgot-password)
│   │   ├── profile/             # Trang hồ sơ người dùng (/profile)
│   │   ├── components/          # Shell layout (ClientShell)
│   │   ├── globals.css          # CSS toàn cục & định kiểu thanh cuộn
│   │   ├── layout.tsx           # RootLayout, SEO Metadata, Theme Provider
│   │   ├── page.tsx             # Trang chủ điều hướng (AuthGuard -> Home)
│   │   ├── providers.tsx        # React Query, MUI Cache & Theme Provider
│   │   ├── sitemap.ts           # Dynamic XML Sitemap tự động tạo bởi Next.js
│   │   └── not-found.tsx        # Trang 404 tùy biến
│   │
│   ├── components/              # Các UI Components
│   │   ├── common/              # AuthGuard, TurnstileWidget, AvatarWithStatus...
│   │   ├── layout/              # AppBar, Navigation, Sidebar...
│   │   ├── pages/               # Home, Login, Register, ChatApp...
│   │   └── section/             # Feed, FloatingChatBox, FriendList, Radar...
│   │
│   ├── config/                  # Cấu hình Firebase, Turnstile & App Constants
│   ├── data/                    # Mock & static content (registerData, badges...)
│   ├── hooks/                   # Custom Hooks (useSocialAuth, useDebounce...)
│   ├── services/                # API client (Axios), Socket Service, MQTT Client, Protobuf
│   ├── store/                   # Zustand Stores (useAuthStore, useFriendStore...)
│   └── types/                   # Định nghĩa TypeScript Interfaces & Types
│
├── next.config.mjs              # Cấu hình Next.js (Images, Transpile, Env mapping)
├── tsconfig.json                # Cấu hình TypeScript compiler
└── package.json                 # Quản lý dependencies & scripts
```

---

## 🚀 Cài đặt & Khởi chạy

### 1. Cài đặt Dependencies

Tại thư mục `frontend`:
```bash
npm install
```

### 2. Cấu hình biến môi trường (.env)

Tạo file `.env` hoặc `.env.local` tại thư mục `frontend`:

```env
# Backend API & WebSocket Endpoint
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Địa chỉ domain công khai (phục vụ SEO Canonical & Sitemap)
NEXT_PUBLIC_SITE_URL=https://chatapp.vn

# Firebase Authentication Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Cloudflare Turnstile (Chống Bot)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
NEXT_PUBLIC_SITE_KEY=your_cloudflare_turnstile_site_key
```

### 3. Lệnh chạy dự án

| Lệnh | Mục đích |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ phát triển Next.js với Turbopack (cổng mặc định `5173`) |
| `npm run build` | Biên dịch bundle tối ưu hóa cho môi trường Production và sinh Static Pages |
| `npm run start` | Khởi chạy ứng dụng Production sau khi đã build |
| `npm run lint` | Chạy trình phân tích tĩnh ESLint kiểm tra chất lượng mã nguồn |

---

## 🌐 Tối ưu hóa SEO & Chống Bot Scraper

1. **Chuẩn hóa Metadata**:
   - Tích hợp `metadataBase`, Canonical URLs, OpenGraph (Facebook/Zalo) và Twitter Cards đầy đủ trên tất cả các trang công khai.
   - Thẻ ngữ nghĩa `<h1>` và `<h2>` phân cấp rõ ràng trên trang đăng ký, đăng nhập.
2. **Dữ liệu có cấu trúc JSON-LD (Schema.org)**:
   - Tự động chèn thẻ `<script type="application/ld+json">` cho các trang để Google lập chỉ mục dạng Rich Snippets (`WebPage`, `BreadcrumbList`, `RegisterAction`).
3. **Dynamic Sitemap (`/sitemap.xml`)**:
   - Được sinh tự động bởi Next.js thông qua [`src/app/sitemap.ts`](src/app/sitemap.ts).
4. **Bảo vệ dữ liệu với [`public/robots.txt`](public/robots.txt)**:
   - **Mở quyền SEO**: Cho phép công cụ tìm kiếm uy tín (Google, Bing) crawl các trang giới thiệu và xác thực (`/`, `/login`, `/register`).
   - **Bảo mật dữ liệu cá nhân**: Chặn hoàn toàn bot lập chỉ mục các route riêng tư (`/chat`, `/profile`, `/api`).
   - **Chặn AI Crawlers**: Đưa toàn bộ các bot cào dữ liệu huấn luyện AI (`GPTBot`, `CCBot`, `Bytespider`, `ClaudeBot`, `PerplexityBot`...) vào danh sách cấm tuyệt đối.

---

## ⚡ Giao thức Thời Gian Thực (Dual-Engine: Socket.IO + MQTT/Protobuf)

Hệ thống kết hợp 2 giải pháp truyền thông thời gian thực tối ưu:
- **Socket.IO Engine**:
  - Quản lý trạng thái kết nối phòng chat, cập nhật danh sách bạn bè, thông báo realtime.
- **MQTT + Protobuf Engine**:
  - Xử lý các gói tin tần số cao (High-frequency micro-events) như **Typing Indicators nhị phân** hoặc **Cập nhật tọa độ di chuyển**.
  - Dữ liệu được nén qua Google Protocol Buffers (`protobufjs`) giúp giảm đến 80% dung lượng payload so với JSON truyền thống, loại bỏ độ trễ mạng.

---

## 🔐 Kiến trúc Quản lý Phiên & Bảo mật

- **HttpOnly Cookies**: Không lưu Access Token / Refresh Token trong `localStorage` để chống triệt để các cuộc tấn công XSS.
- **Axios Interceptor**: Tự động chặn mã lỗi `401` để kích hoạt luồng làm mới token ngầm (`/auth/refresh`) mà người dùng không bị gián đoạn thao tác.
- **In-flight Deduplication**: Cơ chế khóa Promise ngăn việc gọi API `/auth/profile` nhiều lần cùng lúc khi khởi động ứng dụng.
- **AuthGuard**: Bảo vệ các tuyến đường riêng tư phía Client, tự động chuyển hướng về `/login` nếu phiên làm việc chưa hợp lệ.
