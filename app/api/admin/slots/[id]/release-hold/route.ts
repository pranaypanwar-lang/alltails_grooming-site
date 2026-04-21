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
    if (!slot.isHeld) return NextResponse.json({ error: "Slot is not held" }, { status: 400 });
    if (slot.isBooked) return NextResponse.json({ error: "Slot is confirmed (booked), not just held" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const nextSlot = await tx.slot.update({
        where: { id },
        data: {
          isHeld: false,
          holdExpiresAt: null,
        },
      });

      await tx.bookingSlot.updateMany({
        where: {
          slotId: id,
          status: "hold",
        },
        data: {
          status: "released",
        },
      });

      return nextSlot;
    });

    return NextResponse.json({ slot: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to release hold";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
