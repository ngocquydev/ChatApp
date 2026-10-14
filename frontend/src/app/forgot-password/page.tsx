import type { Metadata } from "next";
import ForgotPassword from "../../components/pages/ForgotPassword";

export const metadata: Metadata = {
  title: "Quên mật khẩu | ChatApp",
  description: "Khôi phục quyền truy cập vào tài khoản ChatApp của bạn qua mã xác thực OTP",
};

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
