import type { Metadata } from "next";
import GroupFeed from "@/components/groups/GroupFeed";

export const metadata: Metadata = {
  title: "Hội nhóm cộng đồng • ChatApp",
  description: "Không gian giao lưu, chia sẻ bài viết cùng cộng đồng trên ChatApp",
};

export default async function GroupSlugRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  return <GroupFeed slug={resolved.slug} />;
}

