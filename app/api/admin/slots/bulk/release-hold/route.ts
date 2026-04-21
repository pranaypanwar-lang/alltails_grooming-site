import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const slotIds = Array.isArray(body.slotIds)
      ? body.slotIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (!slotIds.length) {
      return NextResponse.json({ error: "slotIds is required" }, { status: 400 });
    }

    const slots = await prisma.slot.findMany({
      where: { id: { in: slotIds } },
      select: { id: true, isHeld: true, isBooked: true },
    });

    const releasableIds = slots.filter((slot) => slot.isHeld && !slot.isBooked).map((slot) => slot.id);

    if (releasableIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.slot.updateMany({
          where: { id: { in: releasableIds } },
          data: { isHeld: false, holdExpiresAt: null },
        });

        await tx.bookingSlot.updateMany({
          where: {
            slotId: { in: releasableIds },
            status: "hold",
          },
          data: {
            status: "released",
          },
        });
      });
    }

    return NextResponse.json({
      success: true,
      releasedCount: releasableIds.length,
      skippedCount: slotIds.length - releasableIds.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to release holds";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
