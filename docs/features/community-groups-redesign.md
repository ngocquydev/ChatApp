# Tái Thiết Kế Toàn Diện Hội Nhóm Cộng Đồng (Facebook-Style Community Groups Revamp)

> **Mô hình kiến trúc module hóa:** Tách nhỏ toàn bộ component đảm bảo **100% số file < 250 dòng code**, chuẩn hóa Design System (0 hardcoded hex/rgb), hỗ trợ trọn vẹn **6 ngôn ngữ** (`vi`, `en`, `zh-CN`, `zh-TW`, `ko`, `th`), và tối ưu trải nghiệm người dùng chuẩn Facebook Groups.

---

## 1. Giới thiệu & Điểm Cải Tiến Đột Phá

Trang Hội nhóm Cộng đồng (`/groups`) và Chi tiết Nhóm (`/groups/[slug]`) đã được chuyển đổi hoàn toàn sang mô hình chuẩn Facebook:
- **Cột Trái Điều Hướng Nhóm Chuyên Dụng (`GroupsSidebarNav`):** Thay thế thanh điều hướng chung khi vào `/groups`. Tích hợp:
  - Nút quay về Trang chủ.
  - Ô tìm kiếm nhóm nhanh.
  - 3 Tab điều hướng chính: **Bảng tin của bạn** (`feed`), **Khám phá** (`discover`), **Nhóm của bạn** (`my-groups`).
  - Nút **`+ Tạo nhóm mới`** nổi bật.
  - Danh mục **Nhóm do bạn quản lý** & **Nhóm bạn đã tham gia** cuộn độc lập.
- **Bảng Tin Tổng Hợp Các Nhóm (`GroupFeedTab`):** Tổng hợp bài viết thời gian thực từ các nhóm người dùng đã tham gia (`GET /posts/groups/feed`), cuộn vô hạn với con trỏ cursor, tương tác thả cảm xúc & bình luận.
- **Thẻ Nhóm Banner Lớn (16:9) & Facepile (`GroupCoverCard`):**
  - Ảnh bìa 16:9 sắc nét kèm avatar nhóm lồng góc.
  - Cụm avatar thành viên xếp chồng (**Facepile**) hiển thị trực quan các thành viên tiêu biểu.
  - Huy hiệu quyền riêng tư và danh mục.
- **Bộ Lọc Phân Loại Chủ Đề & Chuyển Đổi Chế Độ Xem (`GroupDiscoverTab`):**
  - Thanh chọn chủ đề dạng viên thuốc (Pills): *Tất cả, Công nghệ, Đời sống, Giải trí, Học tập, Trò chơi, Thể thao*.
  - Nút chuyển đổi linh hoạt: **Dạng thẻ (Grid)** và **Dạng danh sách tối giản (Minimalist List)** kiểu Reddit / Discord.
