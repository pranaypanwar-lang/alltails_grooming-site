import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/businessInfo";

// Same disallow list applies to every crawler — we don't want admin, groomer
// portals, payment pages, or the API surface indexed or trained on. AI bots
// get explicit allow rules so they're treated as first-class citizens (the
// /llms.txt and /llms-full.txt endpoints give them what they need to answer
// well).
const SHARED_DISALLOW = [
  "/admin/",
  "/admin-login",
  "/groomer",
  "/groomer/",
  "/groomer-login",
  "/pay/",
  "/api/",
  "/booking-preview",
];

const AI_CRAWLERS = [
  "GPTBot",          // OpenAI — ChatGPT browse, training
  "OAI-SearchBot",   // OpenAI search index
  "ChatGPT-User",    // ChatGPT browse on user behalf
  "ClaudeBot",       // Anthropic — Claude.ai citations
  "anthropic-ai",    // Anthropic legacy UA
  "Claude-Web",      // Anthropic web search
  "PerplexityBot",   // Perplexity search index
  "Perplexity-User", // Perplexity browse on user behalf
  "Google-Extended", // Google AI / Gemini training
  "Bingbot",         // Bing index (also feeds Copilot)
  "Applebot-Extended", // Apple Intelligence training
  "CCBot",           // Common Crawl (powers many LLMs)
  "Bytespider",      // ByteDance / TikTok
  "Amazonbot",       // Amazon AI
  "DuckAssistBot",   // DuckDuckGo AI
  "cohere-ai",       // Cohere
  "Meta-ExternalAgent", // Meta AI
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: SHARED_DISALLOW,
      },
      // Explicit allow + disallow for AI crawlers. We want the public site
      // (homepage, packages, FAQ, blogs, llms.txt) to be available for
      // citation, but the same admin/groomer/api surface is off-limits.
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: SHARED_DISALLOW,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
