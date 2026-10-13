import { ShieldCheck, Zap, Headphones, LucideIcon } from "lucide-react";

export interface FeatureItem {
  icon: LucideIcon;
  text: string;
}

export interface LoginFormFields {
  title: string;
  description: string;
  email: {
    label: string;
    placeholder: string;
  };
  password: {
    label: string;
    placeholder: string;
  };
  loginButton: string;
  divider: string;
  googleButton: string;
  facebookButton: string;
  registerText: string;
  registerButton: string;
}

export interface LoginData {
  logo: string;
  labelForget: string;
  labelRememberme: string;
  badge: string;
  title: string;
  description: string;
  features: FeatureItem[];
  quote: string[];
  avatar: string;
  author: string;
  position: string;
  copyright: string;
  form: LoginFormFields;
}

const login: LoginData = {
  logo: "ChatApp Studio",
  labelForget: "Quên mật khẩu?",
  labelRememberme: "Ghi nhớ đăng nhập",
  badge: "Giao thức nhắn tin thế hệ mới",
  title: "Trò chuyện tức thì, kết nối đa nền tảng.",

  description:
    "Đăng nhập để tiếp tục các cuộc hội thoại, chia sẻ tài liệu và quản lý nhóm của bạn với chuẩn bảo mật cao cấp.",

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
    "Chào mừng bạn đến với hệ thống!",
    "Đăng nhập để tiếp tục.",
    "Kết nối và trò chuyện dễ dàng.",
  ],

  avatar: "HL",

  author: "Hoàng Long",

  position: "Lead Product Designer",

  copyright: "© 2026 ChatApp Studio. All rights reserved.",

  form: {
    title: "Đăng nhập",

    description: "Chào mừng trở lại! Vui lòng nhập thông tin để đăng nhập.",

    email: {
      label: "Email",
      placeholder: "Email của bạn",
    },

    password: {
      label: "Mật khẩu",
      placeholder: "Tối thiểu 8 ký tự",
    },

    loginButton: "Đăng nhập vào tài khoản",

    divider: "HOẶC TIẾP TỤC VỚI",

    googleButton: "Google",
    facebookButton: "Facebook",
    registerText: "Chưa có tài khoản?",

    registerButton: "Tạo tài khoản miễn phí",
  },
};

export default login;
