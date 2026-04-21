import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const serviceAreas = await prisma.serviceArea.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    return NextResponse.json({ serviceAreas });
  } catch (error) {
    console.error("GET /api/admin/service-areas failed", error);
    return NextResponse.json({ error: "Failed to fetch service areas" }, { status: 500 });
  }
}
