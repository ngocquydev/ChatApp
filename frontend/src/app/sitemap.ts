import type { MetadataRoute } from "next";

/**
 * Tệp tạo sitemap.xml động của Next.js 16
 * Đảm bảo Google, Bing và các bộ máy tìm kiếm AI đánh chỉ mục đầy đủ các trang công khai
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatapp.vn";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
      alternates: {
        languages: {
          vi: `${siteUrl}/?lang=vi`,
          en: `${siteUrl}/?lang=en`,
        },
      },
    },
    {
      url: `${siteUrl}/explore`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          vi: `${siteUrl}/explore?lang=vi`,
          en: `${siteUrl}/explore?lang=en`,
        },
      },
    },
    {
      url: `${siteUrl}/register`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  return staticRoutes;
}
