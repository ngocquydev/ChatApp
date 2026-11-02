import type { Metadata } from "next";
import PageProfile from "@/components/pages/PageProfile";

export const metadata: Metadata = {
  title: "Trang Fanpage • ChatApp",
  description: "Trang cộng đồng & fanpage chính thức trên ChatApp",
};

export default async function PageSlugRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  return <PageProfile slug={resolved.slug} />;
}

