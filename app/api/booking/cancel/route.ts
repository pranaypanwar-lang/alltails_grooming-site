import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../_lib/assertBookingAccess";
import { prepareCustomerMessageForBooking } from "../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, accessToken }: { bookingId?: string; accessToken?: string } = body;

    if (!bookingId?.trim()) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) {
      return access;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slots: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "Completed bookings cannot be cancelled" },
        { status: 400 }
      );
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Paid bookings must go through refund handling before cancellation" },
        { status: 409 }
      );
    }

    const shouldRestoreReward =
      booking.loyaltyRewardApplied && !booking.loyaltyRewardRestored;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "cancelled",
          dispatchState: "issue",
          loyaltyRewardRestored: shouldRestoreReward ? true : booking.loyaltyRewardRestored,
        },
      });

      for (const bookingSlot of booking.slots) {
        await tx.bookingSlot.update({
          where: { id: bookingSlot.id },
          data: { status: "released" },
        });

        await tx.slot.update({
          where: { id: bookingSlot.slotId },
          data: { isBooked: false, isHeld: false, holdExpiresAt: null },
        });
      }

      if (shouldRestoreReward) {
        await tx.user.update({
          where: { id: booking.userId },
          data: {
            loyaltyFreeUnlocked: true,
            loyaltyLastRedeemedAt: null,
          },
        });
      }
    });

    await prepareCustomerMessageForBooking(prisma, bookingId, "booking_cancelled_confirmation", {
      deliveryStatus: "queued",
      skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      bookingId,
      status: "cancelled",
      loyaltyRewardRestored: shouldRestoreReward,
    });
  } catch (error) {
    console.error("Cancel booking API error:", error);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
