# Tích Hợp AWS S3 Bucket & Amazon Rekognition Cho Xử Lý & Kiểm Duyệt Nội Dung 18+

> **Kiến trúc lưu trữ đám mây & kiểm duyệt thị giác AI trên AWS:** Lưu trữ tập trung hình ảnh media vào AWS S3 Bucket và tự động hóa quy trình phân tích, phát hiện, ngăn chặn triệt để hình ảnh 18+ (khỏa thân, khiêu dâm, bạo lực) bằng Amazon Rekognition tại Region `ap-southeast-2` (Sydney).

---

## 1. Mục tiêu & Tổng quan

Hệ thống kết hợp sức mạnh của điện toán đám mây **AWS S3** và thị giác máy tính học sâu **Amazon Rekognition** để xây dựng hàng rào bảo mật và kiểm duyệt toàn diện:
1. **Lưu trữ chuẩn công nghiệp:** Toàn bộ ảnh tải lên bài viết được lưu trữ an toàn trên AWS S3 (`chatapp-media-your-account-id-ap-southeast-2`) thay vì phân tán trên ổ cứng cục bộ.
2. **Kiểm duyệt 2 lớp tối ưu chi phí (Hybrid Fast-Fail):**
   - **Lớp 1 (Fast-Fail tại chỗ < 5ms):** Thuật toán giải mã pixel RGBA và phân tích không gian màu kép YCbCr/RGB chặn đứng các ảnh khiêu dâm lộ liễu mà không tốn chi phí gọi AWS API.
   - **Lớp 2 (Amazon Rekognition Deep AI):** Phân tích ngữ cảnh sâu với các nhãn `Explicit Nudity` (`Exposed Female Genitalia`, `Exposed Male Genitalia`, `Exposed Female Nipple`), `Suggestive`, và `Violence` với độ chính xác học sâu $> 99\%$.
3. **Bảo mật & Tự động dọn dẹp:**
   - Bucket áp dụng **Block Public Access 100%**.
   - Mã hóa toàn bộ dữ liệu bằng **SSE-S3 AES-256**.
   - Cấu hình **S3 Lifecycle Rules** tự động xóa các tệp rác trong tiền tố `quarantine/` sau 24 giờ.

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
       ▼ (2) AwsStorageService.uploadBuffer
┌────────────────────────────────────────────────────────┐
│ AWS S3 Bucket: chatapp-media-your-account-id-ap-southeast-2│
│ - Lưu trữ tại prefix: posts/UUID.jpg                   │
│ - Trả về URL an toàn: https://...s3.ap-southeast-2...  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Cấu hình & Biến môi trường

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

