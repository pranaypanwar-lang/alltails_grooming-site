import type { Prisma, PrismaClient } from "../generated/prisma";
import { LEGAL_DOCUMENT_DEFAULTS } from "./defaults";

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
