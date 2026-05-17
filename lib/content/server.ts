import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { blogEditorial, homepageSelectionScore } from "./blogFormat";
import { ensureLegalDocumentDefaults } from "./store";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const contentPrisma = new PrismaClient({ adapter });

export async function getLegalDocumentBySlug(slug: string) {
  await ensureLegalDocumentDefaults(contentPrisma);
  return contentPrisma.legalDocument.findUnique({ where: { slug } });
}

export async function getPublishedBlogPosts() {
  const posts = await contentPrisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
  return posts.filter((post) => blogEditorial(post.body).showOnBlogsIndex);
}

export async function getHomepageBlogPosts(limit = 3) {
  const posts = await contentPrisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });

  const homepagePosts = posts
    .filter((post) => blogEditorial(post.body).showOnHomepage)
    .sort((a, b) => {
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

  if (homepagePosts.length) return homepagePosts;

  return posts
    .filter((post) => blogEditorial(post.body).showOnBlogsIndex)
    .slice(0, limit);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  return contentPrisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  });
}
