# Tái Thiết Kế Toàn Diện Hội Nhóm Cộng Đồng (Facebook-Style Community Groups Revamp)

> **Mô hình kiến trúc module hóa:** Tách nhỏ toàn bộ component đảm bảo **100% số file < 250 dòng code**, chuẩn hóa Design System (0 hardcoded hex/rgb), hỗ trợ trọn vẹn **6 ngôn ngữ** (`vi`, `en`, `zh-CN`, `zh-TW`, `ko`, `th`), và tối ưu trải nghiệm người dùng chuẩn Facebook Groups.

---

## 1. Giới thiệu & Mục tiêu

Tính năng Hội nhóm Cộng đồng (Community Groups) đã được đại tu toàn diện để mang lại trải nghiệm tương tác trực quan, chuyên nghiệp theo tiêu chuẩn Facebook Groups:
- **Ảnh bìa & Avatar chồng lớp (Overlapping Avatar):** Tỷ lệ banner 16:6 chuẩn phong cách Facebook, avatar nổi bật lồng vào viền ảnh bìa.
- **Thanh điều hướng Tab dính (Sticky Tabs Navigation):** Thảo luận (`Posts`), Giới thiệu (`About`), Thành viên (`Members`), và File phương tiện (`Media`).
- **Bố cục 2 cột bất đối xứng trên Desktop:** Bảng tin thảo luận trung tâm (kèm khung đăng bài, danh sách bài viết) kết hợp Cột thông tin giới thiệu bên phải (Tóm tắt nhóm, Quy tắc nhóm, Thư viện ảnh).
- **Trải nghiệm Mobile Master–Detail linh hoạt:** Tự động co giãn mượt mà theo màn hình điện thoại (320px – 390px), ẩn sidebar và ưu tiên nội dung trọng tâm.
- **Tuân thủ tuyệt đối quy chuẩn mã nguồn (`AGENTS.md`):**
  - **100% component < 250 dòng:** Không còn component nguyên khối 500-600 dòng.
  - **100% Theme Tokens:** Không hardcode màu sắc, tương thích hoàn hảo Light Mode và Dark Mode.
  - **100% Đa ngôn ngữ (6 Ngôn ngữ):** Cập nhật đồng bộ các khóa i18n trên `vi`, `en`, `zh-CN`, `zh-TW`, `ko`, `th`.

---

## 2. Hình ảnh Giao diện Thực tế (Demo Screenshots)

### 2.1. Khám Phá Nhóm Chuẩn Facebook Trên Màn Hình Desktop (1440px)
![Giao diện Khám phá Hội nhóm](docs/assets/screenshots/groups-redesign-explore.png)

### 2.2. Giao diện Tương thích Linh hoạt Trên Thiết bị Di Động (Mobile 390px)
![Giao diện Nhóm trên Mobile](docs/assets/screenshots/groups-redesign-mobile.png)

---

## 3. Bản đồ Cấu trúc Thành phần (Modular Component Architecture)

Mọi component trong `frontend/src/components/groups/` được phân rã thành các module đơn trách nhiệm:

```
frontend/src/components/groups/
├── GroupFeed.tsx                   (~211 dòng) -> Điều phối trung tâm trang chi tiết /groups/[slug]
├── GroupsExplore.tsx               (~176 dòng) -> Trang Khám phá nhóm /groups
├── GroupCard.tsx                   (~94 dòng)  -> Thẻ hiển thị nhóm trong danh mục khám phá
├── MyGroupCompactCard.tsx          (~49 dòng)  -> Thẻ thu nhỏ cho nhóm đã tham gia
├── CreateGroupDialog.tsx           (~226 dòng) -> Hộp thoại tạo nhóm mới chuẩn token
├── MemberRow.tsx                   (~119 dòng) -> Dòng thành viên độc lập kèm menu phân quyền
├── GroupMembersTab.tsx             (~233 dòng) -> Tab quản lý & danh sách thành viên
├── DeputyPermissionsDialog.tsx     (~147 dòng) -> Hộp thoại cấp quyền chi tiết cho phó nhóm
├── GroupManagePage.tsx             (~235 dòng) -> Trang quản trị nhóm /groups/[slug]/manage
│
├── detail/                         -> Phân hệ Giao diện Chi tiết Nhóm
│   ├── GroupHeader.tsx             (~242 dòng) -> Ảnh bìa 16:6, avatar, tên nhóm, nút tác vụ
│   ├── GroupNavTabs.tsx            (~50 dòng)  -> Thanh tab cố định (Thảo luận, Giới thiệu, Thành viên, Media)
│   ├── GroupSidebar.tsx            (~117 dòng) -> Cột bên phải (Giới thiệu, Quy tắc, Thư viện ảnh)
│   ├── GroupDiscussionTab.tsx      (~53 dòng)  -> Tab Bảng tin thảo luận tích hợp PostFeed
│   ├── GroupAboutTab.tsx           (~119 dòng) -> Tab Thông tin giới thiệu & Quy tắc chi tiết
│   └── GroupMediaTab.tsx           (~30 dòng)  -> Tab Thư viện ảnh & video cộng đồng
│
├── manage/                         -> Phân hệ Trang Quản trị Nhóm
│   ├── ManageOverviewMetrics.tsx   (~76 dòng)  -> 4 thẻ chỉ số thống kê (Thành viên, Chờ duyệt, Phó nhóm, Báo cáo)
│   ├── ManageSettingsTab.tsx       (~173 dòng) -> Form cập nhật cài đặt chung & câu hỏi tham gia
│   └── ManageDangerZone.tsx        (~67 dòng)  -> Khu vực nguy hiểm xóa nhóm an toàn
│
└── reports/                        -> Phân hệ Kiểm duyệt & Báo cáo Bình luận
    ├── GroupReportsTab.tsx         (~180 dòng) -> Bộ lọc và danh sách bình luận vi phạm
    ├── ReportCardItem.tsx          (~126 dòng) -> Thẻ báo cáo trích dẫn nội dung vi phạm
    └── ReportActionDialog.tsx      (~86 dòng)  -> Hộp thoại xử lý vi phạm kèm ghi chú
```

