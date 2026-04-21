import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { LEGAL_DOCUMENT_DEFAULTS } from "../../../../../lib/content/defaults";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { slug } = await params;
    const body = await request.json();
    const fallback = LEGAL_DOCUMENT_DEFAULTS.find((item) => item.slug === slug);
    if (!fallback) {
      return NextResponse.json({ error: "Legal document not found." }, { status: 404 });
    }

    const document = await prisma.legalDocument.upsert({
      where: { slug },
      update: {
        title: String(body.title || "").trim() || fallback.title,
        summary: String(body.summary || "").trim() || fallback.summary,
        effectiveDate: String(body.effectiveDate || "").trim() || fallback.effectiveDate,
        body: String(body.body || "").trim() || fallback.body,
      },
      create: {
        slug,
        title: String(body.title || "").trim() || fallback.title,
        summary: String(body.summary || "").trim() || fallback.summary,
        effectiveDate: String(body.effectiveDate || "").trim() || fallback.effectiveDate,
        body: String(body.body || "").trim() || fallback.body,
      },
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update legal document" },
      { status: 500 }
    );
  }
}
