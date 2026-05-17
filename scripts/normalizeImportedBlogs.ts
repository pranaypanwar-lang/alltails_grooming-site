import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma";
import { parseBlogDocument, stringifyBlogDocument } from "../lib/content/blogFormat";
import { blockToDraft, parseDraftBlocks, stripInlineMarkdown } from "../lib/content/draftParser";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function normalizeKeywords(items: string[] | undefined) {
  return (items || [])
    .map((item) => stripInlineMarkdown(String(item).replace(/\s*---+\s*$/g, "").trim()))
    .filter(Boolean);
}

function normalizeFaqs(faqs: { question: string; answer: string }[] | undefined) {
  return (faqs || [])
    .map((faq) => ({
      question: stripInlineMarkdown(faq.question || ""),
      answer: stripInlineMarkdown((faq.answer || "").replace(/\s*---+\s*$/g, "").trim()),
    }))
    .filter((faq) => faq.question && faq.answer);
}

async function main() {
  const sinceArg = process.argv[2];
  const since = sinceArg ? new Date(sinceArg) : new Date("2026-05-16T00:00:00.000Z");

  const posts = await prisma.blogPost.findMany({
    where: { updatedAt: { gte: since }, isPublished: true },
    select: { id: true, slug: true, body: true },
    orderBy: { updatedAt: "desc" },
  });

  let updated = 0;

  for (const post of posts) {
    const document = parseBlogDocument(post.body);
    const draft = document.blocks.map(blockToDraft).filter(Boolean).join("\n\n");
    const normalized = {
      version: 1 as const,
      seoTitle: document.seoTitle?.trim() || undefined,
      metaDescription: stripInlineMarkdown(document.metaDescription || "") || undefined,
      primaryKeyword: stripInlineMarkdown(document.primaryKeyword || "") || undefined,
      secondaryKeywords: normalizeKeywords(document.secondaryKeywords),
      heroImageUrl: document.heroImageUrl?.trim() || undefined,
      blocks: parseDraftBlocks(draft),
      faqs: normalizeFaqs(document.faqs),
    };

    const nextBody = stringifyBlogDocument(normalized);
    if (nextBody !== post.body) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { body: nextBody },
      });
      updated += 1;
      console.log(`normalized ${post.slug}`);
    }
  }

  console.log(`updated ${updated} posts out of ${posts.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