- **Tuân thủ tuyệt đối quy chuẩn mã nguồn (`AGENTS.md`):**
  - **100% component < 250 dòng code:** Phân chia module rõ ràng, tối đa 243 dòng.
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
├── GroupsExplore.tsx               (~198 dòng) -> Điều phối chính trang /groups (Tabs, Dialogs, State)
├── GroupsSidebarNav.tsx            (~226 dòng) -> Cột trái điều hướng nhóm chuẩn Facebook
├── GroupNavRow.tsx                 (~62 dòng)  -> Dòng nhóm rút gọn trong cột trái
├── GroupFeedTab.tsx                (~41 dòng)  -> Tab Bảng tin tổng hợp bài viết các nhóm đã tham gia
├── GroupDiscoverTab.tsx            (~200 dòng) -> Tab Khám phá nhóm (bộ lọc chủ đề & đổi chế độ xem)
├── GroupCoverCard.tsx              (~215 dòng) -> Thẻ nhóm ảnh bìa 16:9 + Facepile thành viên
├── GroupListItem.tsx               (~152 dòng) -> Thẻ nhóm danh sách tinh gọn phong cách Reddit/Discord
├── MyGroupsTab.tsx                 (~198 dòng) -> Tab danh sách các nhóm đã tham gia & quản lý
├── CreateGroupDialog.tsx           (~243 dòng) -> Hộp thoại tạo nhóm mới chuẩn token
├── JoinQuestionDialog.tsx          (~189 dòng) -> Hộp thoại trả lời câu hỏi tham gia nhóm
├── GroupFeed.tsx                   (~230 dòng) -> Điều phối trung tâm trang chi tiết /groups/[slug]
├── MemberRow.tsx                   (~132 dòng) -> Dòng thành viên độc lập kèm menu phân quyền
├── GroupMembersTab.tsx             (~243 dòng) -> Tab quản lý & danh sách thành viên
├── DeputyPermissionsDialog.tsx     (~159 dòng) -> Hộp thoại cấp quyền chi tiết cho phó nhóm
├── GroupManagePage.tsx             (~239 dòng) -> Trang quản trị nhóm /groups/[slug]/manage
│
├── detail/                         -> Phân hệ Giao diện Chi tiết Nhóm
│   ├── GroupHeader.tsx             (~237 dòng) -> Ảnh bìa 16:6, avatar, tên nhóm, nút tác vụ
│   ├── GroupNavTabs.tsx            (~55 dòng)  -> Thanh tab cố định (Thảo luận, Giới thiệu, Thành viên, Media)
│   ├── GroupSidebar.tsx            (~127 dòng) -> Cột bên phải (Giới thiệu, Quy tắc, Thư viện ảnh)
│   ├── GroupDiscussionTab.tsx      (~60 dòng)  -> Tab Bảng tin thảo luận tích hợp PostFeed
│   ├── GroupAboutTab.tsx           (~131 dòng) -> Tab Thông tin giới thiệu & Quy tắc chi tiết
│   └── GroupMediaTab.tsx           (~35 dòng)  -> Tab Thư viện ảnh & video cộng đồng
│
├── manage/                         -> Phân hệ Trang Quản trị Nhóm
│   ├── ManageOverviewMetrics.tsx   (~84 dòng)  -> 4 thẻ chỉ số thống kê (Thành viên, Chờ duyệt, Phó nhóm, Báo cáo)
│   ├── ManageSettingsTab.tsx       (~188 dòng) -> Form cập nhật cài đặt chung & câu hỏi tham gia
│   └── ManageDangerZone.tsx        (~73 dòng)  -> Khu vực nguy hiểm xóa nhóm an toàn
│
└── reports/                        -> Phân hệ Kiểm duyệt & Báo cáo Bình luận
    ├── GroupReportsTab.tsx         (~195 dòng) -> Bộ lọc và danh sách bình luận vi phạm
    ├── ReportCardItem.tsx          (~137 dòng) -> Thẻ báo cáo trích dẫn nội dung vi phạm
    └── ReportActionDialog.tsx      (~94 dòng)  -> Hộp thoại xử lý vi phạm kèm ghi chú
```

---

## 4. Các Tính Năng Chi Tiết

### 4.1. Cột Điều Hướng Nhóm Chuyên Dụng (`GroupsSidebarNav`)
- Cung cấp trải nghiệm chuẩn ứng dụng Facebook Desktop.
- Quản trị viên và người dùng dễ dàng chuyển đổi qua lại giữa Bảng tin nhóm, mục Khám phá nhóm mới và danh sách nhóm của cá nhân.
- Truy cập tức thời vào nhóm đang quản lý hoặc nhóm đã tham gia với avatar và số lượng thành viên cập nhật trực tiếp.

### 4.2. Bảng Tin Tổng Hợp Các Nhóm (`GroupFeedTab`)
- Tích hợp endpoint backend `@Get('groups/feed')` trả về luồng bài viết tổng hợp từ các nhóm đã gia nhập.
- Hiển thị bài đăng, người đăng, tên nhóm nguồn, tương tác thả cảm xúc và bình luận.

### 4.3. Chế Độ Xem Khám Phá Đa Dạng (`GroupDiscoverTab`)
- Lọc theo 7 chủ đề phổ biến: Công nghệ, Đời sống, Giải trí, Học tập, Trò chơi, Thể thao hoặc xem Tất cả.
- Chế độ **Thẻ lớn 16:9 (`GroupCoverCard`)**: Tối ưu thị giác với ảnh bìa rộng, hiệu ứng hover nổi bật và Facepile avatar thành viên.
- Chế độ **Danh sách tối giản (`GroupListItem`)**: Gọn gàng, tải nhiều dữ liệu trên một khung hình, phù hợp người dùng thích giao diện kiểu Reddit/Discord.

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
