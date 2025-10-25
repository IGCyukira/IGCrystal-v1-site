import type { MetadataRoute } from "next";

function getBaseUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`.replace(/\/$/, "")
    : undefined;
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV; // 'production' | 'preview' | 'development'

  if (env !== "production" && vercelUrl) return vercelUrl;
  if (env === "production" && siteUrl) return siteUrl;
  if (vercelUrl) return vercelUrl;
  if (siteUrl) return siteUrl;
  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: [
        `${baseUrl}/sitemap.xml`,
        "https://blog.IGCrystal.icu/sitemap.xml",
        "https://wenturc.com/sitemap.xml",
    ],
  };
}
