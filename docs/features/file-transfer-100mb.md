# 📁 TÍNH NĂNG GỬI TỆP TIN & TÀI LIỆU DUNG LƯỢNG CAO LÊN ĐẾN 100MB

> Tài liệu kỹ thuật chi tiết về cơ chế truyền tải tệp tin dung lượng lớn (tối đa 100MB) trong hệ thống ChatApp: kiến trúc Cloudinary Raw & Media, kiểm duyệt an toàn định dạng, thẻ hiển thị tệp tin tương tác và tối ưu hóa luồng tải.

---

## 📑 MỤC LỤC
1. [Tổng Quan Tính Năng](#1-tổng-quan-tính-năng)
2. [Kiến Trúc & Quy Chuẩn Dung Lượng](#2-kiến-trúc--quy-chuẩn-dung-lượng)
3. [Phân Loại & Kiểm Soát Định Dạng Tệp (Security Hardening)](#3-phân-loại--kiểm-soát-định-dạng-tệp-security-hardening)
4. [Trải Nghiệm Người Dùng & Giao Diện Hiển Thị (UI/UX)](#4-trải-nghiệm-người-dùng--giao-diện-hiển-thị-uiux)
5. [Kiểm Thử & Đảm Bảo Chất Lượng](#5-kiểm-thử--đảm-bảo-chất-lượng)

---

## 1. TỔNG QUAN TÍNH NĂNG

Trong các cuộc hội thoại thời gian thực, người dùng không chỉ trao đổi văn bản hay ảnh nhỏ mà thường xuyên cần gửi các tệp tài liệu công việc, video chất lượng cao, bài giảng, file nén hoặc âm thanh có dung lượng lớn.

Hệ thống nâng cấp toàn diện giới hạn tải lên từ 50MB lên **100MB (104,857,600 Bytes)** cho mọi loại tệp an toàn:
- **Tài liệu & Hồ sơ:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Text (.txt, .csv).
- **Tệp nén & Đóng gói:** ZIP, RAR, 7Z, TAR, GZ.
- **Đa phương tiện chất lượng cao:** Video (MP4, WEBM, MOV, MKV, AVI) và Âm thanh (MP3, WAV, OGG, M4A, AAC, FLAC).
- **Hình ảnh sắc nét:** PNG, JPG, JPEG, WEBP, GIF, SVG, BMP, HEIC.

---

## 2. KIẾN TRÚC & QUY CHUẨN DUNG LƯỢNG

Hệ thống đồng bộ hạn mức 100MB xuyên suốt từ Client tới Server:

| Thành phần | Tham số / Hạn mức | Vai trò |
|---|---|---|
| **Backend Multer Interceptor** | `MAX_UPLOAD_BYTES = 100 * 1024 * 1024` | Giới hạn stream nhận tệp tại controller `upload.controller.ts` & `posts.controller.ts` |
| **Cloudinary Storage Stream** | `resource_type: 'image' \| 'video' \| 'raw'` | Tự động phân loại luồng tải lên đám mây với tên gốc (`use_filename: true`, `unique_filename: true`) |
| **Frontend Validation** | `MAX_FILE_BYTES = 100 * 1024 * 1024` | Kiểm tra kích thước tệp ngay tại trình duyệt trước khi gửi, tránh lãng phí băng thông |
| **UI Error Handling** | Toast Snackbar & Thông báo lỗi tiếng Việt | Báo lỗi thân thiện nếu người dùng chọn tệp vượt quá 100MB |

---

## 3. PHÂN LOẠI & KIỂM SOÁT ĐỊNH DẠNG TỆP (SECURITY HARDENING)

Tuân thủ nghiêm ngặt chuẩn bảo mật **OWASP A03 (Injection & Malicious File Upload Prevention)**:

### 3.1. Chặn tuyệt đối tệp thực thi độc hại
Backend từ chối tất cả các tệp có đuôi nguy cơ thực thi mã từ xa (RCE) hoặc script độc:
```typescript
const BLOCKED_FILE_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'vbs', 'msi', 'dll', 'com', 'scr',
  'ps1', 'php', 'phtml', 'jar', 'jsp', 'asp', 'aspx', 'cgi',
]);
```

### 3.2. Phân luồng Cloudinary thông minh
- **Video & Audio:** Sử dụng `resource_type: 'video'` để hỗ trợ streaming và phát trực tiếp.
- **Hình ảnh:** Sử dụng `resource_type: 'image'` để tự động nén webp/avif và tạo thumbnail.
- **Tài liệu & Tệp nén:** Sử dụng `resource_type: 'raw'` để lưu trữ nguyên bản (PDF, DOCX, ZIP...).

---

## 4. TRẢI NGHIỆM NGƯỜI DÙNG & GIAO DIỆN HIỂN THỊ (UI/UX)

### 4.1. Nút đính kèm tệp tin (Paperclip Action)
- Cả hộp chat chính (`/chat`) và hộp chat nổi đa nhiệm (`FloatingChatBox`) đều được trang bị nút kẹp giấy (Paperclip) chuyên dụng.
- Người dùng có thể chọn bất kỳ tệp tin nào trên máy tính hoặc điện thoại với tooltip rõ ràng: `"Đính kèm tệp (tối đa 100MB)"`.

### 4.2. Thẻ hiển thị tệp tin tương tác (`FileAttachmentItem`)
Khi gửi một tệp tài liệu hoặc file nén, tin nhắn không hiển thị link thô mà render thành thẻ tệp trực quan:
- **Biểu tượng màu sắc phân loại:**
  - 📕 Đỏ nhạt: PDF
  - 📘 Lam nhạt: Word & Tài liệu văn bản (DOC, DOCX, TXT)
  - 📗 Lục nhạt: Bảng tính (XLS, XLSX, CSV)
  - 📙 Vàng cam: Tệp nén (ZIP, RAR, 7Z)
  - 🔮 Tím nhạt: Tệp âm thanh (MP3, WAV)
- **Tên tệp rõ ràng:** Tự động cắt gọn (ellipsis) nếu tên tệp dài, chống vỡ giao diện.
- **Dung lượng hiển thị:** Đổi tự động theo đơn vị KB/MB.
- **Nút tải xuống 1-chạm:** Mở và tải file trực tiếp về thiết bị người dùng.

### 4.3. Trình phát âm thanh tích hợp
Tin nhắn âm thanh (MP3, WAV, M4A) được hiển thị kèm trình phát nhạc trực tiếp `<audio controls>` ngay trong bong bóng chat.

---

## 5. KIỂM THỬ & ĐẢM BẢO CHẤT LƯỢNG

- **Unit Test Upload Controller:** 5/5 bài kiểm tra đơn vị trong `upload.controller.spec.ts` đạt kết quả xanh:
  - Báo lỗi khi thiếu tệp.
  - Chặn các tệp độc hại như `.exe`.
  - Tải lên thành công các tệp tài liệu an toàn (.pdf, .docx) lên đến 100MB.
- **Kiểm định mã nguồn (Static Analysis & Typecheck):**
  - Backend: Oxlint 0 lỗi, TypeScript 0 lỗi.
  - Frontend: ESLint 0 lỗi, TypeScript 0 lỗi.

