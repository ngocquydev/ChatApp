import type { Metadata } from "next";
import PostsModerationView from "@/components/admin/posts/PostsModerationView";

export const metadata: Metadata = {
  title: "Kiểm duyệt bài viết",
  description: "Kiểm tra danh sách bài viết toàn hệ thống, gỡ bỏ nội dung vi phạm tiêu chuẩn cộng đồng.",
  robots: { index: false, follow: false },
};

export default function AdminPostsPage() {
  return <PostsModerationView />;
}
