# Cấu Hình Biến Môi Trường Hợp Nhất (.env.local)

## 1. Tổng quan & Mục tiêu
Trước đây, các biến môi trường của dự án bị phân mảnh rải rác ở nhiều thư mục khác nhau:
- `.env` tại root (Cloudflare tunnel token, Cloudinary, Firebase Admin SDK)
- `backend/.env` (Database MongoDB/Redis/Neo4j, JWT secret, Turnstile, Groq, AWS S3)
- `frontend/.env` & `frontend/.env.local` (Next.js public URL, Turnstile site key, Firebase client)
- `admin/.env` (Vite backend URL, Turnstile site key, Firebase client)

Việc phân mảnh này khiến việc thiết lập môi trường mới, đồng bộ khóa API, và cập nhật key bảo mật dễ bị lệch pha hoặc sai sót. Chức năng này đã **hợp nhất 100% toàn bộ biến môi trường về một file duy nhất `.env.local` tại thư mục gốc repository** (`d:\Web\chat\.env.local`).

---

## 2. Kiến trúc Nạp Cấu Hình Đa Nền Tảng

```
                         ┌─────────────────────────────┐
                         │  Repository Root .env.local │
                         │ (Nguồn cấu hình duy nhất)   │
                         └──────────────┬──────────────┘
                                        │
        ┌───────────────────────────────┼──────────────────────────────┐
        ▼                               ▼                              ▼
 ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
 │ Next.js 16    │              │ NestJS Backend│              │ React 19 Vite │
 │ (Frontend)    │              │ (Backend)     │              │ (Admin Portal)│
 └───────┬───────┘              └───────┬───────┘              └───────┬───────┘
         │                              │                              │
 Nạp qua @next/env              Nạp qua ConfigModule           Nạp qua envDir
 loadEnvConfig(rootEnvDir)      envFilePath: ['../.env.local']  envDir: rootEnvDir
```

### 2.1. Next.js 16 App Router (`frontend/next.config.mjs`)
- Tự động nạp `.env.local` từ thư mục cha thông qua `@next/env`:
  ```javascript
  import nextEnv from '@next/env';
  import path from 'node:path';
  import fs from 'node:fs';

  const { loadEnvConfig } = nextEnv;
  const rootEnvDir = fs.existsSync(path.resolve(process.cwd(), '../.env.local'))
    ? path.resolve(process.cwd(), '..')
    : process.cwd();

  loadEnvConfig(rootEnvDir);
  ```

### 2.2. NestJS Backend (`backend/src/app.module.ts`)
- `ConfigModule.forRoot` được cấu hình để tìm kiếm `.env.local` từ cả thư mục gốc lẫn thư mục hiện tại:
  ```typescript
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '../.env.local'),
      path.resolve(__dirname, '../../.env.local'),
      path.resolve(__dirname, '../.env.local'),
      '.env.local',
      '.env',
    ],
  }),
  ```

### 2.3. Vite Admin Portal (`admin/vite.config.ts`)
- Cấu hình `envDir` chỉ định Vite tìm `.env.local` từ thư mục gốc của repository:
  ```typescript
  const rootEnvDir = fs.existsSync(path.resolve(__dirname, "../.env.local"))
    ? path.resolve(__dirname, "..")
    : __dirname;

  export default defineConfig({
    envDir: rootEnvDir,
    ...
  ```

### 2.4. Docker Compose (`docker-compose.yml`)
- Cả 3 service `backend`, `frontend`, và `admin` cùng trỏ đến `env_file: ./.env.local`.
- Mount file cấu hình vào container:
  ```yaml
  volumes:
    - ./.env.local:/app/.env.local:ro
    - ./.env.local:/app/.env:ro
  ```

---

## 3. Bản Mẫu `.env.example`
Tệp `.env.example` tại gốc dự án cung cấp mẫu chuẩn gồm các nhóm biến môi trường:
1. **System & Ports & URLs**: `PORT`, `PORT_FE`, `PORT_ADMIN`, `NEXT_PUBLIC_BACKEND_URL`, `FRONTEND_URL`
2. **Database & Cache**: `MONGODB_URI`, `REDIS_URL`, `NEO4J_URI`, `AURA_INSTANCEID`
3. **Authentication**: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`
4. **Cloudflare Turnstile**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CLOUDFLARE_TUNNEL_TOKEN`
5. **Firebase**: `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`
6. **Cloudinary**: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
7. **AI Models**: `GROQ_API_KEY`, `GROQ_MODEL`
8. **SMTP Mailer**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
9. **Third-Party & Admin**: `NEXT_GIPHY_API_KEY`, `VITE_DEFAULT_ADMIN_EMAIL`, `VITE_DEFAULT_ADMIN_PASSWORD`

---

## 4. Kiểm Thử & Xác Minh
- **Frontend Typecheck**: `npm run typecheck --prefix frontend` (0 errors)
- **Frontend Lint**: `npm run lint --prefix frontend` (0 errors)
- **Frontend Build**: `npm run build --prefix frontend` (14/14 static pages compiled)
- **Backend Lint**: `npm run lint --prefix backend` (0 errors)
- **Backend Tests**: `npm run test --prefix backend` (50 test files passed, 452 tests passed)
- **Admin Build**: `npm run build --prefix admin` (0 errors, 3187 modules transformed)

