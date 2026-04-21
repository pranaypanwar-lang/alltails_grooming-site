import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const { id } = await params;

    const slot = await prisma.slot.findUnique({ where: { id } });
    if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 });
    if (!slot.isBlocked) return NextResponse.json({ error: "Slot is not blocked" }, { status: 400 });

    const updated = await prisma.slot.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedReason: null,
        blockedAt: null,
        blockedByAdminUser: null,
      },
    });

    return NextResponse.json({ slot: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
