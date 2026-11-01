# 👑 Cổng Quản Trị Độc Lập (Admin Portal) — Kiến Trúc Tách Biệt Hoàn Toàn

Tài liệu này mô tả chi tiết kiến trúc, giải pháp an ninh và hướng dẫn vận hành của **Admin Portal** sau khi được tách biệt hoàn toàn khỏi ứng dụng người dùng `frontend/` thành một dự án độc lập viết bằng **React 19 + Vite + TypeScript**.

---

## 🎯 1. Lý do & Mục tiêu Kiến trúc

Trước đây, mã nguồn dành cho Quản trị viên (`/admin/*`) nằm chung trong dự án Next.js 16 (`frontend/`). Điều này tiềm ẩn các bất cập:
1. **Rủi ro lộ Bundle:** Mã nguồn logic quản trị và các API endpoints nội bộ có nguy cơ bị phân tích dịch ngược từ file bundle của người dùng thường.
2. **Nguy cơ Bypass Client-side:** Kẻ tấn công có thể cố gắng truy cập trực tiếp các route client-side hoặc kích hoạt nhầm components quản trị.
3. **Phụ thuộc quá trình deploy:** Thay đổi một tính năng quản trị nhỏ buộc phải deploy lại toàn bộ frontend của người dùng cuối.

**Giải pháp:**
- Tách toàn bộ trang Admin thành một dự án **Single Page Application (SPA)** độc lập đặt tại thư mục `admin/` bên cạnh `frontend/` và `backend/`.
- Chạy trên cổng riêng biệt (`http://localhost:5174`), độc lập với cổng người dùng (`http://localhost:5173`).
- Dọn dẹp sạch sẽ 100% mã nguồn quản trị khỏi `frontend/` (không còn route `/admin`, không còn components admin, không còn logic admin trong navigation bar).

---

## 🛠️ 2. Công nghệ & Thư viện

- **Framework & Build tool:** React 19, Vite 6, TypeScript 5.8
- **Routing:** `react-router-dom` v7 (SPA routing với Browser Router)
- **UI & Design System:** Material UI (MUI v9) với Emotion, thiết kế Dark/Light mode tự động dựa trên Design Tokens không hardcode màu
- **Icons:** `lucide-react`
- **Quản lý trạng thái:** `zustand` (lưu trữ phiên đăng nhập quản trị viên `useAdminAuthStore`)
- **Quản lý Form & Validation:** `react-hook-form` + `zod`
- **HTTP Client:** `axios` với `withCredentials: true` gửi HttpOnly cookies
- **Chống Bot tự động:** Cloudflare Turnstile Widget nhúng trực tiếp trong màn hình đăng nhập

---

## 🔒 3. Cơ Chế Xác Thực & Phân Quyền Riêng Biệt

### A. Endpoint Xác thực Chuyên biệt (`POST /auth/admin/login`)
Backend NestJS cung cấp một endpoint chuyên biệt dành riêng cho quản trị viên:
- Chỉ chấp nhận tài khoản có `role === 'admin'`. Nếu người dùng thông thường (`role !== 'admin'`) cố gắng đăng nhập tại đây, backend lập tức từ chối với lỗi **403 Forbidden: Tài khoản này không có quyền quản trị viên!**.
- Tích hợp xác thực **Cloudflare Turnstile** chống brute-force và tấn công tự động bằng bot.
- Cấp cặp `AccessToken` (1 giờ) và `RefreshToken` (7 ngày) qua **HttpOnly Cookie**, hoàn toàn không lưu trữ token nhạy cảm trong `localStorage`.

### B. Kiểm soát Truy cập Client (`<AdminGuard />`)
Mọi tuyến đường bên trong Admin Portal đều được bọc bởi `<AdminGuard />`:
- Tự động gọi `api.get('/auth/me')` để kiểm tra trạng thái phiên làm việc thực tế từ Backend.
- Nếu phiên chưa đăng nhập hoặc không mang vai trò `admin`, tự động chuyển hướng về `/login`.
- Giao diện loading với hiệu ứng skeleton / spinner mượt mà trong quá trình xác thực.

---

## 🧭 4. Cấu trúc Tuyến đường (Routes)

| Tuyến đường | Thành phần | Chức năng |
|---|---|---|
| `/login` | `AdminLogin.tsx` | Cổng đăng nhập quản trị viên độc lập với giao diện an ninh mạng Cyber-Defense |
| `/` | `DashboardView.tsx` | Bảng điều khiển phân tích số liệu tổng quan (người dùng, bài viết, RAM, WAF) |
| `/users` | `UsersManagementView.tsx` | Quản lý người dùng, tìm kiếm, lọc theo vai trò, cấm/mở cấm tài khoản |
| `/posts` | `PostsModerationView.tsx` | Kiểm duyệt bảng tin và các bài viết vi phạm tiêu chuẩn cộng đồng |
| `/moderation` | `ModerationView.tsx` | Hàng đợi kiểm duyệt AI (NLP, Vision) và Sandbox thử nghiệm mô hình |
| `/security` | `SecurityCenter.tsx` | Trung tâm phòng thủ WAF, Under Attack Mode, Cloudflare integration |
| `/system` | `SystemHealthView.tsx` | Giám sát tài nguyên máy chủ, RAM Heap, Redis, MongoDB, Neo4j |

---

## 🚀 5. Khởi chạy & Vận hành

### Khởi chạy Môi trường Phát triển:
```bash
# Từ thư mục gốc:
cd admin
npm install
npm run dev
```
Cổng quản trị sẽ sẵn sàng tại: `http://localhost:5174/login`

### Kiểm tra Chất lượng Mã nguồn:
```bash
npm run lint         # Kiểm tra cú pháp bằng oxlint
npm run typecheck    # Kiểm tra kiểu dữ liệu TypeScript 0 lỗi
npm run build        # Đóng gói sản phẩm sản xuất (Production Build)
```
Mọi quy trình kiểm tra này đã được tự động tích hợp vào `scripts/check.ps1` và `scripts/check.sh` của toàn bộ repository.

