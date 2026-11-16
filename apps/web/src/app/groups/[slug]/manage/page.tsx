import type { Metadata } from "next";
import GroupManagePage from "@/components/groups/GroupManagePage";

export const metadata: Metadata = {
  title: "Quản lý Hội nhóm • ChatApp",
  description: "Trang quản trị thành viên, phân quyền và cài đặt hội nhóm",
};

export default async function GroupManageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolved = await params;
  return <GroupManagePage slug={resolved.slug} />;
}
