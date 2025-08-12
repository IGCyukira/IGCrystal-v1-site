import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://wenturc.com";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}


