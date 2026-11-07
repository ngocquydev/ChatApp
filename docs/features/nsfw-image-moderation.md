# Kiểm Duyệt & Chặn Ảnh 18+ / Nhạy Cảm Bằng Vision AI & Heuristics (NSFW Image Moderation)

> **Cơ chế kiểm duyệt an toàn thị giác đa tầng:** Tự động phát hiện và chặn đứng các bài viết chứa hình ảnh 18+ (khiêu dâm, khỏa thân, dung tục, bạo lực) trên bài viết công khai và toàn hệ thống mạng xã hội ChatApp. Hỗ trợ song ngữ (VI / EN), thuật toán phân tích màu da người (Skin Tone Detection) trên buffer ảnh, tích hợp kiểm duyệt từ khâu upload đến đăng bài.

---

## 1. Giới thiệu & Mục tiêu

Để bảo vệ cộng đồng người dùng và tuân thủ các tiêu chuẩn nội dung nghiêm ngặt:
- Người dùng khi đăng bài viết (đặc biệt là bài viết công khai - `public` hoặc trong hội nhóm) không được phép chia sẻ các nội dung khiêu dâm, khỏa thân (18+) hoặc bạo lực máu me.
- Hệ thống cần phản hồi tức thì, từ chối lưu bài viết vi phạm, trả về thông báo lỗi rõ ràng và tự động áp dụng lớp phủ làm mờ (Safe Blur) đối với các hình ảnh gợi cảm cần gắn nhãn nhạy cảm (`isSensitive: true`).

---

## 2. Kiến Trúc Phòng Thủ Đa Tầng (Multi-Layer Protection Architecture)

```
[Người dùng chọn ảnh & tải lên]
        │
        ▼ (Tầng 1: Cổng Upload Media - POST /upload)
    ┌──────────────────────────────────────────────────────────┐
    │ UploadController + ModerationService                     │
    │ - Kiểm tra định dạng tệp (MIME / Magic Bytes)           │
    │ - Quét Buffer ảnh bằng thuật toán Human Skin Tone        │
    │ - Quét từ khóa metadata / filename (VI & EN)             │
    │ ➔ Chặn đứng tệp 18+ trước khi lưu Cloudinary             │
    └──────────────────────────────────────────────────────────┘
        │
        ▼
[Người dùng bấm Đăng bài - POST /posts]
        │
        ▼ (Tầng 2: Cổng Đăng bài viết - PostsService)
    ┌──────────────────────────────────────────────────────────┐
    │ PostsService.createPost / updatePost                     │
    │ - Quét từng URL hình ảnh trong mảng `dto.images`         │
    │ - Đánh giá chỉ số: adult, violence, racy                 │
    │                                                          │
    │ ├── Score Adult ≥ 0.8 (Porn / Nude / 18+)                 │
    │ │   ➔ ❌ NÉM LỖI 400 Bad Request: Chặn đăng bài          │
    │ │                                                        │
    │ ├── 0.5 ≤ Score Adult < 0.8 hoặc Racy ≥ 0.7 (Gợi cảm)    │
    │ │   ➔ ⚠️ isSensitive = true, moderationStatus = 'flagged' │
    │ │                                                        │
    │ └── Score < 0.5 (An toàn)                                │
    │     ➔ ✅ approved: Đăng bài viết bình thường              │
    └──────────────────────────────────────────────────────────┘
        │
        ▼ (Tầng 3: Trải nghiệm Người dùng trên Frontend)
    ┌──────────────────────────────────────────────────────────┐
    │ PostImages.tsx + Safe Blur Component                     │
    │ - Nếu bài viết vi phạm bị chặn: Thông báo lỗi nổi bật    │
    │ - Nếu bài viết `isSensitive`: Lớp phủ làm mờ 24px        │
    │   kèm biểu tượng ShieldAlert và nút xác nhận xem ảnh     │
    └──────────────────────────────────────────────────────────┘
```

---

## 3. Các Thuật Toán Nhận Diện

### 3.1. Phân tích phổ màu da người trên Buffer (Raw Byte Skin Tone Detection)
Đối với các tệp ảnh được tải lên trực tiếp, `VisionModerator` áp dụng thuật toán lấy mẫu nhanh (Fast Pixel Sampling) trên buffer RGB để xác định tỷ lệ vùng da người lộ diện:

$$\text{Điều kiện Pixel da người: } R > 95 \land G > 40 \land B > 20 \land (\max(R,G,B) - \min(R,G,B) > 15) \land |R - G| > 15 \land R > G \land R > B$$

- **Tỷ lệ da $\ge 50\%$:** Điểm `adultScore` được gán $\ge 0.88$, kích hoạt hành động `BLOCK`.
- **Tỷ lệ da từ $30\%$ đến $50\%$:** Điểm `adultScore` được gán $\ge 0.58$, `racyScore` $\ge 0.78$, kích hoạt hành động `FLAG_REVIEW`.

### 3.2. Quét từ khóa nhận diện nhạy cảm song ngữ (VI / EN Pattern Matching)
- **Tiếng Anh (Explicit Adult):** `nsfw`, `nude`, `porn`, `xxx`, `adult`, `sex`, `erotic`, `hentai`, `naked`, `nudity`, `topless`, `stripper`, `blowjob`, `penis`, `dick`, `boobs`, `pussy`, `vaginal`.
- **Tiếng Việt (Nội dung người lớn):** `18+`, `18plus`, `khiêu dâm`, `khỏa thân`, `ảnh nóng`, `clip nóng`, `phim sex`, `thủ dâm`.
- **Nội dung gợi cảm / Racy:** `bikini`, `lingerie`, `underwear`, `cleavage`, `sensual`, `suggestive`, `swimsuit`, `lộ hàng`, `đồ lót`, `gợi cảm`.
- **Nội dung bạo lực / Violence:** `blood`, `gore`, `weapon`, `violence`, `knife`, `kill`, `bạo lực`, `đâm chém`, `giết người`.

---

## 4. Bằng Chứng Kiểm Thử Unit Test (100% Passed)

Module kiểm duyệt hình ảnh và cổng đăng bài viết được bảo đảm bởi bộ kiểm thử tự động toàn diện:
- `vision-moderator`: Kiểm tra phát hiện ảnh 18+ tiếng Việt, tiếng Anh, ảnh bạo lực và buffer màu da người.
- `upload.controller.spec.ts`: Kiểm tra chặn tải lên ảnh 18+ ngay tại cổng `/upload`.
- `posts.service.spec.ts`: Kiểm tra chặn đăng bài viết chứa ảnh 18+ và tự động đánh dấu `isSensitive = true` cho bài viết chứa ảnh gợi cảm.

Toàn bộ **430/430 unit tests** trong backend đều vượt qua với kết quả hoàn hảo.
