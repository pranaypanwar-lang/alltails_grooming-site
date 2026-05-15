export type BlogTable = {
  headers: string[];
  rows: string[][];
};

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "list"; items: string[] }
  | { type: "table"; table: BlogTable }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "callout"; title?: string; text: string };

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogDocument = {
  version: 1;
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  heroImageUrl?: string;
  blocks: BlogBlock[];
  faqs?: BlogFaq[];
};

export function isStructuredBlogBody(body: string) {
  const trimmed = body.trim();
  return trimmed.startsWith("{") && trimmed.includes('"blocks"');
}

export function parseBlogDocument(body: string): BlogDocument {
  try {
    const parsed = JSON.parse(body) as Partial<BlogDocument>;
    if (parsed && Array.isArray(parsed.blocks)) {
      return {
        version: 1,
        seoTitle: parsed.seoTitle,
        metaDescription: parsed.metaDescription,
        primaryKeyword: parsed.primaryKeyword,
        secondaryKeywords: Array.isArray(parsed.secondaryKeywords)
          ? parsed.secondaryKeywords.filter(Boolean)
          : [],
        heroImageUrl: parsed.heroImageUrl,
        blocks: parsed.blocks,
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
      };
    }
  } catch {
    // Legacy posts are plain text; fall through to paragraph blocks.
  }

  return {
    version: 1,
    blocks: body
      .split(/\n\s*\n/g)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((text) => ({ type: "paragraph", text })),
    faqs: [],
  };
}

export function stringifyBlogDocument(document: BlogDocument) {
  return JSON.stringify(document, null, 2);
}

export function blogSeoTitle(body: string, fallback: string) {
  return parseBlogDocument(body).seoTitle?.trim() || fallback;
}

export function blogMetaDescription(body: string, fallback: string) {
  return parseBlogDocument(body).metaDescription?.trim() || fallback;
}

export function blogHeroImage(body: string, fallback?: string | null) {
  return normalizeBlogImageUrl(parseBlogDocument(body).heroImageUrl?.trim() || fallback || null);
}

const BLOG_IMAGE_FALLBACKS: Record<string, string> = {
  "/images/blogs/dog-grooming-at-home/hero-grooming-session.png": "/images/Banner.jpg",
  "/images/blogs/dog-grooming-at-home/package-comparison.png": "/images/trust-image-2.jpeg",
  "/images/blogs/dog-grooming-at-home/grooming-kit-setup.png": "/images/trust-image-1.jpeg",
  "/images/blogs/dog-grooming-at-home/complete-pampering.png": "/images/trust-image-3.jpeg",
};

export function normalizeBlogImageUrl(src?: string | null) {
  if (!src) return null;
  return BLOG_IMAGE_FALLBACKS[src] || src;
}
