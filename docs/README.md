# 📚 TRUNG TÂM TÀI LIỆU KỸ THUẬT (CHATAPP DOCUMENTATION)

> Chào mừng bạn đến với trung tâm tài liệu kỹ thuật chi tiết của dự án **ChatApp & Social Platform**.

---

## 📑 MỤC LỤC TÀI LIỆU

### 1. Trải Nghiệm & Hình Ảnh Demo Trực Quan
- 📸 **[Hình Ảnh Demo & Trải Nghiệm Thực Tế (docs/demo.md)](demo.md)**: Tổng hợp các ảnh chụp màn hình thực tế (Screenshots) của Bảng tin, Chat nổi Messenger, Khám phá bạn bè, Hồ sơ cá nhân và Báo cáo kiểm thử AI Moderation.

### 2. Tài Liệu Chi Tiết Từng Tính Năng (Feature Specifications)
- 💬 **[Nhắn Tin Thời Gian Thực & Hộp Chat Nổi (docs/features/chat-realtime.md)](features/chat-realtime.md)**:
  - Kiến trúc Dual-Engine (Socket.IO + Binary MQTT/Protobuf).
  - Cửa sổ chat nổi đa nhiệm phong cách Facebook Messenger.
  - Các tính năng nâng cao: Chủ đề đoạn chat (5 theme), Thu hồi tin nhắn (Unsend), Chế độ Hạn chế (Restrict), Chặn/Bỏ chặn (Block/Unblock), Chỉ báo soạn thảo Typing Heartbeat.
- 🤝 **[Thuật Toán Gợi Ý Bạn Bè Thông Minh Bằng Đồ Thị Neo4j (docs/features/friend-recommendation.md)](features/friend-recommendation.md)**:
  - Đồ thị quan hệ bạn bè Neo4j: Thuật toán Friends-of-Friends (2 hops) với khả năng duyệt trực tiếp Index-free Adjacency (< 5ms).
  - Thuật toán Degree Centrality giải quyết triệt để bài toán Cold-Start cho người dùng mới trực tiếp trên đồ thị.
  - Tầng Caching Redis TTL 60s và cơ chế dự phòng an toàn (Fallback) với MongoDB 2dsphere Geospatial.
- 📰 **[Bảng Tin Mạng Xã Hội & Hồ Sơ Cá Nhân (docs/features/social-feed-profile.md)](features/social-feed-profile.md)**:
  - Khung đăng bài "Bạn đang nghĩ gì?", đính kèm 4 ảnh chất lượng cao kèm kiểm tra chữ ký Magic-byte.
  - Cơ chế phân quyền riêng tư 3 cấp độ (*Công khai / Bạn bè / Chỉ mình tôi*).
  - Tương tác thích lạc quan (Optimistic like), bình luận, chia sẻ.
  - Trang cá nhân chuẩn Facebook Timeline, công cụ cắt avatar công thái học (`AvatarCropDialog`), cập nhật học vấn (trường học) và tình trạng mối quan hệ (hẹn hò, độc thân, góa...).
- 🛡️ **[Hệ Thống Kiểm Duyệt Nội Dung & Phòng Chống Bot AI (docs/features/moderation-trust.md)](features/moderation-trust.md)**:
  - Phân loại văn bản độc hại, ngôn từ thù ghét, thư rác bằng NLP Transformer song ngữ VI/EN.
  - Quét nhận diện hình ảnh/video nhạy cảm bằng Vision Models.
  - Phát hiện dị biệt Bot & Tài khoản ảo cày tương tác bằng thuật toán Isolation Forest & Mạng nơ-ron Autoencoder.
  - Bộ 17 test cases kiểm thử chuyên sâu bảo đảm độ tin cậy.
- 🔒 **[Xác Thực Bảo Mật & Hệ Thống Cổng CI/CD (docs/features/auth-security-cicd.md)](features/auth-security-cicd.md)**:
  - Cặp token an toàn HttpOnly Cookie (AccessToken 1h, RefreshToken 7d), tự động làm mới ngầm (Silent Refresh).
  - Phòng chống Bot bằng Cloudflare Turnstile; đăng nhập mạng xã hội Firebase (Google/Facebook).
  - Khôi phục mật khẩu 4 bước qua Email OTP.
  - Hệ thống cổng kiểm soát chất lượng 2 tầng (Git Pre-Push Hook & GitHub Actions CI với Semgrep, Gitleaks, Memory leak test).

### 3. Tài Liệu Kỹ Thuật Chuyên Sâu
- 📄 **[Tài Liệu Kỹ Thuật MQTT & Thuật Toán Gợi Ý (docs/tai-lieu.md)](tai-lieu.md)**: Tài liệu đặc tả giao thức nhị phân MQTT và thuật toán định tuyến dữ liệu.

---

> 🔗 Quay lại trang chính: **[README.md](../README.md)**

