import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
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

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Blog post not found." }, { status: 404 });
    }

    const isPublishingNow = Boolean(body.isPublished) && !existing.isPublished;

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        slug,
        excerpt,
        body: content,
        category: String(body.category || "").trim() || null,
        coverImageUrl: String(body.coverImageUrl || "").trim() || null,
        readTimeMinutes: Math.max(1, Number(body.readTimeMinutes || 5)),
        isPublished: Boolean(body.isPublished),
        publishedAt: Boolean(body.isPublished)
          ? existing.publishedAt ?? (isPublishingNow ? new Date() : existing.publishedAt)
          : null,
      },
    });

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update blog post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
