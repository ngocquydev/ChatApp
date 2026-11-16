import type { Metadata } from "next";
import Login from "@/components/pages/Login";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản",
  description:
    "Đăng nhập vào ChatApp để tiếp tục trò chuyện cùng bạn bè, tham gia các nhóm chat và cập nhật bảng tin tức thì.",
  keywords: [
    "đăng nhập chatapp",
    "chat trực tuyến",
    "nhắn tin realtime",
    "đăng nhập tài khoản",
    "chatapp login",
  ],
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Đăng nhập tài khoản ChatApp",
    description: "Đăng nhập vào ChatApp để kết nối và trò chuyện thời gian thực cùng bạn bè.",
    url: "/login",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Đăng nhập tài khoản ChatApp",
    description: "Đăng nhập vào ChatApp để kết nối và trò chuyện thời gian thực cùng bạn bè.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://chatapp.vn/login",
      url: "https://chatapp.vn/login",
      name: "Đăng nhập ChatApp",
      description: "Đăng nhập vào ChatApp để kết nối và trò chuyện cùng bạn bè.",
      inLanguage: "vi-VN",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Trang chủ",
          item: "https://chatapp.vn",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Đăng nhập",
          item: "https://chatapp.vn/login",
        },
      ],
    },
  ],
};

export default function LoginPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Login />
    </>
  );
}
