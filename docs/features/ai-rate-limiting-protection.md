# 🛡️ Hệ Thống Kiểm Soát Hạn Mức & Chống Lạm Dụng / Spam AI (Aura AI Rate Limiting & Cost Protection)

Tài liệu này mô tả chi tiết giải pháp bảo vệ hạn mức API Key (Groq Llama 3.3 70B), chống spam dồn dập, tối ưu chi phí token và ngăn ngừa cạn kiệt tài nguyên hệ thống ChatApp.

---

## 1. Bối cảnh & Thách thức

Khi cung cấp trợ lý ảo AI (Aura Bot) cho hàng ngàn người dùng trong mạng xã hội:
- **Nguy cơ cạn kiệt hạn ngạch (Quota Exhaustion / HTTP 429)**: Groq API áp dụng giới hạn nghiêm ngặt theo phút (RPM), theo ngày (RPD) và theo số lượng token (TPM). Một vài người dùng hoặc bot spam liên tục có thể khiến toàn bộ hệ thống bị chặn.
- **Tấn công từ chối dịch vụ (DoS / Prompt Flooding)**: Người dùng gửi các đoạn văn bản khổng lồ (vài chục ngàn ký tự) ép mô hình xử lý tốn kém.
- **Spam dồn dập trong WebSocket (Burst Spamming)**: Người dùng nhấn Enter liên tục khi AI đang stream câu trả lời, tạo ra hàng loạt tiến trình tính toán song song lãng phí.
- **Trùng lặp yêu cầu tóm tắt (Duplicate Calls)**: Nhiều người dùng cùng bấm "Tóm tắt bình luận" trên cùng một bài viết hot khiến AI phải tính toán lại nội dung giống hệt nhau.

---

## 2. Kiến trúc Bảo vệ 5 Tầng (Defense-in-Depth)

Hệ thống bảo vệ AI được triển khai thành 5 tầng độc lập và bổ trợ lẫn nhau:

```
                  [ Người Dùng Gửi Yêu Cầu AI (Chat / Tóm Tắt) ]
                                      │
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │  TẦNG 1: KIỂM SOÁT ĐỘ DÀI PROMPT (Token Budget)  │ ➔ Chặn prompt > 1000 ký tự
             └────────────────────────┬─────────────────────────┘
                                      │ Hợp lệ
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │  TẦNG 2: BỘ NHỚ ĐỆM NGỮ NGHĨA (Redis Cache)      │ ➔ Trả ngay kết quả có sẵn (TTL 30m)
             └────────────────────────┬─────────────────────────┘    (Tiết kiệm 100% token Groq)
                                      │ Cache Miss
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │  TẦNG 3: RATE LIMITING & COOLDOWN (Redis Engine) │
             │  - Cooldown: 3 giây giữa 2 lần gọi liên tiếp     │ ➔ Chặn spam dồn dập
             │  - RPM Limit: Tối đa 6 requests / phút / user    │ ➔ Chặn flood script
             │  - Daily Quota: Tối đa 50 lượt / ngày / user     │ ➔ Bảo vệ ngân sách API
             └────────────────────────┬─────────────────────────┘
                                      │ Hợp lệ
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │  TẦNG 4: CONCURRENCY LOCK (Khóa Xử Lý Đồng Thời) │ ➔ Mỗi user chỉ 1 luồng sinh
             └────────────────────────┬─────────────────────────┘
                                      │ Khóa thành công
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │  TẦNG 5: TỐI ƯU MAX TOKENS & FAIL-SAFE FALLBACK  │
             │  - Cắt trần max_tokens: 350 (chat) & 450 (summary│ ➔ Tiết kiệm 65% token trần
             │  - HTTP 429 Handler: Tự động chuyển RAG Fallback │ ➔ Không bao giờ sập app
             └──────────────────────────────────────────────────┘
```

---

## 3. Chi tiết Cấu hình & Các Ngưỡng Bảo vệ

