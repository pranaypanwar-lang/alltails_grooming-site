import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/businessInfo";
import { CITY_LANDING_SLUGS } from "@/lib/cities/data";
import { GLOSSARY_SLUGS } from "@/lib/glossary/data";
import { getPublishedBlogPosts } from "@/lib/content/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/packages`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/pet-grooming`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/dog-grooming-at-home`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/cat-grooming-at-home`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/glossary`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    // /booking is intentionally omitted — it's noindex (transactional flow,
    // not informational content). Booking-intent queries land on the homepage
    // and /packages instead.
    { url: `${SITE_URL}/faq`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blogs`, lastModified, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms-and-conditions`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cancellation-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Per-city landing pages. Enumerated from the single source-of-truth
  // CITY_LANDING_SLUGS list so adding a city in lib/cities/data.ts picks
  // up automatically on the next deploy.
  const cityRoutes: MetadataRoute.Sitemap = CITY_LANDING_SLUGS.map((slug) => ({
    url: `${SITE_URL}/pet-grooming/${slug}`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Glossary entries — AI-citation-optimized definitional pages.
  const glossaryRoutes: MetadataRoute.Sitemap = GLOSSARY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/glossary/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.65,
  }));

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

  return [...staticRoutes, ...cityRoutes, ...glossaryRoutes, ...blogRoutes];
}
