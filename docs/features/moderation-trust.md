# 🛡️ HỆ THỐNG KIỂM DUYỆT NỘI DUNG & PHÒNG CHỐNG BOT AI (MODERATION & TRUST)

> Tài liệu mô tả chi tiết kiến trúc Hệ thống Kiểm duyệt & An toàn Nội dung, kết hợp mô hình NLP phân loại văn bản, Thị giác máy tính (Vision Models) và các thuật toán học máy phát hiện dị biệt (Isolation Forest & Autoencoder).

---

## 📑 MỤC LỤC
1. [Mục Tiêu & Tiêu Chuẩn An Toàn](#1-mục-tiêu--tiêu-chuẩn-an-toàn)
2. [Hình Ảnh Bằng Chứng Kiểm Thử Tự Động](#2-hình-ảnh-bằng-chứng-kiểm-thử-tự-động)
3. [Kiến Trúc Tổng Thể Bộ Máy Kiểm Duyệt](#3-kiến-trúc-tổng-thể-bộ-máy-kiểm-duyệt)
4. [Phân Loại Văn Bản Độc Hại Song Ngữ VI / EN (NLP)](#4-phân-loại-văn-bản-độc-hại-song-ngữ-vi--en-nlp)
5. [Quét Nhận Diện Media Nhạy Cảm (Vision Models)](#5-quét-nhận-diện-media-nhạy-cảm-vision-models)
6. [Phát Hiện Bot & Tài Khoản Ảo Bằng Thuật Toán Học Máy](#6-phát-hiện-bot--tài-khoản-ảo-bằng-thuật-toán-học-máy)
7. [Bộ Test Cases & Độ Tin Cậy Thực Tế](#7-bộ-test-cases--độ-tin-cậy-thực-tế)

---

## 1. MỤC TIÊU & TIÊU CHUẨN AN TOÀN

Nhằm kiến tạo một môi trường mạng xã hội lành mạnh, văn minh và tin cậy, hệ thống triển khai bộ máy **Moderation & Trust Engine** giải quyết triệt để 3 nguy cơ lớn:
1. **Ngôn từ độc hại & Bắt nạt qua mạng:** Phát hiện và ngăn chặn tự động các bình luận hoặc bài viết có tính xúc phạm, thù ghét, quấy rối hoặc thư rác.
2. **Hình ảnh vi phạm chính sách:** Tự động quét và gắn cờ cảnh báo đối với các tệp media có yếu tố bạo lực hoặc không phù hợp với chuẩn mực cộng đồng.
3. **Mạng lưới Bot & Tài khoản ảo cày tương tác:** Nhận diện các mẫu hành vi tự động bất thường (gửi kết bạn siêu tốc, like hàng loạt trong vài mili-giây) để cách ly khỏi hệ sinh thái bạn bè thật.

---

## 2. HÌNH ẢNH BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG

Bộ test tự động của module Moderation (`moderation.service.spec.ts`) được thực thi định kỳ qua Vitest, chứng minh tính ổn định và sự chính xác tuyệt đối của các thuật toán:

![Bằng chứng kiểm thử Moderation Engine](../assets/screenshots/ai-moderation-trust-tests.png)
*Toàn bộ 17 test cases của hệ thống Moderation & Trust Engine chạy thành công 100%.*

---

## 3. KIẾN TRÚC TỔNG THỂ BỘ MÁY KIỂM DUYỆT

```mermaid
flowchart TD
    UserInput["Nội Dung Đầu Vào (Bài viết, Bình luận, Media, Hành vi)"]

    subgraph TextPipeline ["Tầng Xử Lý Văn Bản"]
        NLP["Bộ Phân Loại NLP Song Ngữ VI/EN"]
        HateSpeech["Ngôn Từ Thù Ghét (Hate Speech)"]
        Toxic["Từ Ngữ Xúc Phạm (Toxic)"]
        Spam["Thư Rác & Lừa Đảo (Spam)"]
        NLP --> HateSpeech & Toxic & Spam
    end

    subgraph MediaPipeline ["Tầng Xử Lý Hình Ảnh"]
        Vision["Vision Content Scanner"]
        Sensitive["Nội Dung Nhạy Cảm / Bạo Lực"]
        Vision --> Sensitive
    end

    subgraph AnomalyPipeline ["Tầng Học Máy Phát Hiện Bot & Tài Khoản Ảo"]
        BehaviorVector["Trích Xuất Vector Đặc Trưng Hành Vi"]
        IForest["Rừng Cô Lập (Isolation Forest)"]
        Autoencoder["Mạng Nơ-ron Autoencoder"]
        BehaviorVector --> IForest & Autoencoder
    end

    UserInput --> TextPipeline & MediaPipeline & AnomalyPipeline

    DecisionEngine{"Bộ Máy Phán Quyết An Toàn (Trust Score)"}
    TextPipeline --> DecisionEngine
    MediaPipeline --> DecisionEngine
    AnomalyPipeline --> DecisionEngine

    DecisionEngine -->|"An Toàn (> 80đ)"| Pass["Cho Phép Đăng Tải / Ưu Tiên Gợi Ý"]
    DecisionEngine -->|"Nghi Vấn (40 - 79đ)"| Review["Cảnh Báo & Giảm Hạng Hiển Thị"]
    DecisionEngine -->|"Vi Phạm (< 40đ)"| Block["Chặn Tức Thì & Cách Ly Tài Khoản"]
```

---

## 4. PHÂN LOẠI VĂN BẢN ĐỘC HẠI SONG NGỮ VI / EN (NLP)

Bộ phân loại văn bản được tối ưu hóa đặc biệt cho ngữ cảnh mạng xã hội Việt Nam và Quốc tế:
- **Tiếng Việt:** Nhận diện các biến thể từ lóng, teencode, viết tắt né tránh bộ lọc (`ch*ửi`, `d*m`, biến âm...).
- **Tiếng Anh:** Áp dụng từ điển độc hại và phân tích ngữ cảnh chuẩn mực.
- **Phân loại 3 nhãn chính:**
  1. `toxic`: Xúc phạm cá nhân, thóa mạ thô tục.
  2. `hate_speech`: Kích động thù hận, phân biệt đối xử vùng miền/tôn giáo.
  3. `spam`: Gửi lặp lại đường link mời chào cá cược hoặc tiếp thị lừa đảo.

---

## 5. QUÉT NHẬN DIỆN MEDIA NHẠY CẢM (VISION MODELS)

- Kiểm tra trước khi tệp được lưu trữ vĩnh viễn vào hệ thống file.
- Trích xuất đặc trưng hình ảnh qua mô hình phân loại thị giác để tính toán chỉ số an toàn `nsfwScore` và `violenceScore`.
- Nếu phát hiện vi phạm, hệ thống từ chối lưu ảnh và trả về mã lỗi `400 Bad Request` kèm thông báo hướng dẫn rõ ràng cho người dùng.

---

## 6. PHÁT HIỆN BOT & TÀI KHOẢN ẢO BẰNG THUẬT TOÁN HỌC MÁY

### 6.1. Thuật toán Rừng Cô Lập (Isolation Forest)
- **Nguyên lý:** Dữ liệu bất thường (Anomalies) thường ít và có giá trị đặc trưng rất khác so với người dùng thông thường, do đó các điểm này dễ bị "cô lập" hơn khi chia ngẫu nhiên không gian đặc trưng bằng các cây quyết định.
- **Đặc trưng hành vi (Feature Vector):**
  - Tần suất gửi lời mời kết bạn trong 60 giây.
  - Tỷ lệ tin nhắn gửi đi so với tin nhắn nhận về.
  - Tốc độ gõ phím và tương tác thích bài viết.
  - Phân bố thời gian hoạt động trong ngày (hoạt động 24/24 không ngừng nghỉ).
- **Kết quả:** Trả về điểm dị biệt `anomalyScore` ($0.0 - 1.0$). Nếu $> 0.65$, tài khoản bị gắn cờ nghi vấn.

### 6.2. Mạng Nơ-ron Tái Tạo (Autoencoder)
- Autoencoder được huấn luyện trên tập mẫu các hành vi chuẩn mực của người dùng thật để nén và tái tạo vector hành vi.
- Khi một tài khoản bot hoạt động với các tương tác máy móc bất thường, mô hình sẽ không thể tái tạo chính xác, dẫn đến **Sai số tái tạo (Reconstruction Error)** tăng vọt:
  $$\text{Loss} = \frac{1}{n} \sum_{i=1}^{n} (x_i - \hat{x}_i)^2$$
- Nếu $\text{Loss} > \text{Threshold}$, tài khoản lập tức bị tước quyền tham gia vào hồ bơi gợi ý bạn bè và bị đưa vào danh sách kiểm toán bảo mật.

---

## 7. BỘ TEST CASES & ĐỘ TIN CẬY THỰC TẾ

Module được bảo đảm với 17 bài test tự động bao quát:
- Test phân loại văn bản độc hại chính xác (cả tiếng Việt có dấu, không dấu và tiếng Anh).
- Test phát hiện spam và từ khóa né tránh kiểm duyệt.
- Test thuật toán Isolation Forest phân chia chuẩn xác giữa người thật và botnet.
- Test sai số tái tạo của Autoencoder với vector dị biệt.
- Test luồng hạ điểm tin cậy và cách ly tài khoản clone khỏi thuật toán gợi ý bạn bè.

