import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import {
  getExpiredPendingReleaseUpdate,
  isValidCronBearerToken,
} from "../../../../lib/booking/holdExpiry";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const auth = isValidCronBearerToken(
      request.headers.get("authorization"),
      process.env.CRON_SECRET
    );
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const now = new Date();
    const releaseUpdate = getExpiredPendingReleaseUpdate(now);

    const expiredBookings = await prisma.booking.findMany({
      where: {
        paymentMethod: "pay_now",
        paymentStatus: "unpaid",
        status: "pending_payment",
        paymentExpiresAt: { lt: now },
      },
      include: { slots: true },
    });

    for (const booking of expiredBookings) {
      await prisma.$transaction(async (tx) => {
        for (const bookingSlot of booking.slots) {
          await tx.bookingSlot.update({
            where: { id: bookingSlot.id },
            data: releaseUpdate.bookingSlot,
          });
          await tx.slot.update({
            where: { id: bookingSlot.slotId },
            data: releaseUpdate.slot,
          });
        }
        await tx.booking.update({
          where: { id: booking.id },
          data: releaseUpdate.booking,
        });
      });
    }

    return NextResponse.json({
      success: true,
      releasedCount: expiredBookings.length,
    });
  } catch (error) {
    console.error("Release expired pending bookings error:", error);
    return NextResponse.json(
      { error: "Failed to release expired pending bookings" },
      { status: 500 }
    );
  }
}
