# Phân quyền Quản trị viên, Phó nhóm, Trang Quản trị Nhóm & Câu hỏi Xét duyệt Tham gia

## 1. Giới thiệu tổng quan

Hệ thống Hội nhóm Cộng đồng (Community Groups) trên ChatApp được trang bị hệ thống phân quyền quản trị theo cấp bậc (Hierarchical RBAC), trang quản trị chuyên dụng (`/groups/[slug]/manage`) và cơ chế kiểm duyệt thành viên thông minh:

1. **Quản trị viên (Admin / Creator):**
   - Khi tạo nhóm, người dùng **tự động trở thành Quản trị viên và Thành viên chính thức** (không cần bấm tham gia hay qua phê duyệt).
   - Tự động hiển thị huy hiệu `👑 Quản trị viên` và nút `⚙️ Quản lý nhóm` dẫn đến trang quản trị `/groups/[slug]/manage`.
   - Có toàn quyền đối với nhóm: chỉnh sửa cài đặt chung (tên, giới thiệu, quyền riêng tư), bật/tắt phê duyệt, bật/tắt yêu cầu trả lời câu hỏi khi vào nhóm, bổ nhiệm/thu hồi vai trò phó nhóm và phân quyền chi tiết.

2. **Phó nhóm (Deputy / Moderator):**
   - Được quản trị viên bổ nhiệm và cấp một hoặc nhiều quyền quản lý cụ thể:
     - **Xóa thành viên khỏi nhóm (`canRemoveMembers`)**
     - **Khóa quyền bình luận bài viết (`canMuteComments`)**
     - **Khóa quyền đăng bài viết mới (`canBlockPosting`)**
   - Được truy cập trang quản trị nhóm để quản lý thành viên và xét duyệt yêu cầu dựa theo quyền hạn được cấp.

3. **Trang Quản trị Nhóm Chuyên dụng (`/groups/[slug]/manage`):**
   - **Thẻ định danh & Thống kê tổng quan:** Tổng thành viên, Yêu cầu chờ duyệt, Số lượng phó nhóm, Trạng thái quyền riêng tư.
   - **Tab Thành viên & Phân quyền:** Danh sách thành viên, lọc theo vai trò (Tất cả, Quản trị viên & Phó nhóm, Bị hạn chế), bổ nhiệm phó nhóm, phân quyền chi tiết, khóa bình luận, cấm đăng bài, xóa thành viên.
   - **Tab Xét duyệt Yêu cầu:** Hiển thị câu hỏi và câu trả lời của từng người dùng xin tham gia, nút Duyệt / Từ chối.
   - **Tab Cài đặt Nhóm (Quản trị viên):** Chỉnh sửa tên, giới thiệu, quyền riêng tư, quy định phê duyệt và câu hỏi gia nhập nhóm.

4. **Câu hỏi xét duyệt tham gia nhóm (Join Question / Reason Requirement):**
   - Quản trị viên có thể bật hoặc tắt yêu cầu trả lời câu hỏi khi người dùng xin tham gia nhóm.
   - Khi bật, người dùng bấm "Tham gia nhóm" sẽ hiển thị hộp thoại yêu cầu trả lời câu hỏi lý do tham gia.
   - Quản trị viên và phó nhóm có thể xem danh sách yêu cầu kèm câu trả lời của từng người để phê duyệt hoặc từ chối.

---

## 2. Mô hình Dữ liệu (Schema)

Trong `CommunityGroupSchema`:

```typescript
@Schema({ timestamps: true })
export class CommunityGroup {
  // Quản trị viên & Người tạo
  creatorId: Types.ObjectId;
  adminIds: Types.ObjectId[];
  moderatorIds: Types.ObjectId[];

  // Danh sách phó nhóm kèm phân quyền chi tiết
  deputies: Array<{
    userId: Types.ObjectId;
    canRemoveMembers: boolean;
    canMuteComments: boolean;
    canBlockPosting: boolean;
  }>;

  // Thành viên bị hạn chế quyền
  bannedPostingUserIds: Types.ObjectId[];
  mutedCommentUserIds: Types.ObjectId[];

  // Cấu hình câu hỏi tham gia
  requireApproval: boolean;
  requireJoinReason: boolean;
  joinQuestion: string;

  // Danh sách yêu cầu chờ duyệt kèm câu trả lời
  pendingRequests: Array<{
    userId: Types.ObjectId;
    reason: string;
    requestedAt: Date;
  }>;
}
```

