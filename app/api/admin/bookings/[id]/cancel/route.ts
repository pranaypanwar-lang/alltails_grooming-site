import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { isRefundablePaymentStatus, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../../../lib/customerMessaging/provider";
import {
  ACTIVE_BOOKING_SLOT_WHERE,
  releaseBookingSlotReservations,
} from "../../../../../../lib/slots/releaseBookingSlots";

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
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason: string | null = body.reason ?? null;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slots: { where: ACTIVE_BOOKING_SLOT_WHERE }, user: true },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled") return NextResponse.json({ error: "Booking is already cancelled" }, { status: 400 });
    if (booking.status === "completed") return NextResponse.json({ error: "Completed bookings cannot be cancelled" }, { status: 400 });
    if (isRefundablePaymentStatus(booking.paymentStatus)) return NextResponse.json({ error: "Paid bookings must go through refund handling before cancellation" }, { status: 409 });

    const shouldRestoreReward = booking.loyaltyRewardApplied && !booking.loyaltyRewardRestored;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "cancelled",
          dispatchState: "issue",
          loyaltyRewardRestored: shouldRestoreReward ? true : booking.loyaltyRewardRestored,
        },
      });

      await releaseBookingSlotReservations(tx, bookingId, booking.slots);

      if (shouldRestoreReward) {
        await tx.user.update({
          where: { id: booking.userId },
          data: { loyaltyFreeUnlocked: true, loyaltyLastRedeemedAt: null },
        });
      }
    });

    await logAdminBookingEvent({
      bookingId,
      type: "booking_cancelled",
      summary: "Booking cancelled from admin",
      metadata: {
        reason: reason ?? null,
        loyaltyRewardRestored: shouldRestoreReward,
      },
    });

    await supersedeQueuedBookingLifecycleMessages(prisma, bookingId, {
      keepMessageTypes: ["booking_cancelled_confirmation"],
    });
    const prepared = await prepareCustomerMessageForBooking(prisma, bookingId, "booking_cancelled_confirmation", {
      deliveryStatus: "queued",
      skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
    });
    await processQueuedCustomerMessages(prisma, { limit: 10, messageIds: [prepared.message.id] });

    return NextResponse.json({
      success: true,
      bookingId,
      status: "cancelled",
      loyaltyRewardRestored: shouldRestoreReward,
      reason: reason ?? null,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/cancel failed", error);
    return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
  }
}
