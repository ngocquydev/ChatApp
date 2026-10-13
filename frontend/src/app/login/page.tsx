import type { Metadata } from "next";
import Login from "@/components/pages/Login";

export const metadata: Metadata = {
  title: "Đăng nhập | ChatApp",
  description: "Đăng nhập vào tài khoản ChatApp của bạn",
};

export default function LoginPage() {
  return <Login />;
}