---

## 3. Danh sách Endpoints API

| Phương thức | Đường dẫn | Quyền yêu cầu | Mô tả |
|---|---|---|---|
| `POST` | `/community-groups` | Đã đăng nhập | Tạo nhóm mới (người tạo tự động là Quản trị viên và Thành viên) |
| `GET` | `/community-groups/:slug` | Tùy chọn (Optional Auth) | Lấy chi tiết nhóm, tự động nhận diện quyền Admin/Deputy/Member |
| `PATCH` | `/community-groups/:id` | Admin | Cập nhật thông tin và cài đặt nhóm |
| `POST` | `/community-groups/:id/join` | Đã đăng nhập | Gửi yêu cầu hoặc tham gia nhóm (kèm `reason` nếu có câu hỏi) |
| `GET` | `/community-groups/:id/members` | Tùy chọn (Optional Auth) | Lấy danh sách thành viên, vai trò và trạng thái khóa |
| `GET` | `/community-groups/:id/pending-requests` | Admin / Phó nhóm | Xem danh sách yêu cầu chờ duyệt kèm câu trả lời |
| `POST` | `/community-groups/:id/members/:userId/approve` | Admin / Phó nhóm | Chấp nhận yêu cầu tham gia |
| `POST` | `/community-groups/:id/members/:userId/reject` | Admin / Phó nhóm | Từ chối yêu cầu tham gia |
| `DELETE` | `/community-groups/:id/members/:userId` | Admin / Phó nhóm có quyền `canRemoveMembers` | Xóa thành viên vi phạm khỏi nhóm |
| `POST` | `/community-groups/:id/deputies` | Admin | Bổ nhiệm hoặc chỉnh sửa quyền hạn phó nhóm |
| `DELETE` | `/community-groups/:id/deputies/:userId` | Admin | Thu hồi vai trò phó nhóm |
| `POST` | `/community-groups/:id/members/:userId/mute-comments` | Admin / Phó nhóm có quyền `canMuteComments` | Khóa / mở khóa quyền bình luận |
| `POST` | `/community-groups/:id/members/:userId/block-posting` | Admin / Phó nhóm có quyền `canBlockPosting` | Khóa / mở khóa quyền đăng bài |

---

## 4. Kiểm soát An toàn ở Tầng Nghiệp vụ (Posts Service)

- **Khi tạo hoặc chia sẻ bài viết vào nhóm (`createPost` / `sharePost`):**
  - Hệ thống kiểm tra xem tác giả có nằm trong danh sách `bannedPostingUserIds` của nhóm hay không.
  - Nếu bị cấm, trả về lỗi `403 Forbidden: Bạn đã bị quản trị viên khóa quyền đăng bài trong nhóm này`.
- **Khi gửi bình luận vào bài viết của nhóm (`addComment`):**
  - Hệ thống kiểm tra xem người bình luận có nằm trong danh sách `mutedCommentUserIds` của nhóm hay không.
  - Nếu bị khóa, trả về lỗi `403 Forbidden: Bạn đã bị quản trị viên khóa quyền bình luận trong nhóm này`.

---

## 5. Hỗ trợ Đa ngôn ngữ (6 Ngôn ngữ Toàn diện)

Tất cả các tính năng quản lý, phân quyền, giao diện cài đặt và huy hiệu quản trị đều được hỗ trợ đầy đủ trên 6 ngôn ngữ chính thức:
1. `vi`: **Tiếng Việt** (mặc định)
2. `en`: **English**
3. `zh-CN`: **简体中文**
4. `zh-TW`: **繁體中文**
5. `ko`: **한국어**
6. `th`: **ไทย**

---

## 6. Hình ảnh Demo Giao diện Thực tế

![Chi tiết Hội nhóm & Nhận diện Quản trị viên](docs/assets/screenshots/group-detail-roles-permissions.png)

![Trang Quản trị Nhóm Chuyên dụng & Phân quyền Phó nhóm](docs/assets/screenshots/group-management-roles.png)
