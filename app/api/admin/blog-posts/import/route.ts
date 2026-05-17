import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { parsePreparedBlogsBatch } from "../../../../../lib/content/preparedBlogImport";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const raw = String(body.raw || "").trim();
    if (!raw) {
      return NextResponse.json({ error: "Raw blog batch text is required." }, { status: 400 });
    }

    const posts = parsePreparedBlogsBatch(raw);
    if (!posts.length) {
      return NextResponse.json(
        { error: "No blog entries were detected. Paste the prepared blog batch format." },
        { status: 400 }
      );
    }

    const results = [];
    for (const post of posts) {
      const saved = await prisma.blogPost.upsert({
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
      results.push({ id: saved.id, slug: saved.slug, title: saved.title });
    }

    return NextResponse.json({ imported: results.length, posts: results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import blog batch" },
      { status: 500 }
    );
  }
}
