import type { Metadata } from "next";
import Register from "@/components/pages/Register";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản | ChatApp",
  description: "Tạo tài khoản mới trên nền tảng ChatApp",
};

export default function RegisterPage() {
  return <Register />;
}
