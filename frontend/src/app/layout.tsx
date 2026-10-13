import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "./providers";
import ClientShell from "./components/ClientShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatApp - Realtime Chat & Social Platform",
  description: "Giao thức nhắn tin thế hệ mới, trò chuyện tức thì, kết nối đa nền tảng.",
  icons: {
    icon: "/favicon.svg",
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
