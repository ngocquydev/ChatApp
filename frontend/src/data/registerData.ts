import { ShieldCheck, Zap, Headphones, LucideIcon } from "lucide-react";
import type { SupportedLanguage } from "@/i18n/types";

export interface FeatureItem {
  icon: LucideIcon;
  text: string;
}

export interface RegisterFormFields {
  title: string;
  description: string;
  name: {
    label: string;
    placeholder: string;
  };
  email: {
    label: string;
    placeholder: string;
  };
  phone: {
    label: string;
    placeholder: string;
  };
  dateOfBirth: {
    label: string;
    placeholder: string;
  };
  password: {
    label: string;
    placeholder: string;
  };
  confirmPassword: {
    label: string;
    placeholder: string;
  };
  termsText: string;
  termsLink: string;
  andText: string;
  privacyLink: string;
  registerButton: string;
  divider: string;
  googleButton: string;
  facebookButton: string;
  loginText: string;
  loginButton: string;
}

export interface RegisterData {
  logo: string;
  badge: string;
  title: string;
  description: string;
  features: FeatureItem[];
  quote: string[];
  avatar: string;
  author: string;
  position: string;
  form: RegisterFormFields;
}

const registerVi: RegisterData = {
  logo: "",
  badge: "Gia nhập cộng đồng ChatApp",
  title: "Tạo tài khoản mới, kết nối không giới hạn.",
  description:
    "Đăng ký tài khoản miễn phí để trải nghiệm trò chuyện mượt mà, gọi thoại chất lượng cao và chia sẻ dữ liệu an toàn.",
  features: [
    {
      icon: ShieldCheck,
      text: "Bảo mật tài khoản đa lớp mã hóa đầu cuối",
    },
    {
      icon: Zap,
      text: "Đồng bộ tin nhắn tức thì theo thời gian thực",
    },
    {
      icon: Headphones,
      text: "Hỗ trợ kỹ thuật và giải đáp 24/7",
    },
  ],
  quote: [
    "Bắt đầu hành trình kết nối ngay hôm nay!",
    "Bảo mật và riêng tư luôn là ưu tiên số một.",
    "Trò chuyện cùng bạn bè mọi lúc mọi nơi.",
  ],
  avatar: "CA",
  author: "Zuno Platform",
  position: "Next-Gen Messaging Platform",
  form: {
    title: "Đăng ký tài khoản",
    description: "Nhập thông tin bên dưới để tạo tài khoản mới.",
    name: {
      label: "Họ và tên",
      placeholder: "Ví dụ: Nguyễn Văn A",
    },
    email: {
      label: "Email",
      placeholder: "Email của bạn",
    },
    phone: {
      label: "Số điện thoại (tùy chọn)",
      placeholder: "0987654321",
    },
    dateOfBirth: {
      label: "Ngày sinh (tùy chọn)",
      placeholder: "YYYY-MM-DD",
    },
    password: {
      label: "Mật khẩu",
      placeholder: "Tối thiểu 8 ký tự",
    },
    confirmPassword: {
      label: "Xác nhận mật khẩu",
      placeholder: "Nhập lại mật khẩu",
    },
    termsText: "Tôi đồng ý với",
    termsLink: "Điều khoản dịch vụ",
    andText: "và",
    privacyLink: "Chính sách bảo mật",
    registerButton: "Tạo tài khoản",
    divider: "HOẶC TIẾP TỤC VỚI",
    googleButton: "Google",
    facebookButton: "Facebook",
    loginText: "Đã có tài khoản?",
    loginButton: "Đăng nhập ngay",
  },
};

const registerEn: RegisterData = {
  logo: "",
  badge: "Join the ChatApp community",
  title: "Create a new account, connect without limits.",
  description:
    "Register for a free account to experience smooth messaging, high-quality voice calls, and secure file sharing.",
  features: [
    {
      icon: ShieldCheck,
      text: "Multi-layer account security with end-to-end encryption",
    },
    {
      icon: Zap,
      text: "Instant real-time message synchronization",
    },
    {
      icon: Headphones,
      text: "24/7 technical support and assistance",
    },
  ],
  quote: [
    "Start your connection journey today!",
    "Security and privacy always come first.",
    "Chat with friends anytime, anywhere.",
  ],
  avatar: "CA",
  author: "Zuno Platform",
  position: "Next-Gen Messaging Platform",
  form: {
    title: "Create Account",
    description: "Enter your information below to create a new account.",
    name: {
      label: "Full Name",
      placeholder: "E.g., Alex Nguyen",
    },
    email: {
      label: "Email",
      placeholder: "Your email address",
    },
    phone: {
      label: "Phone number (optional)",
      placeholder: "0987654321",
    },
    dateOfBirth: {
      label: "Date of birth (optional)",
      placeholder: "YYYY-MM-DD",
    },
    password: {
      label: "Password",
      placeholder: "At least 8 characters",
    },
    confirmPassword: {
      label: "Confirm password",
      placeholder: "Re-enter your password",
    },
    termsText: "I agree to the",
    termsLink: "Terms of Service",
    andText: "and",
    privacyLink: "Privacy Policy",
    registerButton: "Create account",
    divider: "OR CONTINUE WITH",
    googleButton: "Google",
    facebookButton: "Facebook",
    loginText: "Already have an account?",
    loginButton: "Sign in now",
  },
};

export function getRegisterData(lang: SupportedLanguage): RegisterData {
  return lang === "vi" ? registerVi : registerEn;
}

export default registerVi;
