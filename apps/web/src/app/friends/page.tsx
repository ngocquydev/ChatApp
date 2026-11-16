import type { Metadata } from "next";
import AuthGuard from "@/components/common/AuthGuard";
import ExploreFriends from "@/components/pages/ExploreFriends";

export const metadata: Metadata = {
  title: "Khám phá bạn bè | ChatApp",
  description: "Tìm kiếm người quen và quản lý lời mời kết bạn trên ChatApp.",
};

export default function FriendsPage() {
  return (
    <AuthGuard>
      <ExploreFriends />
    </AuthGuard>
  );
}
