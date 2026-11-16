import type { MetadataRoute } from "next";

/**
 * Tệp cấu hình robots.txt tự động của Next.js 16
 * Tối ưu hóa SEO (Google, Bing) và GEO (Generative Engine Optimization cho GPTBot, ClaudeBot, PerplexityBot)
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatapp.vn";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/profile",
          "/profile/*",
          "/login",
          "/register",
          "/sitemap.xml",
        ],
        disallow: [
          "/chat",
          "/chat/*",
          "/api/*",
          "/forgot-password",
          "/profile/edit",
        ],
      },
      // Quy tắc định tuyến riêng cho AI & Generative Search Engines (GEO)
      {
        userAgent: ["GPTBot", "ChatGPT-User"],
        allow: ["/", "/explore", "/profile/*"],
        disallow: ["/chat", "/api/*"],
      },
      {
        userAgent: ["ClaudeBot", "anthropic-ai"],
        allow: ["/", "/explore", "/profile/*"],
        disallow: ["/chat", "/api/*"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/explore", "/profile/*"],
        disallow: ["/chat", "/api/*"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/explore", "/profile/*"],
        disallow: ["/chat", "/api/*"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

