import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma";
import { parsePreparedBlogsBatch } from "../lib/content/preparedBlogImport";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    throw new Error("Usage: npx tsx scripts/reimportPreparedBlogsFile.ts <path-to-prepared-blogs-file>");
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const raw = (await fs.readFile(filePath, "utf8")).trim();
  if (!raw) throw new Error(`Prepared blogs file is empty: ${filePath}`);

  const posts = parsePreparedBlogsBatch(raw);
  if (!posts.length) {
    throw new Error("No prepared blog entries were detected in the provided file.");
  }

  let updated = 0;

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

    updated += 1;
    console.log(`reimported ${post.slug}`);
  }

  console.log(`reimported ${updated} posts from ${filePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
