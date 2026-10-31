# Tính năng Chia sẻ Vị trí Thời gian thực (Live Location Sharing)

> Mô phỏng trải nghiệm chia sẻ vị trí trực tiếp cao cấp tương tự Zalo, Telegram và WhatsApp trong cuộc hội thoại chat.

---

## 1. Tổng quan & Trải nghiệm Người dùng (UX)

Khi người dùng mở tính năng chia sẻ vị trí trong cuộc trò chuyện (thông qua icon ghim vị trí hoặc menu đính kèm), hệ thống cho phép lựa chọn linh hoạt giữa hai chế độ:

1. **Gửi vị trí đã ghim (Static Pinned Location):** Gửi tọa độ tĩnh kèm tên địa điểm và địa chỉ chi tiết.
2. **Chia sẻ trực tiếp (Live Location - Thời gian thực):** Phát sóng tọa độ di chuyển theo thời gian thực của người dùng tới bạn bè trong cuộc hội thoại.

### Thời lượng chia sẻ tùy chọn
Người dùng có thể chọn một trong các mốc thời gian:
- **15 phút:** Thích hợp khi đang hẹn gặp, đón bạn bè ở cự ly gần.
- **1 giờ:** Thích hợp khi di chuyển ngoài đường, đi lại trong thành phố.
- **8 giờ:** Thích hợp cho chuyến đi xa, hành trình dài.
- **1 ngày:** Thích hợp khi đi công tác, du lịch cả ngày.

> [!NOTE]
> Danh sách mốc và cách hiển thị nhãn / đếm ngược dùng chung trong `frontend/src/utils/liveLocation.ts` (`LIVE_DURATION_OPTIONS`, `formatLiveDuration`, `formatLiveRemaining`).

### Bố cục hộp thoại chọn vị trí
- Thanh chọn thời lượng (`LiveDurationSelector`) nằm **ngay dưới tab chế độ**, ngoài vùng cuộn — luôn nhìn thấy, không phải cuộn qua bản đồ.
- Bản đồ trong hộp thoại **tắt zoom bằng con lăn** cho tới khi người dùng nhấp vào bản đồ (tắt lại khi rời chuột) → cuộn trang không vô tình phóng to/thu nhỏ map. Vẫn zoom được bằng nút `+ / −`.

---

## 2. Giao diện Thẻ Tin nhắn Vị trí Trực tiếp

Mỗi thẻ tin nhắn vị trí trực tiếp trong khung chat được thiết kế hiện đại và trực quan:

- **Huy hiệu Radar Trực tiếp:** Chấm tròn xanh phát xung nhịp sóng radar (`badgePulse` & `miniRadarPulse`) kèm đồng hồ đếm ngược chính xác theo thời gian thực (vd: `TRỰC TIẾP • Còn 14 phút`).
- **Bản đồ Thu nhỏ Động (Mini-map):** Sử dụng Leaflet & OpenStreetMap với điểm phát sóng định vị đa tầng (vòng hào quang xanh lan tỏa + tâm định vị). Khi người dùng di chuyển, marker tự động lướt đến tọa độ mới và bản đồ tự căn giữa mượt mà không gây giật khung hình.
- **Nút "Dừng chia sẻ":** Dành riêng cho người phát sóng, cho phép ngắt kết nối và dừng truyền tọa độ ngay lập tức chỉ với 1 chạm.
- **Nút "Xem trực tiếp":** Mở bản đồ tương tác toàn màn hình kèm chế độ tự động bám theo (Auto-follow mode).
- **Nút "Chỉ đường":** Chuyển hướng trực tiếp sang Google Maps dẫn đường chính xác từ vị trí hiện tại đến đối phương.

---

## 3. Kiến trúc Kỹ thuật (Technical Architecture)

```
┌─────────────────────────────────┐
│ Browser (Navigator Geolocation) │
└──────────────┬──────────────────┘
               │ 4s Throttled Watcher
┌──────────────▼──────────────────┐
│ liveLocationTracker.ts          │
└──────────────┬──────────────────┘
               │ Socket.IO emit 'location:live_update'
┌──────────────▼──────────────────┐
│ NestJS Backend Gateway          │
│ (ChatGateway & ChatService)     │
└──────────────┬──────────────────┘
               │ Socket.IO broadcast 'location:live_updated'
┌──────────────▼──────────────────┐
│ Receiver / Partner Chat Screen  │
│ (Smooth Marker pan & update)    │
└─────────────────────────────────┘
```

### Frontend
- **`liveLocationTracker.ts`:** Dịch vụ Singleton quản lý `navigator.geolocation.watchPosition` với cơ chế throttle 4 giây, giúp tiết kiệm pin thiết bị di động và tối ưu băng thông mạng.
- **`useChatStore.ts`:** Quản lý state vị trí trực tiếp, xử lý action `updateLiveLocation` và `stopLiveLocation`, lắng nghe sự kiện socket `location:live_updated` để cập nhật tin nhắn trong store.
- **`LocationPickerModal.tsx`:** Modal chọn chế độ ghim vị trí hoặc chia sẻ trực tiếp kèm chọn thời lượng chia sẻ.
- **`LocationMessageItem.tsx`:** Hiển thị thẻ tin nhắn trong chat bubble, đếm ngược thời gian thực, điều khiển dừng chia sẻ và mini-map marker animation.
- **`LocationViewModal.tsx`:** Trình xem bản đồ chi tiết với tính năng `Auto-follow` (tự động căn giữa theo bước di chuyển).

### Backend
- **`message.schema.ts`:** Bổ sung các trường siêu dữ liệu vị trí:
  - `isLive?: boolean`: Đánh dấu tin nhắn là vị trí trực tiếp.
  - `liveExpiresAt?: Date`: Mốc thời gian hết hạn chia sẻ.
  - `isLiveActive?: boolean`: Trạng thái chia sẻ còn hoạt động hay đã bị người dùng chủ động ngắt.
- **`chat.service.ts`:** Cập nhật hàm `updateLiveLocation(messageId, senderId, update)` kiểm tra tính hợp lệ và cập nhật tọa độ trong MongoDB.
- **`chat.gateway.ts`:** Lắng nghe socket event `location:live_update` và phát sóng `location:live_updated` tức thì cho các thành viên trong cuộc trò chuyện.

---

## 4. Bảo mật & Quyền Riêng tư (Security & Privacy)

- **Quyền kiểm soát thuộc về người gửi:** Người gửi có thể bấm "Dừng chia sẻ" bất kỳ lúc nào để chấm dứt truyền tọa độ ngay lập tức.
- **Tự động hết hạn (Auto-expire):** Khi hết thời gian đã chọn (15m, 1h, 8h, 1 ngày), hệ thống tự động chuyển trạng thái sang `ĐÃ DỪNG CHIA SẺ`, ngừng theo dõi Geolocation và khóa luồng gửi tọa độ.
- **Bảo mật dữ liệu:** Chỉ thành viên trong phòng chat / cuộc hội thoại mới được nhận bản tin vị trí thời gian thực.

