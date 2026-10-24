import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "./providers";
import ClientShell from "./components/ClientShell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatapp.vn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ChatApp - Realtime Chat & Social Platform",
    template: "%s | ChatApp",
  },
  description: "Giao thức nhắn tin thế hệ mới, trò chuyện tức thì, kết nối đa nền tảng tốc độ cao và bảo mật.",
  applicationName: "ChatApp",
  authors: [{ name: "ChatApp Team" }],
  generator: "Next.js",
  keywords: [
    "chat trực tuyến",
    "ứng dụng nhắn tin",
    "realtime chat",
    "mạng xã hội",
    "gọi video miễn phí",
    "chatapp",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "ChatApp",
    title: "ChatApp - Realtime Chat & Social Platform",
    description: "Giao thức nhắn tin thế hệ mới, trò chuyện tức thì, kết nối đa nền tảng.",
    images: [
      {
        url: "/favicon.svg",
        width: 512,
        height: 512,
        alt: "ChatApp Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatApp - Realtime Chat & Social Platform",
    description: "Giao thức nhắn tin thế hệ mới, trò chuyện tức thì, kết nối đa nền tảng.",
    images: ["/favicon.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>
            <ClientShell>{children}</ClientShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
