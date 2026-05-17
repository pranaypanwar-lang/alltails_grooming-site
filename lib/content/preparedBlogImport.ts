import { parseDraftBlocks, stripInlineMarkdown } from "./draftParser";
import { stringifyBlogDocument } from "./blogFormat";

type PreparedBlogImport = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTimeMinutes: number;
  coverImageUrl: null;
  body: string;
  isPublished: true;
};

function normalizeRupees(value: string) {
  return value.replace(/₹/g, "Rs ");
}

function cleanText(value: string) {
  return normalizeRupees(value)
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/ /g, " ")
    .trim();
}

function stripTrailingDivider(value: string) {
  return value.replace(/\n\s*---+\s*$/g, "").replace(/\s*---+\s*$/g, "").trim();
}

function inferCategory(title: string) {
  if (/(delhi|gurgaon|noida|chandigarh|mohali|panchkula|ludhiana|patiala)/i.test(title)) return "City Guide";
  if (/\bvs\b|better\?/i.test(title)) return "Comparison Guide";
  if (/(shih tzu|persian cat|golden retriever|lhasa apso|pomeranian|labrador)/i.test(title)) return "Breed Guide";
  if (/(summer|monsoon|diwali)/i.test(title)) return "Seasonal Guide";
  if (/(anxiety|tick|flea|matted|diy)/i.test(title)) return "Care Guide";
  return "Pet Grooming Guide";
}

function estimateReadTime(text: string) {
  const words = cleanText(text).split(/\s+/).filter(Boolean).length;
  return Math.max(4, Math.round(words / 220));
}

// ── OLD FORMAT (# SEO Details / **Field:** value) ─────────────────────────────

