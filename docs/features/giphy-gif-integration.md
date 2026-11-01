# Tích hợp GIPHY GIF & Bố cục Masonry (Bình luận & Tin nhắn)

Hệ thống tích hợp trực tiếp thư viện tìm kiếm ảnh động chuẩn quốc tế **GIPHY API (`@giphy/js-fetch-api`)** kết hợp bố cục thác nước đa cột **`react-masonry-css`**, cho phép người dùng tìm kiếm, xem trước và gửi ảnh GIF mượt mà trên cả **Bình luận bài viết (Comments)** và **Hệ thống tin nhắn trò chuyện (Chat Messages & Floating Chat)**.

---

## 1. Công nghệ & Thư viện sử dụng

- **`@giphy/js-fetch-api`**: Bộ SDK chính thức từ GIPHY hỗ trợ truy vấn các endpoints `trending` và `search` với xếp hạng nội dung an toàn (`rating: "g"`).
- **`react-masonry-css`**: Bố cục thác nước (Masonry Grid) 2 cột tối ưu cho hình ảnh GIF có tỷ lệ khung hình và chiều cao đa dạng, tự động lấp đầy khoảng trống mà không bị giật layout.
- **Material UI (MUI v9)**: Thiết kế giao diện hộp chọn Popover bo tròn 16px, đổ bóng mềm mại, đồng bộ 100% theme Sáng / Tối (Light / Dark Mode) qua Design Tokens (`var(--mui-palette-...)`).

---

## 2. Tính năng & Trải nghiệm Người dùng

### 2.1. Hộp chọn GIF Thông minh (`AppGiphyPicker`)
- **Tự động nạp GIF xu hướng:** Khi mở hộp chọn, hệ thống tự động tải danh sách ảnh GIF thịnh hành nhất hiện tại.
- **Thanh tìm kiếm tức thì:** Tìm kiếm theo từ khóa có cơ chế hoãn nhịp (Debounce 350ms) và nút xóa nhanh 1-chạm (`X`).
- **Dải thẻ danh mục nhanh (Quick Category Chips):**
  - 🔥 Xu hướng (Trending)
  - 😂 Haha
  - ❤️ Yêu thích (Love)
  - 🥰 Dễ thương (Cute)
  - 😮 Biểu cảm (Reaction)
  - 👏 Vỗ tay (Applause)
  - 😢 Buồn (Sad)
  - 💃 Nhảy múa (Dance)
  - 🐱 Mèo (Cat)
- **Cuộn vô hạn (Infinite Scroll):** Tự động tải tiếp 20 ảnh GIF khi người dùng cuộn xuống gần cuối danh sách.
- **Huy hiệu bản quyền chuẩn GIPHY:** Tuân thủ điều khoản GIPHY API với nhãn "Powered by GIPHY".

### 2.2. Bình luận Bài viết (Comments)
- Tích hợp nút **`GIF`** vuông viền màu chủ đạo ngay cạnh nút đính kèm ảnh trên khung soạn thảo bình luận (`CommentComposer`).
- Khi chọn ảnh GIF:
  - Hiển thị ảnh xem trước bo góc 12px kèm nút hủy đính kèm (`X`).
  - Cho phép vừa viết nội dung bình luận vừa gửi kèm ảnh GIF.
  - Bình luận hiển thị ảnh GIF động chất lượng cao kèm huy hiệu **`GIF`** ở góc ảnh và hỗ trợ phóng to toàn màn hình với Lightbox.

### 2.3. Khung Chat Trực tuyến (ChatApp & Floating Chat Box)
- Tích hợp nút **`GIF`** phong cách Messenger trên thanh công cụ soạn tin của cả trang Chat chính (`/chat`) và Hộp chat nổi (`FloatingChatBox`).
- Khi nhấn chọn bất kỳ ảnh GIF nào trong bảng chọn: tin nhắn GIF được gửi đi ngay lập tức.
- Bong bóng tin nhắn tự động nhận diện URL GIPHY (`media.giphy.com`), hiển thị dưới dạng ảnh GIF động sắc nét kèm huy hiệu **`GIF`** ở góc, tương thích hoàn hảo với bộ 7 cảm xúc Facebook và Lightbox phóng to.

---

## 3. Cấu hình & Biến môi trường

Khai báo trong `frontend/.env` (hoặc `.env.local`):
```env
NEXT_PUBLIC_GIPHY_API_KEY=HtWiX1xoMLhJ0C2mmP1BXRbUSKeAOIHI
```
Code client được cấu hình tự động dự phòng về API key mặc định, đảm bảo hoạt động ngay lập tức mà không cần khởi động lại máy chủ.
