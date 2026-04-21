import type { Prisma, PrismaClient } from "../generated/prisma";
import { BLOG_POST_DEFAULTS, LEGAL_DOCUMENT_DEFAULTS } from "./defaults";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function ensureLegalDocumentDefaults(prisma: DbClient) {
  await Promise.all(
    LEGAL_DOCUMENT_DEFAULTS.map((doc) =>
      prisma.legalDocument.upsert({
        where: { slug: doc.slug },
        update: {},
        create: doc,
      })
    )
  );
}

export async function ensureBlogPostDefaults(prisma: DbClient) {
  await Promise.all(
    BLOG_POST_DEFAULTS.map((post) =>
      prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {},
        create: {
          ...post,
          publishedAt: post.isPublished ? new Date() : null,
        },
      })
    )
  );
}