function extractField(section: string, label: string) {
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*[\\t ]*\\n?([\\s\\S]*?)(?=\\n\\*\\*[A-Za-z ]+:\\*\\*|\\n# |$)`, "i");
  const match = section.match(pattern);
  return stripTrailingDivider(match?.[1]?.trim() || "");
}

function extractSlug(section: string) {
  const value = extractField(section, "URL Slug");
  const codeMatch = value.match(/`([^`]+)`/);
  const raw = codeMatch?.[1] || value;
  return raw.replace(/^\/blogs\//, "").replace(/^\/+/, "").trim();
}

function extractFaqs(section: string) {
  const faqMatch = section.match(/# FAQs\s+([\s\S]*?)(?=\n# Recommended FAQ Schema|\n# Recommended Article Schema|$)/i);
  if (!faqMatch) return [];
  const faqSection = faqMatch[1].trim();
  return faqSection
    .split(/\n##\s+/)
    .map((part, index) => (index === 0 ? part.replace(/^##\s+/, "") : part))
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      const lines = entry.split("\n").map((line) => cleanText(line)).filter(Boolean);
      const question = stripInlineMarkdown(lines[0] || "");
      const answer = stripInlineMarkdown(lines.slice(1).join(" ").trim());
      return { question, answer };
    })
    .filter((faq) => faq.question && faq.answer);
}

function extractBodyMarkdown(section: string, title: string) {
  const bodyStart = section.indexOf(`# ${title}`);
  if (bodyStart === -1) throw new Error(`Could not find article title heading for "${title}".`);
  const body = section.slice(bodyStart).replace(new RegExp(`^# ${title}\\s*`, "m"), "").trim();
  return stripTrailingDivider(cleanText(body.split(/\n# FAQs\b/i)[0]?.trim() || ""));
}

function makeDocument(section: string, title: string, excerpt: string) {
  const seoTitle = cleanText(extractField(section, "SEO Title"));
  const metaDescription = cleanText(extractField(section, "Meta Description")) || excerpt;
  const primaryKeyword = cleanText(extractField(section, "Primary Keyword"));
  const secondaryKeywords = cleanText(extractField(section, "Secondary Keywords"))
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  return stringifyBlogDocument({
    version: 1,
    seoTitle,
    metaDescription,
    primaryKeyword,
    secondaryKeywords,
    blocks: parseDraftBlocks(extractBodyMarkdown(section, title)),
    faqs: extractFaqs(section),
  });
}

function parseOldSection(section: string): PreparedBlogImport | null {
  const title = cleanText(extractField(section, "Blog Title"));
  const slug = extractSlug(section);
  if (!title || !slug) return null;
  const excerpt = cleanText(extractField(section, "Meta Description"));
  return {
    slug,
    title,
    excerpt,
    category: inferCategory(title),
    readTimeMinutes: estimateReadTime(section),
    coverImageUrl: null,
    body: makeDocument(section, title, excerpt),
    isPublished: true,
  };
}

// ── NEW FORMAT (# BLOG N: / ## FIELD / ```txt value ```) ─────────────────────

function extractNewField(section: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // With code block
  const codePattern = new RegExp(
    `^##\\s+${escaped}\\s*\\n+\`\`\`(?:txt|markdown|md)?\\s*\\n([\\s\\S]*?)\`\`\``,
    "im"
  );
  const codeMatch = section.match(codePattern);
  if (codeMatch) return codeMatch[1].trim();
  // Fallback: plain line after heading
  const plainPattern = new RegExp(`^##\\s+${escaped}\\s*\\n([^#\`][^\\n]*)`, "im");
  return section.match(plainPattern)?.[1]?.trim() || "";
}

function extractNewBody(section: string): string {
  const match = section.match(/^#\s+ARTICLE BODY\s*\n+```(?:txt|markdown|md)?\s*\n([\s\S]*?)```/im);
  return match ? stripTrailingDivider(cleanText(match[1].trim())) : "";
}

function extractNewFaqs(section: string): Array<{ question: string; answer: string }> {
  const match = section.match(/^#\s+FAQS FOR SCHEMA\s*\n+```(?:txt|markdown|md)?\s*\n([\s\S]*?)```/im);
  if (!match) return [];
  return match[1]
    .trim()
    .split(/\n\n+/)
    .filter(Boolean)
    .map((pair) => {
      const lines = pair.split("\n").filter(Boolean);
      if (lines.length < 2) return null;
      return {
        question: stripInlineMarkdown(cleanText(lines[0])),
        answer: stripInlineMarkdown(cleanText(lines.slice(1).join(" "))),
      };
    })
    .filter((faq): faq is { question: string; answer: string } =>
      Boolean(faq?.question && faq?.answer)
    );
}

function parseNewSection(section: string): PreparedBlogImport | null {
  const title = cleanText(extractNewField(section, "BLOG TITLE"));
  const slug = cleanText(extractNewField(section, "URL SLUG"))
    .replace(/^\/blogs\//, "")
    .replace(/^\/+/, "")
    .trim();
  if (!title || !slug) return null;

  const seoTitle = cleanText(extractNewField(section, "SEO TITLE"));
  const metaDescription = cleanText(extractNewField(section, "META DESCRIPTION"));
  const primaryKeyword = cleanText(extractNewField(section, "PRIMARY KEYWORD"));
  const secondaryKeywords = cleanText(extractNewField(section, "SECONDARY KEYWORDS"))
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryRaw = cleanText(extractNewField(section, "CATEGORY"));
  const readTimeRaw = cleanText(extractNewField(section, "READING TIME"));
  const excerpt = cleanText(extractNewField(section, "SHORT EXCERPT")) || metaDescription;

  const bodyMarkdown = extractNewBody(section);
  if (!bodyMarkdown) return null;

  const readTimeMinutes = readTimeRaw
    ? Math.max(4, parseInt(readTimeRaw, 10) || estimateReadTime(bodyMarkdown))
    : estimateReadTime(bodyMarkdown);

  return {
    slug,
    title,
    excerpt,
    category: categoryRaw || inferCategory(title),
    readTimeMinutes,
    coverImageUrl: null,
    body: stringifyBlogDocument({
      version: 1,
      seoTitle,
      metaDescription,
      primaryKeyword,
      secondaryKeywords,
      blocks: parseDraftBlocks(bodyMarkdown),
      faqs: extractNewFaqs(section),
    }),
    isPublished: true,
  };
}

// ── ENTRY POINT ───────────────────────────────────────────────────────────────

export function parsePreparedBlogsBatch(raw: string): PreparedBlogImport[] {
  const normalized = raw.replace(/\r\n/g, "\n");

  // New format: sections start with "# BLOG N:" and fields use ## HEADING + ```txt blocks
  if (/^##\s+BLOG TITLE\s*$/im.test(normalized)) {
    return normalized
      .split(/(?=^#\s+BLOG\s+\d+[:\s])/im)
      .map((s) => s.trim())
      .filter((s) => /^##\s+BLOG TITLE\s*$/im.test(s))
      .map(parseNewSection)
      .filter((s): s is PreparedBlogImport => Boolean(s));
  }

  // Old format: sections start with "# SEO Details" and fields use **Bold:** style
  return normalized
    .split(/(?=^# SEO Details\s*$)/m)
    .map((section) => section.trim())
    .filter((section) => section.includes("**Blog Title:**"))
    .map(parseOldSection)
    .filter((section): section is PreparedBlogImport => Boolean(section));
}
