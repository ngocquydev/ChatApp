import type { Metadata } from "next";
import SystemHealthView from "@/components/admin/system/SystemHealthView";

export const metadata: Metadata = {
  title: "Trạng thái hệ thống",
  description: "Theo dõi tài nguyên server, bộ nhớ RAM, cơ sở dữ liệu và microservices.",
  robots: { index: false, follow: false },
};

export default function AdminSystemPage() {
  return <SystemHealthView />;
}
