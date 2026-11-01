import type { Metadata } from "next";
import ModerationView from "@/components/admin/moderation/ModerationView";

export const metadata: Metadata = {
  title: "Kiểm duyệt AI & An toàn",
  description: "Hàng đợi kiểm duyệt nội dung tự động bằng AI, phát hiện ngôn từ độc hại và hành vi bot.",
  robots: { index: false, follow: false },
};

export default function AdminModerationPage() {
  return <ModerationView />;
}

