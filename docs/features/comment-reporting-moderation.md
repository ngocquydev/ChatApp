# Tính năng Báo cáo Bình luận & Kiểm duyệt Hội nhóm (Comment Reporting & Moderation)

## 1. Giới thiệu tổng quan

Hệ thống cho phép người dùng báo cáo các bình luận vi phạm tiêu chuẩn cộng đồng (spam, công kích cá nhân, ngôn từ thù ghét, bạo lực hoặc nội dung phản cảm).
Điểm đặc biệt của tính năng là cơ chế **Điều hướng báo cáo thông minh (Smart Report Routing)**:
- **Trong Hội nhóm (Community Group)**: Người dùng có thể chủ động lựa chọn gửi báo cáo tới:
  1. **Ban Quản trị Nhóm (`group_admin`)**: Trưởng nhóm và Phó nhóm có thể trực tiếp xử lý vi phạm trong phạm vi nhóm mình quản lý.
  2. **Admin Hệ thống (`web_admin`)**: Ban quản trị web cấp cao xử lý các vi phạm nghiêm trọng trên toàn nền tảng.
- **Ngoài Hội nhóm (Dòng thời gian, trang cá nhân)**: Báo cáo được tự động chuyển trực tiếp tới Ban Quản trị Web.

---

## 2. Luồng hoạt động & Quy trình xử lý

### 2.1. Phía người dùng (Gửi báo cáo)
1. Tại mỗi bình luận không thuộc sở hữu của mình, người dùng thấy nút biểu tượng cờ báo cáo (**Flag**).
2. Khi nhấn nút, hộp thoại `ReportCommentDialog` hiển thị:
   - Nếu bình luận nằm trong hội nhóm: Hiển thị tùy chọn lựa chọn nơi nhận (**Ban Quản trị Nhóm** hoặc **Admin Web**).
   - Chọn lý do báo cáo: *Spam*, *Quấy rối / Công kích*, *Ngôn từ thù ghét*, *Nội dung phản cảm*, *Khác*.
   - Nhập chi tiết / giải thích thêm (tùy chọn).
3. Hệ thống kiểm tra hợp lệ:
   - Ngăn chặn tự báo cáo chính mình.
   - Ngăn chặn gửi trùng lặp nhiều báo cáo khi báo cáo cũ chưa được xử lý.
   - Ghi nhận thông tin người báo cáo, tác giả bình luận, nội dung tại thời điểm báo cáo và ngữ cảnh nhóm.

### 2.2. Phía Ban Quản trị Nhóm (Trưởng nhóm / Phó nhóm)
- Truy cập Cổng quản lý nhóm: `/groups/[slug]/manage` -> Tab **Báo cáo bình luận**.
- Hiển thị danh sách báo cáo với bộ lọc trạng thái: *Tất cả*, *Chờ xử lý*, *Đã xử lý*, *Đã bỏ qua*.
- BQT nhóm có các công cụ xử lý nhanh:
  - **Bỏ qua (Dismiss)**: Báo cáo không vi phạm, đánh dấu đã duyệt bỏ qua.
  - **Xóa bình luận (Delete Comment)**: Xóa vĩnh viễn bình luận khỏi bài viết và cơ sở dữ liệu.
  - **Khóa bình luận (Mute User)**: Tước quyền bình luận của thành viên vi phạm trong nhóm.
  - **Chặn đăng bài (Block Posting)**: Khóa quyền đăng bài mới của thành viên vi phạm trong nhóm.
  - **Xóa khỏi nhóm (Remove / Ban Member)**: Đuổi và tước tư cách thành viên khỏi nhóm.
- Mỗi hành động đều cho phép đính kèm ghi chú xử lý để lưu vết kiểm duyệt (Audit Log).

### 2.3. Phía Quản trị viên Web (Platform Admin Portal)
- Truy cập Cổng Admin: `/moderation` -> Tab **Báo cáo bình luận (Reported Comments)**.
- Quản trị viên web có thể lọc theo nơi tiếp nhận (`web_admin` hoặc `group_admin`) và trạng thái.
- Thực hiện xử lý, gỡ bỏ vi phạm hoặc áp dụng chế tài tài khoản trên quy mô toàn hệ thống.

---

## 3. Kiến trúc API & Mô hình Dữ liệu

### 3.1. Schema `CommentReport`
- `commentId`: ID bình luận bị báo cáo.
- `postId`: ID bài viết chứa bình luận.
- `reporterId`: ID người gửi báo cáo.
- `commentAuthorId`: ID tác giả bình luận.
- `commentContent`: Nội dung bình luận được sao lưu tại thời điểm báo cáo.
- `groupId`: ID nhóm cộng đồng (nếu thuộc nhóm).
- `target`: `'group_admin' | 'web_admin'`.
- `reason`: `'spam' | 'harassment' | 'hate_speech' | 'violence' | 'inappropriate' | 'other'`.
- `details`: Ghi chú bổ sung từ người báo cáo.
- `status`: `'pending' | 'resolved' | 'dismissed'`.
- `resolvedBy`: ID quản trị viên xử lý báo cáo.
- `actionTaken`: Hành động xử lý vi phạm đã thi hành.
- `resolutionNote`: Ghi chú lý do xử lý của BQT.

### 3.2. Danh sách Endpoints
- `POST /posts/comments/:commentId/report`: Người dùng gửi báo cáo bình luận.
- `GET /community-groups/:id/comment-reports`: Lấy danh sách báo cáo trong nhóm (cho BQT nhóm).
- `POST /community-groups/:id/comment-reports/:reportId/resolve`: BQT nhóm xử lý báo cáo.
- `GET /admin/comment-reports`: Lấy danh sách báo cáo trên toàn hệ thống (cho Web Admin).
- `POST /admin/comment-reports/:id/resolve`: Web Admin xử lý báo cáo.

---

## 4. Hỗ trợ Đa ngôn ngữ (6 Ngôn ngữ)
Tính năng được bản địa hóa 100% đầy đủ trên cả 6 ngôn ngữ của nền tảng:
- 🇻🇳 **Tiếng Việt (`vi`)**
- 🇺🇸 **English (`en`)**
- 🇨🇳 **简体中文 (`zh-CN`)**
- 🇹🇼 **繁體中文 (`zh-TW`)**
- 🇰🇷 **한국어 (`ko`)**
- 🇹🇭 **ไทย (`th`)**

