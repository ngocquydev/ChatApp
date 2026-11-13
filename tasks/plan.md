# Kế hoạch phát triển ChatApp

## Mục tiêu và giả định

Ưu tiên người dùng chat trên web desktop và trình duyệt Android. Mục tiêu đầu tiên là tin nhắn xuất hiện ổn định trên mọi thiết bị; sau đó giúp tìm và xử lý nội dung trong hội thoại. Đây là đề xuất để chọn phạm vi, chưa phải cam kết lịch phát hành. Không thay đổi mô hình bảo mật hay thêm tính năng AI trong đợt đầu.

## Hiện trạng

Repo đã có chat 1:1/nhóm, Socket.IO, trạng thái đang gõ/đã đọc, GIF, tệp, vị trí trực tiếp, gọi điện và AI. Sự cố nhận tin trên Android/desktop từng phải reload; client hiện có đồng bộ khi socket nối lại nhưng cần chứng minh luồng hai thiết bị. `Conversation` đã có `pinnedMessageId`, chưa thấy luồng ghim hoàn chỉnh. Chưa thấy tìm kiếm nội dung tin nhắn, trả lời theo tin, hay chỉnh sửa tin đã gửi trong module chat.

## Thứ tự và ranh giới kỹ thuật

1. Củng cố nền realtime trước: kiểm tra sender/receiver, reconnect và đồng bộ tin bị lỡ. Đây là điều kiện để các trạng thái mới không lệch giữa thiết bị.
2. Tìm trong hội thoại bằng truy vấn phía server, phân trang và nhảy đến tin được chọn. Không tải toàn bộ lịch sử lên browser.
3. Trả lời theo tin bằng tham chiếu message ID; sau đó chỉnh sửa tin văn bản với thời hạn và nhãn đã chỉnh sửa.
4. Ghim tin quan trọng dùng schema sẵn có, rồi bổ sung nhắc việc/đánh dấu để quay lại sau nếu người dùng cần.

Mỗi lát gồm DTO/validation và quyền truy cập ở backend, event Socket.IO, cập nhật cả chat toàn màn hình lẫn cửa sổ nổi, bản dịch sáu locale và tài liệu. Làm việc trên branch riêng; không tự động push hay deploy khi triển khai từng lát.

## Task index

Xem `tasks/todo.md`. Mỗi task có tiêu chí nghiệm thu và cách xác minh. Sau T2, đánh giá số liệu lỗi nhận tin và mức ưu tiên trước khi làm T3.

## Rủi ro và quyết định cần xác nhận

- Nếu backend chạy nhiều instance, room Socket.IO cần adapter dùng chung; kiểm tra cấu hình production trước khi chọn giải pháp.
- Tìm kiếm phải tôn trọng quyền thành viên, tin đã xóa, giới hạn kết quả và index MongoDB. Đo truy vấn trước khi thêm index.
- Trả lời/chỉnh sửa phải đồng bộ trên cả hai giao diện chat và xử lý tin gốc bị xóa.
- Chưa rõ mục tiêu là người dùng cá nhân hay nhóm làm việc. Mặc định ưu tiên chat cá nhân; đổi thứ tự nếu sản phẩm tập trung vào nhóm.

## Tham khảo sản phẩm

Các ứng dụng chat lớn hỗ trợ ghim tin, chỉnh sửa tin có giới hạn thời gian và tìm theo người/ngày/nội dung. Các ý này chỉ dùng làm tham chiếu UX; thiết kế cụ thể theo ChatApp.
