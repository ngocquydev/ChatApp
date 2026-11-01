import { ReactNode } from "react";
import type { Metadata } from "next";
import AdminLayout from "@/components/admin/layout/AdminLayout";

export const metadata: Metadata = {
  title: {
    template: "%s | Quản trị ChatApp",
    default: "Trung tâm Quản trị | ChatApp",
  },
  description: "Trang quản trị hệ thống ChatApp: người dùng, bài viết, kiểm duyệt AI và tường lửa bảo mật.",
  robots: { index: false, follow: false },
};

export default function RootAdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
