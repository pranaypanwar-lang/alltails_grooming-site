import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ALLOWED_FIELDS = ["name", "isActive", "opsLeadName", "opsLeadPhone", "telegramChatId", "telegramAlertsEnabled"] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id },
      data,
    });

    return NextResponse.json({ team });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Team not found" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
