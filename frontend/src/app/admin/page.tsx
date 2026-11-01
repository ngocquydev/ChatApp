import type { Metadata } from "next";
import DashboardView from "@/components/admin/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Tổng quan quản trị",
  description: "Bảng điều khiển tổng thể hệ thống, người dùng, bài viết và an ninh.",
  robots: { index: false, follow: false },
};

export default function AdminDashboardPage() {
  return <DashboardView />;
}
