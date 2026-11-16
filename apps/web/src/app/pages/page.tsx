import type { Metadata } from "next";
import PagesExplore from "@/components/pages/PagesExplore";

export const metadata: Metadata = {
  title: "Khám phá Trang • ChatApp",
  description: "Khám phá và theo dõi các trang fanpage chính thức trên ChatApp",
};

export default function PagesRoute() {
  return <PagesExplore />;
}

