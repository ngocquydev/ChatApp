import type { Metadata } from "next";
import UserProfile from "@/components/pages/UserProfile";

export const metadata: Metadata = {
  title: "Trang cá nhân | ChatApp",
  description: "Xem bài viết và thông tin của người dùng trên ChatApp",
};

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserProfile userId={id} />;
}
