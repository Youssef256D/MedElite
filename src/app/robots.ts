import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/faq", "/contact"],
        disallow: ["/admin/", "/student/", "/instructor/", "/login", "/register", "/learn/", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