---

## 4. Các Tính Năng Chi Tiết

### 4.1. Thanh Điều Hướng Tab Chi Tiết (Group Navigation)
- **Thảo luận (`Posts`):**
  - Tích hợp trực tiếp `PostFeed` dùng chung, phân trang theo con trỏ cursor, tải vô hạn mượt mà.
  - Tự động hiển thị cảnh báo nếu thành viên đang bị quản trị viên khóa quyền đăng bài (`isBannedPosting`) hoặc khóa quyền bình luận (`isMutedComments`).
- **Giới thiệu (`About`):**
  - Hiển thị mô tả chi tiết của nhóm, trạng thái quyền riêng tư (Công khai / Riêng tư).
  - Mục **Quy tắc nhóm (Group Rules)** được đánh số rõ ràng, định dạng trực quan.
- **Thành viên (`Members`):**
  - Xem danh sách thành viên kèm vai trò (`👑 Quản trị viên`, `🛡️ Phó nhóm`, `Thành viên`).
  - Quản trị viên và Phó nhóm có thể lọc theo: *Tất cả*, *Quản trị viên & Phó nhóm*, *Bị hạn chế*.
  - Thao tác nhanh: Bổ nhiệm phó nhóm, cấp quyền, khóa bình luận, cấm đăng bài, xóa khỏi nhóm.
- **Phương tiện (`Media`):**
  - Lưới hiển thị hình ảnh và video đã được chia sẻ trong nhóm kèm trạng thái rỗng (`EmptyState`).

### 4.2. Khám Phá & Tìm Kiếm Nhóm (`GroupsExplore`)
- Thanh tìm kiếm tức thời theo tên hoặc mô tả nhóm.
- Hàng ngang trượt các nhóm người dùng đã tham gia (`MyGroupCompactCard`).
- Lưới các nhóm đề xuất tham gia (`GroupCard`) kèm số lượng thành viên, chế độ quyền riêng tư và nút tham gia/đã tham gia nhanh.

### 4.3. Quản Trị Nhóm Toàn Diện (`GroupManagePage`)
- **Chỉ số tổng quan:** Hiển thị tức thì 4 thẻ số liệu động: Tổng số thành viên, Số yêu cầu chờ duyệt, Số lượng phó nhóm, Số báo cáo bình luận đang mở.
- **Quản lý cài đặt & Phê duyệt:** Tùy chỉnh bật/tắt yêu cầu phê duyệt thành viên và câu hỏi lý do tham gia nhóm.
- **Danger Zone:** Xóa nhóm và giải phóng tài nguyên an toàn thông qua `ConfirmDialog`.

---

## 5. Quy Chuẩn Đa Ngôn Ngữ & Thiết Kế

- **Đầy đủ 6 ngôn ngữ:**
  - `vi`: Tiếng Việt
  - `en`: English
  - `zh-CN`: 简体中文
  - `zh-TW`: 繁體中文
  - `ko`: 한국어
  - `th`: ไทย
- **Bảo đảm Không Hardcoded Colors:** Mọi mã màu đều sử dụng token CSS `--mui-palette-*`, biến `v.tone`, `v.paper`, `v.neutral` từ `@/theme/tokens`.
- **Cổng kiểm thử chất lượng:**
  - TypeScript Typecheck: `0 errors`
  - ESLint / Oxlint: `0 errors`
  - Next.js Static Pages Build: `14/14 static pages prerendered`

