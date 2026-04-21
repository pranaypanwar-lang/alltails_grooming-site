import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { ensureBlogPostDefaults, ensureLegalDocumentDefaults } from "./store";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const contentPrisma = new PrismaClient({ adapter });

export async function getLegalDocumentBySlug(slug: string) {
  await ensureLegalDocumentDefaults(contentPrisma);
  return contentPrisma.legalDocument.findUnique({ where: { slug } });
}

export async function getPublishedBlogPosts() {
  await ensureBlogPostDefaults(contentPrisma);
  return contentPrisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getPublishedBlogPostBySlug(slug: string) {
  await ensureBlogPostDefaults(contentPrisma);
  return contentPrisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  });
}
