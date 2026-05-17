export type BlogTable = {
  headers: string[];
  rows: string[][];
};

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; table: BlogTable }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "callout"; title?: string; text: string };

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogEditorial = {
  showOnHomepage?: boolean;
  showOnBlogsIndex?: boolean;
  homepagePriority?: number;
  featuredLabel?: string;
};

export type BlogDocument = {
  version: 1;
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  heroImageUrl?: string;
  editorial?: BlogEditorial;
  blocks: BlogBlock[];
  faqs?: BlogFaq[];
};

export type ResolvedBlogEditorial = {
  showOnHomepage: boolean;
  showOnBlogsIndex: boolean;
  homepagePriority: number;
  featuredLabel?: string;
};

export type HomepageSelectionCandidate = {
  body: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  readTimeMinutes?: number | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
};

export function resolveBlogEditorial(editorial?: BlogEditorial | null): ResolvedBlogEditorial {
  return {
    showOnHomepage: Boolean(editorial?.showOnHomepage),
    showOnBlogsIndex: editorial?.showOnBlogsIndex ?? true,
    homepagePriority: Number.isFinite(editorial?.homepagePriority)
      ? Number(editorial?.homepagePriority)
      : 999,
    featuredLabel: editorial?.featuredLabel?.trim() || undefined,
  };
}

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
        editorial: parsed.editorial,
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

export function blogEditorial(body: string) {
  return resolveBlogEditorial(parseBlogDocument(body).editorial);
}

export function blogHeadings(body: string) {
  return parseBlogDocument(body).blocks
    .filter((block): block is Extract<BlogBlock, { type: "heading" }> => block.type === "heading")
    .map((block) => ({
      text: block.text,
      level: block.level ?? 2,
    }));
}

export function homepageSelectionScore(candidate: HomepageSelectionCandidate) {
  const document = parseBlogDocument(candidate.body);
  const blocks = document.blocks;
  const imageCount = blocks.filter((block) => block.type === "image").length;
  const headingCount = blocks.filter((block) => block.type === "heading").length;
  const listCount = blocks.filter((block) => block.type === "list").length;
  const tableCount = blocks.filter((block) => block.type === "table").length;
  const excerptLength = candidate.excerpt?.trim().length ?? 0;
  const readTime = candidate.readTimeMinutes ?? 0;
  const hasHero = Boolean(normalizeBlogImageUrl(document.heroImageUrl || candidate.coverImageUrl));
  const featuredLabel = resolveBlogEditorial(document.editorial).featuredLabel;

  let score = 0;
  if (hasHero) score += 10;
  score += Math.min(imageCount, 4) * 4;
  score += Math.min(headingCount, 7) * 2;
  score += Math.min(listCount, 4) * 2;
  score += Math.min(tableCount, 2) * 3;
  if (featuredLabel) score += 4;
  if (document.primaryKeyword) score += 3;
  if (excerptLength >= 110 && excerptLength <= 260) score += 4;
  else if (excerptLength >= 80) score += 2;
  if (readTime >= 6 && readTime <= 14) score += 3;
  else if (readTime >= 4 && readTime <= 18) score += 1;

  return score;
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
