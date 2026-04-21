import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { ensureBlogPostDefaults } from "../../../../lib/content/store";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    await ensureBlogPostDefaults(prisma);
    const posts = await prisma.blogPost.findMany({
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load blog posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const slug = slugify(String(body.slug || title));
    const excerpt = String(body.excerpt || "").trim();
    const content = String(body.body || "").trim();

    if (!title || !slug || !excerpt || !content) {
      return NextResponse.json(
        { error: "Title, slug, excerpt, and body are required." },
        { status: 400 }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        body: content,
        category: String(body.category || "").trim() || null,
        coverImageUrl: String(body.coverImageUrl || "").trim() || null,
        readTimeMinutes: Math.max(1, Number(body.readTimeMinutes || 5)),
        isPublished: Boolean(body.isPublished),
        publishedAt: body.isPublished ? new Date() : null,
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create blog post" },
      { status: 500 }
    );
  }
}
