import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/businessInfo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/admin-login",
          "/groomer",
          "/groomer/",
          "/groomer-login",
          "/pay/",
          "/api/",
          "/booking-preview",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
