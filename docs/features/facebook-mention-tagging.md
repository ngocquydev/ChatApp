# Tính Năng Gắn Thẻ Bạn Bè Chuẩn Facebook (Facebook-Style Friend Tagging & Mentions)

## 1. Tổng quan
Tính năng gắn thẻ (tag/mention) bạn bè trong bài viết và bình luận theo đúng trải nghiệm giao diện và hành vi của mạng xã hội Facebook:
- **Hiển thị liên kết màu xanh chuẩn Facebook (`MentionText`):**
  - Cú pháp gắn thẻ chuẩn `@[Tên bạn bè](userId)` (ví dụ `@[Anh hài lúa](6ad98c70f4ff440ad1c82c26)`) được chuyển đổi trực quan thành tên bạn bè in đậm (`fontWeight: 600`), màu xanh Facebook (`color: "primary.main"`), không gạch chân mặc định và có gạch chân + đổi tông xanh đậm (`primary.dark`) khi rê chuột (hover).
  - Nhấp trực tiếp vào tên bạn bè sẽ chuyển hướng ngay đến trang cá nhân của người đó (`/profile/${userId}`).
  - Hỗ trợ đầy đủ trên tất cả các thành phần giao diện mạng xã hội:
    - Nội dung bài viết (`PostCard.tsx`)
    - Nội dung bài viết được chia sẻ lại (`SharedPostEmbed.tsx`)
    - Danh sách bình luận bài viết (`CommentItem.tsx`)
    - Khung tin nhắn chat realtime (`MessageList.tsx`, `FloatingMessageList.tsx`)
- **Gợi ý tự động thông minh khi gõ `@` (`MentionAutocomplete` & `useMention`):**
  - Tích hợp trực tiếp vào ô tạo bài viết (`PostComposer.tsx`), ô chỉnh sửa bài viết (`EditPostDialog.tsx`) và ô viết bình luận (`CommentComposer.tsx`).
  - Khi gõ ký tự `@`, danh sách bạn bè cùng trợ lý ảo Aura AI sẽ hiển thị popover gợi ý trực quan kèm avatar, hỗ trợ phím mũi tên Lên/Xuống và phím Enter để chèn nhanh.
- **Hệ thống thông báo Realtime khi được nhắc đến:**
  - Backend (`posts.service.ts` & `notifications.service.ts`) tự động phân tích cú pháp gắn thẻ trong nội dung bài viết mới tạo (`createPost`) và bình luận mới (`addComment`).
  - Phát thông báo tức thì loại `mention` đến người được gắn thẻ, kèm liên kết dẫn thẳng đến bài viết hoặc trang cá nhân của tác giả.

## 2. Kiến trúc kỹ thuật
- `frontend/src/components/common/MentionText.tsx`: Trình phân tích cú pháp Regex hỗ trợ `@[Name](userId)`, `@aura` và `@Name`, chuyển đổi thành `NextLink` chuẩn Facebook.
- `frontend/src/components/posts/PostComposer.tsx`: Tích hợp hook `useMention` và popover `MentionAutocomplete`.
- `frontend/src/components/posts/EditPostDialog.tsx`: Tích hợp hook `useMention` và popover `MentionAutocomplete` khi chỉnh sửa bài viết.
- `frontend/src/components/posts/CommentItem.tsx`: Render bình luận qua `MentionText`.
- `frontend/src/components/posts/PostCard.tsx`: Render nội dung bài viết qua `MentionText`.
- `frontend/src/components/posts/SharedPostEmbed.tsx`: Render bài viết chia sẻ qua `MentionText`.
- `backend/src/modules/posts/posts.service.ts`: Gửi thông báo loại `mention` khi tạo bài viết hoặc thêm bình luận có nhắc tên người dùng.
