import type { Metadata } from "next";
import AuthGuard from "@/components/common/AuthGuard";
import Explore from "@/components/pages/Explore";

export const metadata: Metadata = {
  title: "Video ngắn | ChatApp",
  description:
    "Khám phá video ngắn công khai từ cộng đồng ChatApp.",
  openGraph: {
    title: "Video ngắn | ChatApp",
    description: "Khám phá video ngắn công khai từ cộng đồng ChatApp.",
  },
};

export default function ExplorePage() {
  return (
    <AuthGuard>
      <Explore />
    </AuthGuard>
  );
}
