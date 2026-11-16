import type { Metadata } from "next";
import Profile from "@/components/pages/Profile";

export const metadata: Metadata = {
  title: "Profile | ChatApp",
  description: "Profile của bạn",
};

export default function ProfilePage() {
  return <Profile />;
}
