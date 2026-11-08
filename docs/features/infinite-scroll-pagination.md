# Phân trang & Cuộn vô hạn (5 mục ban đầu + Cuộn tải tiếp)

## 1. Giới thiệu
Tối ưu hóa trải nghiệm người dùng (UX) và hiệu năng hiển thị (UI rendering performance) cho các danh sách có nhiều phần tử:
- **Thông báo (Notifications Popover)**: Chỉ render tối đa 5 thông báo mới nhất khi mở dropdown. Khi người dùng cuộn xuống gần cuối danh sách trong popover, hệ thống tự động render/tải thêm 5 thông báo tiếp theo.
- **Bình luận bài viết (Post Comments)**: Chỉ render tối đa 5 bình luận đầu tiên dưới mỗi bài viết. Khi người dùng cuộn xuống (hoặc tương tác tới mốc cuối), hệ thống tự động hiển thị tiếp 5 bình luận hoặc tự động gọi API lấy thêm từ máy chủ backend qua cursor pagination (`after`).

## 2. Hình ảnh Demo

### Thông báo (Notification Dropdown)
![Notification Dropdown Pagination](../assets/screenshots/notifications-dropdown-pagination.png)

### Bình luận bài viết (Post Comments Infinite Scroll)
![Post Comments Infinite Scroll](../assets/screenshots/post-comments-infinite-scroll.png)

## 3. Kiến trúc kỹ thuật

### 3.1. Phía Thông báo (`NotificationBell.tsx` + `useNotificationStore.ts`)
- Hằng số `NOTIFICATION_PAGE_SIZE = 5`.
- `fetchNotifications`: Gọi API `fetchNotificationsApi({ limit: 5 })` khi mở popover.
- Cắt lát hiển thị: `notifications.slice(0, visibleCount)` (ban đầu `visibleCount = 5`).
- Sự kiện `onScroll`: Theo dõi khoảng cách `scrollHeight - scrollTop - clientHeight <= 80px`:
  - Nếu trong store còn mục chưa hiển thị: Nâng `visibleCount += 5`.
  - Nếu đã hiển thị hết danh sách cục bộ và `hasMore = true`: Tự động gọi `loadMore()` với `limit: 5`.
  - Hiển thị spinner `CircularProgress` ở cuối khi đang tải thêm.
  - Reset `visibleCount = 5` khi đóng popover.

### 3.2. Phía Bình luận (`PostCommentSection.tsx`)
- Hằng số `COMMENT_PAGE_SIZE = 5`.
- Hook `usePagedList`: Phân trang theo con trỏ với `limit: 5`.
- Khung cuộn độc lập (`maxHeight: 350px`, `overflowY: "auto"`): Có scrollbar tùy biến, cho phép cuộn trực tiếp bên trong danh sách bình luận mà không làm phình dài thẻ bài viết.
- **Khung tải bình luận phong cách Facebook (`FacebookCommentSkeleton`)**: Hiển thị avatar tròn (28px), bong bóng bình luận bo tròn (`borderRadius: 14px`) và dòng tác vụ (Thích · Phản hồi · Thời gian) cùng hiệu ứng sóng (`wave`) khi cuộn hoặc tải thêm bình luận, mô phỏng hoàn hảo trải nghiệm Facebook.
- Quản lý trạng thái `visibleCount`: Chỉ hiển thị `COMMENT_PAGE_SIZE` bình luận ban đầu, nâng từng đợt nghiêm ngặt 5 mục khi cuộn xuống.
- Hook `useInfiniteSentinel`: Tích hợp `IntersectionObserver` tại mốc cuối danh sách bình luận đã render (`sentinelRef`). Khi mốc này xuất hiện trong tầm nhìn người dùng:
  - Tự động kích hoạt hiệu ứng tải Facebook skeleton và hiển thị 5 bình luận tiếp theo nếu đã nạp trong bộ nhớ.
  - Tự động gọi `list.loadMore()` nếu còn dữ liệu trên máy chủ.
  - Đảm bảo khi người dùng tự đăng bình luận mới, bình luận đó ngay lập tức hiển thị đầy đủ.

### 3.3. Đa ngôn ngữ (i18n)
Bổ sung đầy đủ nhãn ngôn ngữ trên cả 6 ngôn ngữ chính thức:
- Tiếng Việt (`vi`)
- English (`en`)
- 简体中文 (`zh-CN`)
- 繁體中文 (`zh-TW`)
- 한국어 (`ko`)
- ไทย (`th`)
