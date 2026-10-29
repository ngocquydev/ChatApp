import type { Metadata } from "next";
import AuthGuard from "@/components/common/AuthGuard";
import Explore from "@/components/pages/Explore";

export const metadata: Metadata = {
  title: "Khám phá & Tìm bạn bè",
  description:
    "Tìm kiếm bạn bè mới, kết nối theo vị trí địa lý và khám phá những gợi ý kết bạn thông minh trên ChatApp.",
  openGraph: {
    title: "Khám phá & Tìm bạn bè | ChatApp",
    description:
      "Tìm kiếm bạn bè mới, kết nối theo vị trí địa lý và khám phá những gợi ý kết bạn thông minh trên ChatApp.",
  },
};

export default function ExplorePage() {
  return (
    <AuthGuard>
      <Explore />
    </AuthGuard>
  );
}
