# 💬 TÍNH NĂNG NHẮN TIN THỜI GIAN THỰC & HỘP CHAT NỔI MESSENGER

Cuộc gọi video 1-1 chỉ bắt đầu sau khi trình duyệt cấp quyền camera và micro và đã lấy được cả hai luồng. Nếu quyền bị chặn hoặc thiết bị không khả dụng, màn hình cuộc gọi báo lỗi để người dùng kiểm tra quyền trong trình duyệt và gọi lại.

> Tài liệu mô tả kết nối Socket.IO, payload tin nhắn Protocol Buffers dạng nhị phân và trải nghiệm hộp chat nổi.

---

## 📑 MỤC LỤC
1. [Tổng Quan Trải Nghiệm Chat](#1-tổng-quan-trải-nghiệm-chat)
2. [Hình Ảnh Minh Họa Thực Tế](#2-hình-ảnh-minh-họa-thực-tế)
3. [Kiến Trúc Kỹ Thuật Đa Tầng (Dual-Engine)](#3-kiến-trúc-kỹ-thuật-đa-tầng-dual-engine)
4. [Giao Thức Nhị Phân Binary Socket.IO & Protobuf](#4-giao-thức-nhị-phân-binary-socket--protobuf)
5. [Các Tính Năng Bảo Mật & Quyền Riêng Tư](#5-các-tính-năng-bảo-mật--quyền-riêng-tư)
6. [Cơ Chế Chỉ Báo Đang Soạn Tin (Typing Indicator)](#6-cơ-chế-chỉ-báo-đang-soạn-tin-typing-indicator)
7. [Chia Sẻ Vị Trí & Bản Đồ Tương Tác (Location Sharing)](#7-chia-sẻ-vị-trí--bản-đồ-tương-tác-location-sharing)

---

## 1. TỔNG QUAN TRẢI NGHIỆM CHAT

Hệ thống cung cấp trải nghiệm nhắn tin toàn diện, liền mạch trên mọi thiết bị (Desktop, Tablet, Mobile) với 3 hình thức sử dụng:
- **Cửa sổ chat nổi đa nhiệm (Floating Chat Dock):** Cho phép mở nhiều hộp thoại chat cùng lúc ở góc dưới bên phải màn hình. Người dùng có thể vừa lướt Bảng tin hay xem Trang cá nhân vừa trò chuyện mà không bị gián đoạn.
- **Menu tin nhắn nhanh (AppBar Dropdown):** Truy cập nhanh các tin nhắn gần đây, lọc hội thoại chưa đọc, tìm kiếm bạn bè và xem trước tin nhắn mới nhất trực tiếp trên thanh điều hướng.
- **Trang tin nhắn độc lập (`/chat`):** Giao diện tập trung toàn màn hình cho phép quản lý chi tiết danh sách hội thoại, tùy biến chủ đề, tìm kiếm nội dung và duyệt media.

---

## 2. HÌNH ẢNH MINH HỌA THỰC TẾ

### 2.1. Hộp thoại chat nổi đa nhiệm phong cách Facebook
![Floating Chat Window](../assets/screenshots/messenger-floating-chat.png)
*Giao diện hộp chat nổi với thanh điều khiển thu nhỏ/đóng, ảnh đại diện đối phương, ô nhập liệu thông minh và trạng thái tin nhắn tức thời.*

### 2.2. Chi tiết luồng trò chuyện & Chủ đề đa sắc màu
![Chat Thread View](../assets/screenshots/messenger-chat-thread.png)
*Luồng tin nhắn trực quan với bong bóng chat bo góc công thái học, hiển thị thời gian thông minh và các nút thao tác nhanh.*

### 2.3. Menu thả xuống Danh sách tin nhắn trên Header
![Messenger Popover Dropdown](../assets/screenshots/messenger-popover-dropdown.png)
*Dropdown tin nhắn nhanh phong cách Facebook Messenger trên thanh Header với công cụ tìm kiếm và lọc hội thoại.*

---

## 3. KIẾN TRÚC REALTIME

ChatApp sử dụng Socket.IO qua WebSocket trên cổng backend 3000. Tin nhắn realtime
được mã hóa bằng Protocol Buffers thành payload nhị phân cho các sự kiện
`message:send:binary` và `message:new:binary`. Backend xác thực phiên WebSocket,
kiểm tra DTO sau khi giải mã, lưu MongoDB rồi gửi cho người tham gia hội thoại.
Khi Socket.IO chưa kết nối, ứng dụng dùng REST API để gửi tin nhắn; backend vẫn phát
`message:new:binary` tới người nhận đang kết nối. Typing,
read/seen và presence dùng các sự kiện Socket.IO hiện có. Kết nối công khai
cần HTTPS/WSS qua reverse proxy.

Frontend gửi access token đang giữ trong bộ nhớ qua `handshake.auth.token` ở mỗi
lần kết nối Socket.IO. Cookie vẫn được gửi khi trình duyệt cho phép. Cách này giúp
kết nối Vercel → Render xác thực được khi cookie bên thứ ba bị chặn.
Khi backend chủ động ngắt socket vì access token hết hạn, frontend gọi
`/auth/refresh`, cập nhật token trong bộ nhớ rồi kết nối lại. Lần kết nối mới
đồng bộ lịch sử của hội thoại đang mở để lấy các tin bị lỡ.

## 4. GIAO THỨC NHỊ PHÂN PROTOBUF

Schema `SendMessageProto` và `ChatMessageProto` được khai báo ở cả frontend và
backend trong `src/proto/chat.proto.ts`. Socket.IO gửi dữ liệu dưới dạng
`Uint8Array`/`Buffer`. Phần quản lý sự kiện của Socket.IO vẫn có framing riêng;
chỉ payload tin nhắn được mã hóa Protobuf.

## 5. CÁC TÍNH NĂNG BẢO MẬT & QUYỀN RIÊNG TƯ

### 5.1. Thu hồi tin nhắn thời gian thực (Unsend / Delete Message)
- Người dùng có thể thu hồi tin nhắn đã gửi của chính mình bất kỳ lúc nào.
- Thao tác yêu cầu xác nhận qua `ConfirmDialog` nhằm tránh bấm nhầm.
- Phía backend cập nhật trường `isDeleted = true` trong cơ sở dữ liệu và phát sự kiện `message:deleted` tới toàn bộ người tham gia phòng chat để đồng bộ hiển thị nội dung *"Tin nhắn đã bị thu hồi"*.

### 5.2. Chế độ Hạn chế người dùng (Restrict Mode kiểu Facebook Messenger)
- Cho phép người dùng hạn chế một người khác mà đối phương **hoàn toàn không hay biết**.
- Khi đã bị hạn chế:
  - Trạng thái *"Đã xem"* của bạn sẽ không bao giờ được gửi tới người bị hạn chế dù bạn đã đọc tin nhắn của họ.
  - Ẩn hoàn toàn trạng thái Online/Offline của bạn đối với người đó.
  - Cuộc trò chuyện được tách riêng vào mục danh sách *"Bị hạn chế"* để giữ hộp thư chính luôn sạch sẽ.

### 5.3. Chặn & Bỏ chặn (Block / Unblock)
- Ngăn chặn triệt để hành vi gửi tin nhắn từ cả hai chiều.
- Hiển thị thanh cảnh báo trực quan trên đầu cuộc trò chuyện kèm nút "Bỏ chặn" thuận tiện khi cần kết nối lại.

### 5.4. Tùy biến Chủ đề & Hình nền hội thoại (Chat Themes)
Hỗ trợ 5 bảng màu chủ đề sống động:
1. **Mặc định:** Tông màu xanh thương hiệu hiện đại.
2. **Hẹn hò lãng mạn:** Sắc hồng tím ngọt ngào.
3. **Bầu trời trong xanh:** Gam màu lam dịu mát.
4. **Bóng đêm huyền bí:** Sắc xám đen ánh tím sang trọng.
5. **Biển cả tươi mát:** Sắc ngọc bích tràn đầy năng lượng.
*Tất cả chủ đề đều đồng bộ thời gian thực qua WebSocket, tự động áp dụng cho cả hai bên người dùng.*

---

## 6. CƠ CHẾ CHỈ BÁO ĐANG SOẠN TIN (TYPING INDICATOR)

Để giải quyết triệt để lỗi "đang gõ bị biến mất sau vài giây" phổ biến trong các ứng dụng chat, hệ thống áp dụng cơ chế 3 lớp:
1. **Heartbeat định kỳ 2.5s:** Trong lúc người dùng liên tục gõ phím, client gửi nhịp tim `isTyping = true` mỗi 2.5 giây một lần.
2. **Cửa sổ ngừng gõ 5.0s:** Khi người dùng dừng gõ đủ 5 giây, client mới gửi tín hiệu `isTyping = false`.
3. **Bộ đếm tự hủy an toàn 6.5s:** Nếu đối phương bị mất mạng đột ngột giữa chừng, bộ đếm tại client người nhận sẽ tự động tắt chỉ báo sau 6.5 giây mà không bị treo vĩnh viễn.

---

## 7. CHIA SẺ VỊ TRÍ & BẢN ĐỒ TƯƠNG TÁC (LOCATION SHARING)

Nhằm hỗ trợ nhu cầu hẹn gặp gỡ, giao nhận và chia sẻ địa điểm thực tế giữa người dùng, hệ thống tích hợp giải pháp **Chia sẻ Vị trí tĩnh qua Bản đồ tương tác (Static Location Sharing)**:

### 7.1. Công nghệ & Lựa chọn Kiến trúc
- **Leaflet & OpenStreetMap:** Sử dụng 100% giải pháp mã nguồn mở không mất phí bản quyền, không yêu cầu thẻ tín dụng hoặc token API bị giới hạn hạn mức (khắc phục điểm nghẽn chi phí lớn của Google Maps Platform).
- **Reverse Geocoding (OpenStreetMap Nominatim):** Tự động chuyển đổi tọa độ địa lý `[latitude, longitude]` thành tên đường, quận/huyện, tỉnh/thành phố chi tiết và trực quan theo thời gian thực.
- **Tương thích toàn diện:** Hoạt động liền mạch trên cả giao diện chat chính (`/chat`) và Cửa sổ chat nổi đa nhiệm (`FloatingChatBox`).

### 7.2. Quy trình Trải nghiệm Người dùng
1. **Khởi tạo Chia sẻ Vị trí:** Bấm vào biểu tượng ghim vị trí (`MapPin`) trên thanh công cụ soạn tin nhắn.
2. **Modal Chọn Vị trí (`LocationPickerModal`):**
   - Tự động kích hoạt HTML5 Geolocation API để định vị vị trí thiết bị hiện tại của người dùng.
   - Cho phép nhấp chuột hoặc kéo rê ghim đỏ trên bản đồ để chọn bất kỳ tọa độ mong muốn nào.
   - Thanh tìm kiếm địa danh tức thì qua Nominatim API: gõ địa chỉ hoặc địa điểm nổi tiếng để bản đồ tự động bay tới vị trí đó.
   - Hiển thị nhãn tọa độ (`lat, lng`) và thẻ địa chỉ xem trước.
3. **Gửi & Lưu trữ Dữ liệu Tin nhắn:**
   - Gói tin nhắn vị trí được lưu trữ với cấu trúc `LocationData`: `{ lat, lng, address, name? }` và kiểu tin nhắn `type: "location"`.
   - Tin nhắn cuối cùng trong danh sách hội thoại hiển thị preview định dạng `📍 [Tên địa điểm / Địa chỉ]`.
4. **Hiển thị Thẻ Tin nhắn Vị trí (`LocationMessageItem`):**
   - Thẻ tin nhắn bo tròn công thái học với bản đồ vệ tinh/giao thông thu nhỏ.
   - Nút **"Xem bản đồ"**: Mở modal tương tác toàn màn hình (`LocationViewModal`) cho phép phóng to, thu nhỏ, sao chép tọa độ.
   - Nút **"Chỉ đường"**: Mở liên kết ngoài trực tiếp tới Google Maps Directions (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`) giúp bạn bè di chuyển đến địa điểm nhanh chóng.


