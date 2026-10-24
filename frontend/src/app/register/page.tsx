import type { Metadata } from "next";
import Register from "@/components/pages/Register";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",
  description:
    "Tạo tài khoản ChatApp miễn phí để kết nối bạn bè, nhắn tin realtime, gọi thoại chất lượng cao và trải nghiệm mạng xã hội hiện đại.",
  keywords: [
    "đăng ký chatapp",
    "tạo tài khoản",
    "đăng ký tài khoản chat",
    "nhắn tin trực tuyến",
    "kết nối bạn bè",
    "chat realtime",
  ],
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Đăng ký tài khoản ChatApp | Kết nối Realtime",
    description:
      "Tạo tài khoản ChatApp miễn phí để kết nối bạn bè, nhắn tin tức thì tốc độ cao và bảo mật tuyệt đối.",
    url: "/register",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Đăng ký tài khoản ChatApp | Kết nối Realtime",
    description:
      "Tạo tài khoản ChatApp miễn phí để kết nối bạn bè, nhắn tin tức thì tốc độ cao.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://chatapp.vn/register",
      url: "https://chatapp.vn/register",
      name: "Đăng ký tài khoản ChatApp",
      description:
        "Tạo tài khoản ChatApp miễn phí để kết nối bạn bè, nhắn tin realtime, gọi thoại chất lượng cao.",
      inLanguage: "vi-VN",
      potentialAction: {
        "@type": "RegisterAction",
        target: ["https://chatapp.vn/register"],
      },
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
          name: "Đăng ký",
          item: "https://chatapp.vn/register",
        },
      ],
    },
  ],
};

export default function RegisterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Register />
    </>
  );
}