Các ngưỡng bảo mật được quản lý tập trung qua `AuraRateLimiterService` và có thể tùy chỉnh linh hoạt qua biến môi trường:

| Thông số | Biến Môi Trường | Giá trị Mặc định | Mục đích |
|---|---|:---:|---|
| **Thời gian hồi chiêu (Cooldown)** | `AURA_COOLDOWN_SECONDS` | `3` giây | Chống nhấn liên tục, cho phép người dùng đọc phản hồi |
| **Giới hạn theo phút (RPM)** | `AURA_RPM_LIMIT` | `6` req/phút | Ngăn chặn hành vi spam tự động bằng macro |
| **Hạn ngạch theo ngày (Daily Quota)** | `AURA_DAILY_QUOTA` | `50` req/ngày | Đảm bảo chia sẻ công bằng tài nguyên cho toàn bộ cộng đồng |
| **Độ dài câu hỏi tối đa** | `AURA_MAX_PROMPT_CHARS` | `1.000` ký tự | Chống tấn công nhồi token (Prompt Flooding) |
| **Thời gian lưu Cache tóm tắt** | `AURA_SUMMARY_CACHE_TTL` | `1.800` giây (30p) | Tái sử dụng tóm tắt bài viết cho nhiều người xem cùng lúc |
| **Trần Token câu trả lời** | Code constant | `350` tokens (chat) | Giảm 65% chi phí so với trần 1024 token mặc định |

---

## 4. Trải Nghiệm Người Dùng (UX) Thân Thiện

Khi người dùng chạm ngưỡng giới hạn, hệ thống **không báo lỗi server kỹ thuật (Internal Server Error)** mà phản hồi bằng ngôn từ gần gũi, văn minh:

- **Khi nhấn quá nhanh (< 3s)**:
  > *"Bạn đang nhắn quá nhanh! Vui lòng chờ 3s trước khi nhắn tiếp cho Aura nhé ⏳"*
- **Khi spam > 6 câu/phút**:
  > *"Bạn đã đạt giới hạn 6 tin nhắn/phút cho Aura AI. Vui lòng nghỉ tay ít giây nhé! ☕"*
- **Khi hết hạn mức ngày (50 lượt)**:
  > *"Bạn đã sử dụng hết hạn mức AI miễn phí trong ngày (50 lượt). Hạn mức sẽ được làm mới vào ngày mai nhé! 🌙"*
- **Khi AI đang trả lời tin nhắn trước**:
  > *"Aura đang trả lời tin nhắn trước của bạn, vui lòng đợi trong giây lát nhé! ⏳"*

---

## 5. API Kiểm Tra Hạn Ngạch Cho Frontend

Endpoint công khai cho người dùng đã đăng nhập:
```http
GET /groq/quota
Authorization: Bearer <jwt_token>
```
Phản hồi JSON:
```json
{
  "used": 12,
  "limit": 50,
  "remaining": 38
}
```

---

## 6. Kiểm Thử Đảm Bảo Chất Lượng (Quality Verification)

Hệ thống đi kèm bộ kiểm thử tự động toàn diện tại `aura-rate-limiter.service.spec.ts`:
- ✅ Chặn prompt vượt quá 1000 ký tự.
- ✅ Cho phép request đầu tiên và cấp phát khóa `cooldown` + `concurrency lock`.
- ✅ Chặn request đồng thời khi luồng trước chưa hoàn tất.
- ✅ Chặn request trong khoảng thời gian cooldown 3s.
- ✅ Chặn request vượt ngưỡng 6 RPM.
- ✅ Chặn request khi vượt hạn mức 50 lượt/ngày.
- ✅ Chế độ Fail-safe: Tự động cho phép người dùng tiếp tục nếu Redis gặp sự cố tạm thời.
- ✅ Ghi và đọc đệm kết quả tóm tắt bài viết thành công 100%.

