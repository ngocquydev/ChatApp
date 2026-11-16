import type { Metadata } from "next";
import AuthGuard from "@/components/common/AuthGuard";
import ChatApp from "@/components/pages/ChatApp";

export const metadata: Metadata = {
  title: "Tin nhắn | ChatApp",
  description: "Trò chuyện realtime cùng bạn bè trên ChatApp",
};

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatApp />
    </AuthGuard>
  );
}
