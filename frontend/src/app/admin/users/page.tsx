import type { Metadata } from "next";
import UsersManagementView from "@/components/admin/users/UsersManagementView";

export const metadata: Metadata = {
  title: "Quản lý người dùng",
  description: "Quản lý danh sách thành viên, khóa/mở khóa tài khoản và phân quyền quản trị.",
  robots: { index: false, follow: false },
};

export default function AdminUsersPage() {
  return <UsersManagementView />;
}
