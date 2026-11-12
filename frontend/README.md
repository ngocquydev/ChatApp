# 💻 ChatApp - Frontend Client

Frontend ChatApp dùng Next.js 16, React 19, MUI v9 và Socket.IO. Nội dung tin nhắn realtime được mã hóa bằng Protocol Buffers trước khi gửi qua WebSocket.

---

## Realtime: Socket.IO + Protocol Buffers

ChatApp gửi và nhận payload tin nhắn Protobuf dạng nhị phân qua Socket.IO. Các sự kiện
presence, typing và read/seen cũng đi qua Socket.IO. REST API là đường dự phòng
khi mất kết nối realtime.

---

## 🔐 Kiến trúc Quản lý Phiên & Bảo mật

- **HttpOnly Cookies**: Không lưu Access Token / Refresh Token trong `localStorage` để chống triệt để các cuộc tấn công XSS.
- **Axios Interceptor**: Tự động chặn mã lỗi `401` để kích hoạt luồng làm mới token ngầm (`/auth/refresh`) mà người dùng không bị gián đoạn thao tác.
- **In-flight Deduplication**: Cơ chế khóa Promise ngăn việc gọi API `/auth/profile` nhiều lần cùng lúc khi khởi động ứng dụng.
- **AuthGuard**: Bảo vệ các tuyến đường riêng tư phía Client, tự động chuyển hướng về `/login` nếu phiên làm việc chưa hợp lệ.
