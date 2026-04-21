import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { ensureLegalDocumentDefaults } from "../../../../lib/content/store";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    await ensureLegalDocumentDefaults(prisma);
    const documents = await prisma.legalDocument.findMany({
      orderBy: { title: "asc" },
    });
    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load legal documents" },
      { status: 500 }
    );
  }
}
