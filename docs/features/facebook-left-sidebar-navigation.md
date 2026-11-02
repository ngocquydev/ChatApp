# Giao diện Cột Điều Hướng Trái Chuẩn Facebook & Tối Ưu Header (Facebook-Style Left Sidebar & Header)

## 1. Tổng quan
Tính năng cập nhật cấu trúc điều hướng toàn diện cho ChatApp theo chuẩn giao diện mạng xã hội Facebook trên Desktop (`md` trở lên) và Mobile:
- **Cột điều hướng trái cố định (`LeftSidebar`):** Thay vì dồn ép tất cả các nút dạng chữ lên thanh tiêu đề trên cùng gây vỡ giao diện và tràn màn hình, hệ thống bố trí cột trái chuyên biệt hiển thị:
  - Thông tin tài khoản người dùng (Avatar + Họ tên).
  - Lối tắt Aura AI (kết nối nhanh với trợ lý ảo AI).
  - Bạn bè (`/explore`), Nhóm (`/groups`), Trang (`/pages`), Đoạn chat (`/chat`).
  - Danh mục mở rộng: Kỷ niệm, Đã lưu, Thước phim (`Xem thêm / Thu gọn`).
  - **Lối tắt của bạn:** Tự động lấy danh sách Hội nhóm đã tham gia và Fanpage đang theo dõi với avatar đại diện bo góc, liên kết trực tiếp.
  - Thông tin bản quyền, điều khoản dịch vụ và chính sách bảo mật.
- **Thanh Header Facebook-style gọn gàng:**
  - **Khu vực trung tâm:** Chuyển đổi thành các tab biểu tượng (Trang chủ, Khám phá, Nhóm, Trang) với chỉ báo gạch chân xanh dương khi active, hoàn toàn không bị tràn nút chữ.
  - **Khu vực bên phải:** Bố trí nút Lời mời kết bạn (kèm số lượng badge), nút Messenger / Đoạn chat (kèm popover danh sách trò chuyện gần đây), Chuông thông báo, Đổi ngôn ngữ (VI/EN), Chế độ sáng/tối và Menu tài khoản người dùng.
- **Khắc phục triệt để lỗi che nội dung:**
  - Đặt khoảng đệm trên `pt: "64px"` / `pt: "80px"` chuẩn cho tất cả các trang (`/groups`, `/pages`, `/groups/[slug]`, `/pages/[slug]`, `/`) để tiêu đề và ảnh bìa không bao giờ bị AppBar cố định che khuất.
- **Đồng bộ xóa cuộc hội thoại:**
  - Tối ưu hóa API xóa hội thoại và truy vấn `$nin: [userId]`, đảm bảo khi xóa cuộc hội thoại (kể cả hội thoại với Aura AI hay bạn bè), cuộc hội thoại sẽ biến mất vĩnh viễn và không bị tái hiện khi tải lại trang.

## 2. Hình ảnh minh họa

![Facebook Left Sidebar & Clean Header Navigation](../assets/screenshots/facebook-layout.png)
*Hình 1: Cột điều hướng bên trái chuẩn Facebook cùng thanh điều hướng trung tâm dạng icon tabs trên desktop.*

![Groups Page with Facebook Left Sidebar](../assets/screenshots/groups-facebook-layout.png)
*Hình 2: Trang Khám phá Hội nhóm (/groups) với cột bên trái và tiêu đề không bị che lấp.*

## 3. Kiến trúc kỹ thuật
- `frontend/src/components/layout/LeftSidebar.tsx`: Component sidebar chuẩn Facebook, responsive ẩn trên mobile và hiển thị trên desktop (`md:` 280px, `lg:` 320px, `xl:` 350px).
- `frontend/src/components/layout/AppBar.tsx`: Tách biệt `desktopTabs` dạng icon tabs và `drawerPages` cho mobile drawer, đưa Friend requests và Messenger ra cụm thao tác nhanh bên phải.
- `frontend/src/components/groups/GroupsExplore.tsx` & `frontend/src/components/pages/PagesExplore.tsx`: Bọc layout 2 cột với `LeftSidebar` và căn lề tự động theo kích thước màn hình.
- `backend/src/modules/chat/chat.service.ts`: Cập nhật logic xóa cuộc hội thoại triệt để với Aura AI bot và áp dụng `$nin` trên mảng `deletedByUsers`.

