import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/businessInfo";
import { getPublishedBlogPosts } from "@/lib/content/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedBlogPosts();
    blogRoutes = posts.map((post) => ({
      url: `${SITE_URL}/blogs/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // If the database is unreachable at build time, fall back to static
    // routes only — the next deploy will pick up posts.
  }

  return [...staticRoutes, ...blogRoutes];
}
