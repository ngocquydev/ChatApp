import type { Metadata } from "next";
import AdminGuard from "@/components/common/AdminGuard";
import SecurityCenter from "@/components/admin/security/SecurityCenter";

export const metadata: Metadata = {
  title: "Trung tâm bảo mật",
  description: "Quản lý chống DDoS, tường lửa ứng dụng và Cloudflare WAF.",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return (
    <AdminGuard>
      <SecurityCenter />
    </AdminGuard>
  );
}

