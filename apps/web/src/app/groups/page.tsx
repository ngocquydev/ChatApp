import type { Metadata } from "next";
import GroupsExplore from "@/components/groups/GroupsExplore";

export const metadata: Metadata = {
  title: "Khám phá Hội nhóm • ChatApp",
  description: "Tham gia các hội nhóm cộng đồng cùng sở thích trên ChatApp",
};

export default function GroupsRoute() {
  return <GroupsExplore />;
}

