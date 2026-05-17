/**
 * Import script for Batch 1 blogs (flat-field format).
 * Usage: npx tsx scripts/importBatch1Blogs.ts <path-to-txt-file>
 *
 * Uses the same 5 shared template images for all SEO/AEO blogs.
 * Images must already be present at public/images/blogs/TEMPLATE{1-5}.png
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma";
import { parseDraftBlocks, stripInlineMarkdown } from "../lib/content/draftParser";
import { stringifyBlogDocument } from "../lib/content/blogFormat";
import type { BlogBlock, BlogDocument } from "../lib/content/blogFormat";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Template images shared across all SEO/AEO blogs ─────────────────────────

const TEMPLATE_IMAGES = [
  {
    src: "/images/blogs/TEMPLATE1.png",
    alt: "Premium at-home dog grooming session by All Tails",
    caption: "All Tails brings professional grooming inside your home so your pet stays calm and comfortable.",
  },
  {
    src: "/images/blogs/TEMPLATE2.png",
    alt: "All Tails grooming package prices: Essential Care, Signature Care, Complete Pampering",
    caption: "Essential Care starts at Rs 999, Signature Care at Rs 1,299 and Complete Pampering at Rs 1,799.",
  },
  {
    src: "/images/blogs/TEMPLATE3.png",
    alt: "At-home pet grooming setup with portable grooming kit and waterproof mats",
    caption: "The All Tails team sets up inside your home using waterproof mats and professional tools.",
  },
  {
    src: "/images/blogs/TEMPLATE4.png",
    alt: "Dog itching in monsoon: signs to watch for",
    caption: "A visual guide to the most important grooming signs and decisions for pet parents.",
  },
  {
    src: "/images/blogs/TEMPLATE5.png",
    alt: "Calm dog with All Tails grooming kit at home",
    caption: "At-home grooming keeps your pet in a familiar environment for a stress-free session.",
  },
];

// ── Parser for the flat-field batch format ───────────────────────────────────

function fieldValue(section: string, fieldName: string): string {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${escaped}\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+\\n|\\n[A-Z][A-Z ]+$|$)`,
    "m"
  );
  return section.match(pattern)?.[1]?.trim() ?? "";
}

function extractArticleBody(section: string): string {
  const start = section.indexOf("\nARTICLE BODY\n");
  if (start === -1) return "";
  const bodyStart = start + "\nARTICLE BODY\n".length;
  const end = section.indexOf("\nFAQS FOR SCHEMA\n", bodyStart);
  return end === -1
    ? section.slice(bodyStart).trim()
    : section.slice(bodyStart, end).trim();
}

function extractFaqs(section: string): Array<{ question: string; answer: string }> {
  const start = section.indexOf("\nFAQS FOR SCHEMA\n");
  if (start === -1) return [];
  const faqStart = start + "\nFAQS FOR SCHEMA\n".length;
  const end = section.indexOf("\nSTANDARD IMAGE PLAN\n", faqStart);
  const raw = end === -1 ? section.slice(faqStart) : section.slice(faqStart, end);
  return raw
    .trim()
    .split(/\n\n+/)
    .map((pair) => {
      const lines = pair.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      return {
        question: stripInlineMarkdown(lines[0]),
        answer: stripInlineMarkdown(lines.slice(1).join(" ")),
      };
    })
    .filter((faq): faq is { question: string; answer: string } =>
      Boolean(faq?.question && faq?.answer)
    );
}

function injectTemplateImages(blocks: BlogBlock[]): BlogBlock[] {
  if (blocks.length === 0) return blocks;
  const result: BlogBlock[] = [];

  // Positions to insert images (after which block index in the original)
  // 0 → after first paragraph (hero image)
  // after packages table → template 2
  // ~40% through → template 3
  // ~65% through → template 4
  // near end (before last 2 blocks) → template 5

  const total = blocks.length;
  const insertPoints = [
    1,                          // after block 0 → TEMPLATE1
    -1,                         // after packages table → TEMPLATE2 (dynamic below)
    Math.floor(total * 0.4),    // TEMPLATE3
    Math.floor(total * 0.65),   // TEMPLATE4
    Math.max(total - 3, Math.floor(total * 0.8)), // TEMPLATE5
  ];

  // Find the packages table block index for TEMPLATE2
  const tableIdx = blocks.findIndex((b) => b.type === "table");
  insertPoints[1] = tableIdx >= 0 ? tableIdx + 1 : Math.floor(total * 0.2);

  // Deduplicate and sort insert points
  const sorted = [...new Set(insertPoints)].sort((a, b) => a - b);

  let imgIdx = 0;
  for (let i = 0; i <= blocks.length; i++) {
    if (i < blocks.length) result.push(blocks[i]);
    if (sorted.includes(i) && imgIdx < TEMPLATE_IMAGES.length) {
      result.push({
        type: "image",
        src: TEMPLATE_IMAGES[imgIdx].src,
        alt: TEMPLATE_IMAGES[imgIdx].alt,
        caption: TEMPLATE_IMAGES[imgIdx].caption,
      });
      imgIdx++;
    }
  }

  return result;
}

function parseBlogSection(section: string): {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTimeMinutes: number;
  coverImageUrl: string | null;
  body: string;
  isPublished: boolean;
} | null {
  const title = fieldValue(section, "BLOG TITLE");
  const slug = fieldValue(section, "URL SLUG");
  if (!title || !slug) return null;

  const seoTitle = fieldValue(section, "SEO TITLE");
  const metaDescription = fieldValue(section, "META DESCRIPTION");
  const primaryKeyword = fieldValue(section, "PRIMARY KEYWORD");
  const secondaryKeywords = fieldValue(section, "SECONDARY KEYWORDS")
    .split(/\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const categoryRaw = fieldValue(section, "CATEGORY");
  const readTimeRaw = fieldValue(section, "READING TIME");
  const excerpt = fieldValue(section, "SHORT EXCERPT") || metaDescription;
  const showOnHomepageRaw = fieldValue(section, "SHOW ON HOMEPAGE CARDS");
  const showOnBlogsIndexRaw = fieldValue(section, "SHOW ON BLOGS INDEX");
  const sortOrderRaw = fieldValue(section, "SORT ORDER");
  const featuredLabel = fieldValue(section, "FEATURED LABEL");

  const bodyMarkdown = extractArticleBody(section);
  if (!bodyMarkdown) return null;

  const faqs = extractFaqs(section);
  const readTimeMinutes = readTimeRaw ? Math.max(4, parseInt(readTimeRaw, 10) || 8) : 8;
  const showOnHomepage = /^yes$/i.test(showOnHomepageRaw.trim());
  const showOnBlogsIndex = !/^no$/i.test(showOnBlogsIndexRaw.trim());
  const homepagePriority = sortOrderRaw ? parseInt(sortOrderRaw, 10) : 999;

  const rawBlocks = parseDraftBlocks(bodyMarkdown);
  const blocks = injectTemplateImages(rawBlocks);

  const document: BlogDocument = {
    version: 1,
    seoTitle,
    metaDescription,
    primaryKeyword,
    secondaryKeywords,
    heroImageUrl: TEMPLATE_IMAGES[0].src,
    editorial: {
      showOnHomepage,
      showOnBlogsIndex,
      homepagePriority,
      featuredLabel: featuredLabel || undefined,
    },
    blocks,
    faqs,
  };

  return {
    slug,
    title,
    excerpt,
    category: categoryRaw || "Pet Grooming Guide",
    readTimeMinutes,
    coverImageUrl: TEMPLATE_IMAGES[0].src,
    body: stringifyBlogDocument(document),
    isPublished: true,
  };
}

function parseBatch(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n={30,}\n/)
    .map((s) => s.trim())
    .filter((s) => /^BLOG TITLE\s*\n/m.test(s))
    .map(parseBlogSection)
    .filter((s): s is NonNullable<ReturnType<typeof parseBlogSection>> => Boolean(s));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: npx tsx scripts/importBatch1Blogs.ts <path-to-txt-file>");
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = (await fs.readFile(filePath, "utf8")).trim();
  if (!raw) throw new Error(`File is empty: ${filePath}`);

  const posts = parseBatch(raw);
  if (!posts.length) {
    throw new Error("No blog entries detected. Check the file format.");
  }

  console.log(`Parsed ${posts.length} blog(s). Importing...`);

  for (const post of posts) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        readTimeMinutes: post.readTimeMinutes,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        readTimeMinutes: post.readTimeMinutes,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    console.log(`  ✓  ${post.slug}`);
  }

  console.log(`\nDone. ${posts.length} blog(s) imported.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
