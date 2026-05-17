import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../lib/generated/prisma";
import {
  blogEditorial,
  blogHeroImage,
  homepageSelectionScore,
} from "../../../lib/content/blogFormat";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const surface = searchParams.get("surface")?.trim() || "index";
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || "24"), 100));

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    let visiblePosts = posts
      .filter((post) => {
        const editorial = blogEditorial(post.body);
        if (surface === "homepage") return editorial.showOnHomepage;
        return editorial.showOnBlogsIndex;
      })
      .sort((a, b) => {
        if (surface !== "homepage") return 0;
        const aEditorial = blogEditorial(a.body);
        const bEditorial = blogEditorial(b.body);
        if (aEditorial.homepagePriority !== bEditorial.homepagePriority) {
          return aEditorial.homepagePriority - bEditorial.homepagePriority;
        }
        const scoreDelta =
          homepageSelectionScore({
            body: b.body,
            excerpt: b.excerpt,
            coverImageUrl: b.coverImageUrl,
            readTimeMinutes: b.readTimeMinutes,
            publishedAt: b.publishedAt,
            updatedAt: b.updatedAt,
          }) -
          homepageSelectionScore({
            body: a.body,
            excerpt: a.excerpt,
            coverImageUrl: a.coverImageUrl,
            readTimeMinutes: a.readTimeMinutes,
            publishedAt: a.publishedAt,
            updatedAt: a.updatedAt,
          });
        if (scoreDelta !== 0) return scoreDelta;
        const aTime = a.publishedAt?.getTime() ?? a.updatedAt.getTime();
        const bTime = b.publishedAt?.getTime() ?? b.updatedAt.getTime();
        return bTime - aTime;
      })
      .slice(0, limit);

    if (surface === "homepage" && visiblePosts.length === 0) {
      visiblePosts = posts
        .filter((post) => blogEditorial(post.body).showOnBlogsIndex)
        .slice(0, limit);
    }

    return NextResponse.json({
      posts: visiblePosts.map((post) => {
        const editorial = blogEditorial(post.body);
        return ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        category: post.category,
        coverImageUrl: blogHeroImage(post.body, post.coverImageUrl),
        featuredLabel: editorial.featuredLabel ?? null,
        showOnHomepage: editorial.showOnHomepage,
        showOnBlogsIndex: editorial.showOnBlogsIndex,
        homepagePriority: editorial.homepagePriority,
        readTimeMinutes: post.readTimeMinutes,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      })}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load blog posts" },
      { status: 500 }
    );
  }
}
