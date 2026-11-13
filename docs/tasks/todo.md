# Backlog ChatApp theo thứ tự ưu tiên

## T1 — Quan sát luồng nhận tin hai thiết bị (S)
- [ ] Ghi nhận connection ID, user ID đã ẩn danh, conversation ID và message ID tại gửi/broadcast/nhận; không log nội dung hay token.
- [ ] Kịch bản Android gửi → desktop chat nổi/toàn màn hình và chiều ngược lại xác nhận tin hiện trước reload.
- [ ] Đo số tin chỉ xuất hiện sau reconnect/reload, lỗi socket và độ trễ p95 trước khi sửa tiếp.

## T2 — Khôi phục tin bị lỡ và xác nhận gửi (M; sau T1)
- [ ] Reconnect/foreground đồng bộ theo cursor hoặc mốc tin cuối, gộp không trùng và không làm mất tin optimistic.
- [ ] Tin gửi lỗi có trạng thái rõ, nút thử lại và không tạo bản sao khi server đã lưu.
- [ ] Cả chat nổi và toàn màn hình cho cùng kết quả trong kiểm tra hai thiết bị; chạy frontend typecheck/lint/build và backend test khi chạm backend.

**Checkpoint:** Chỉ tiếp tục khi kịch bản Android ↔ desktop qua mất mạng ngắn và reload cho cùng lịch sử.

## T3 — Tìm tin trong một hội thoại (M; sau T2)
- [ ] API tìm theo text, phân trang, kiểm tra quyền thành viên và loại tin đã xóa.
- [ ] Kết quả có đoạn trích, người gửi, thời điểm; chọn kết quả mở đúng vị trí trong lịch sử.
- [ ] Hoạt động trên desktop/mobile; truy vấn được đo và có giới hạn dữ liệu trả về.

## T4 — Trả lời theo một tin (M; sau T2)
- [ ] Message lưu `replyToMessageId` hợp lệ cùng hội thoại; server kiểm tra quyền và tin gốc.
- [ ] Giao diện hiển thị trích dẫn và nhảy đến tin gốc; tin gốc bị xóa có trạng thái rõ.
- [ ] Event realtime cập nhật chat nổi, toàn màn hình và lịch sử sau reload.

## T5 — Chỉnh sửa tin văn bản đã gửi (M; sau T2)
- [ ] Chỉ tác giả sửa tin văn bản trong thời hạn sản phẩm chọn; lưu `editedAt` và kiểm tra quyền ở server.
- [ ] Người nhận thấy nội dung mới và nhãn đã chỉnh sửa mà không cần reload.
- [ ] Tin đã xóa hoặc ngoài thời hạn bị từ chối; hoạt động với hai thiết bị.

## T6 — Ghim tin trong hội thoại (M; sau T3)
- [ ] Dùng `pinnedMessageId` hiện có cho một tin mỗi hội thoại; xác định quyền ghim ở nhóm.
- [ ] Banner ghim dẫn đến tin; bỏ ghim và xóa tin gốc cập nhật realtime.
- [ ] Tin ghim vẫn đúng sau reload, trên desktop và mobile.

**Checkpoint:** Review UX, hiệu năng truy vấn, quyền truy cập và bản dịch sáu locale trước khi ưu tiên đợt tiếp theo.
