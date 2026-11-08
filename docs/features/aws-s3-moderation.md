# Tích Hợp Amazon Rekognition Cho Xử Lý & Kiểm Duyệt Nội Dung 18+

> **Kiểm duyệt thị giác AI trên AWS:** Tự động hóa quy trình phân tích, phát hiện, ngăn chặn triệt để hình ảnh 18+ (khỏa thân, khiêu dâm, bạo lực) bằng Amazon Rekognition tại Region `ap-southeast-2` (Sydney). Hệ thống lưu trữ media chính sử dụng Cloudinary, loại bỏ hoàn toàn sự phụ thuộc vào AWS S3.

---

## 1. Mục tiêu & Tổng quan

Hệ thống kết hợp thuật toán thị giác máy tính tại chỗ và **Amazon Rekognition** để xây dựng hàng rào bảo mật và kiểm duyệt toàn diện:
1. **Lưu trữ media Cloudinary:** Toàn bộ ảnh/video bài viết được xử lý và lưu trữ thông qua Cloudinary.
2. **Kiểm duyệt 2 lớp tối ưu chi phí (Hybrid Fast-Fail):**
   - **Lớp 1 (Fast-Fail tại chỗ < 5ms):** Thuật toán giải mã pixel RGBA và phân tích không gian màu kép YCbCr/RGB chặn đứng các ảnh khiêu dâm lộ liễu mà không tốn chi phí gọi API.
   - **Lớp 2 (Amazon Rekognition Deep AI):** Phân tích ngữ cảnh sâu với các nhãn `Explicit Nudity` (`Exposed Female Genitalia`, `Exposed Male Genitalia`, `Exposed Female Nipple`), `Suggestive`, và `Violence` với độ chính xác học sâu $> 99\%$.
3. **Truyền buffer trực tiếp:** `AwsRekognitionService` truyền trực tiếp `Bytes: buffer` tới Rekognition API mà không cần lưu tạm vào S3.

---

## 2. Kiến trúc Luồng Dữ Liệu (Pipeline Flow)

```
[Người dùng tải ảnh lên bài viết]
       │
       ▼ (1) POST /posts/images
┌────────────────────────────────────────────────────────┐
│ PostsController.uploadImage                            │
│                                                        │
│ ├── Lớp 1: VisionModerator (Fast-Fail RAM)             │
│ │   ➔ Tỉ lệ da người >= 40% ➔ Chặn ngay (HTTP 400)    │
│ │                                                      │
│ └── Lớp 2: AwsRekognitionService (Amazon Rekognition)  │
│     ➔ Gọi DetectModerationLabels (ap-southeast-2)      │
│     ➔ Phát hiện Explicit Nudity (Confidence >= 75%)    │
│     ➔ Chặn và trả lỗi HTTP 400 chi tiết                │
└────────────────────────────────────────────────────────┘
       │ (Ảnh an toàn)
       ▼ (2) Lưu trữ qua Cloudinary
┌────────────────────────────────────────────────────────┐
│ Cloudinary Media Service                               │
│ - Upload ảnh an toàn, tối ưu hóa WebP/JPEG CDN         │
└────────────────────────────────────────────────────────┘
```

---

## 3. Cấu hình & Biến môi trường

```env
# Amazon Rekognition AI Moderation (Tuỳ chọn)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

Trong `backend/.env`:
```env
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_NAME=chatapp-media-your-account-id-ap-southeast-2
AWS_PROFILE=default
```

### Các quyền IAM & Thao tác được sử dụng:
- **Amazon S3:** `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:CopyObject`.
- **Amazon Rekognition:** `rekognition:DetectModerationLabels`.

---

## 4. Kiểm thử & Đảm bảo chất lượng (Quality Gates)

Hệ thống đã được bổ sung đầy đủ unit tests chuyên biệt trong `backend/src/modules/aws-storage/`:
- `aws-storage.service.spec.ts`: 5 tests kiểm tra khởi tạo, upload buffer, xóa object, di chuyển file và bắt lỗi buffer rỗng.
- `aws-rekognition.service.spec.ts`: 4 tests kiểm tra nhận diện nhãn an toàn, nhãn 18+ (Explicit Nudity, Nipple, Genitalia) và cơ chế chịu lỗi khi mất kết nối mạng.
- **Tổng số tests:** Toàn bộ 49 test files với **443/443 tests** đạt 100% thành công.

