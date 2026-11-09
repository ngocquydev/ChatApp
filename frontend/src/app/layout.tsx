import type { Metadata, Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import Providers from "./providers";
import ClientShell from "./components/ClientShell";
import JsonLd from "@/components/seo/JsonLd";
import "./globals.css";
import { neutralScale } from "@/theme/tokens";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatapp.vn";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: neutralScale.light[900] },
    { media: "(prefers-color-scheme: dark)", color: neutralScale.dark[100] },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ChatApp - Nền tảng Nhắn tin Realtime & Mạng xã hội",
    template: "%s | ChatApp",
  },
  description:
    "ChatApp - Ứng dụng trò chuyện thời gian thực, gọi thoại & video WebRTC tốc độ cao, gợi ý kết bạn thông minh và hệ thống kiểm duyệt AI an toàn.",
  applicationName: "ChatApp",
  authors: [{ name: "ChatApp Team" }],
  generator: "Next.js",
  keywords: [
    "chat trực tuyến",
    "ứng dụng nhắn tin",
    "realtime chat",
    "mạng xã hội",
    "gọi video miễn phí",
    "webrtc video call",
    "gợi ý kết bạn",
    "kiểm duyệt nội dung ai",
    "chatapp",
    "social network",
    "instant messaging",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "vi-VN": "/?lang=vi",
      "en-US": "/?lang=en",
    },
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  verification: {
    google: "ETQbKAkcAHUAScfz_ML9MH0aXZS9dq2w5Ie_plWT2Dw",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    url: siteUrl,
    siteName: "ChatApp",
    title: "ChatApp - Nền tảng Nhắn tin Realtime & Mạng xã hội",
    description:
      "Ứng dụng nhắn tin tức thì, gọi thoại & video HD qua WebRTC, kết nối bạn bè thông minh và bảo mật tối đa.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ChatApp Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatApp - Nền tảng Nhắn tin Realtime & Mạng xã hội",
    description:
      "Ứng dụng nhắn tin tức thì, gọi thoại & video HD qua WebRTC, kết nối bạn bè thông minh và bảo mật tối đa.",
    images: ["/logo.png"],
    site: "@chatapp",
    creator: "@chatapp",
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

const globalStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ChatApp",
      description:
        "Nền tảng mạng xã hội và trò chuyện tức thì bảo mật, hỗ trợ gợi ý kết bạn thông minh và gọi video WebRTC.",
      inLanguage: ["vi-VN", "en-US"],
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/explore?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ChatApp",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        "https://github.com/chatapp",
        "https://twitter.com/chatapp",
      ],
    },
    {
      "@type": "SocialMediaApplication",
      "@id": `${siteUrl}/#app`,
      name: "ChatApp",
      operatingSystem: "Web, iOS, Android",
      applicationCategory: "SocialNetworkingApplication, CommunicationApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "VND",
      },
      featureList: [
        "Real-time instant messaging via MQTT & Socket.IO",
        "HD Peer-to-Peer Voice & Video Calls via WebRTC",
        "AI-Powered Content Moderation and Bot Protection",
        "Neo4j Graph Database Friend Recommendations (Friends-of-Friends & Network Centrality)",
        "Bilingual VI/EN Interface",
        "End-to-End Privacy Controls",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <JsonLd data={globalStructuredData} />
      </head>
      <body>
        {/* Phải khớp cssVariables.colorSchemeSelector = "data" trong theme.ts */}
        <InitColorSchemeScript attribute="data" defaultMode="system" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>
            <ClientShell>{children}</ClientShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
