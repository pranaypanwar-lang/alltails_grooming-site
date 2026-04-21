import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../lib/generated/prisma";
import { ensureBlogPostDefaults } from "../../../lib/content/store";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    await ensureBlogPostDefaults(prisma);

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        coverImageUrl: post.coverImageUrl,
        readTimeMinutes: post.readTimeMinutes,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load blog posts" },
      { status: 500 }
    );
  }
}
