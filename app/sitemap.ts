import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/businessInfo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/packages`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/booking`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blogs`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-and-conditions`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cancellation-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  return staticRoutes;
}
