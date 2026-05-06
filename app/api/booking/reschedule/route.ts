import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../_lib/assertBookingAccess";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../lib/customerMessaging/provider";
import { validateAndLockSlots } from "../../../../lib/slots/validateAndLockSlots";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      bookingId,
      slotIds,
      accessToken,
    }: {
      bookingId?: string;
      slotIds?: string[];
      accessToken?: string;
    } = body;

    if (!bookingId?.trim() || !slotIds?.length) {
      return NextResponse.json(
        { error: "Booking ID and slot IDs are required" },
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
        user: true,
        slots: {
          include: {
            slot: true,
          },
        },
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
        { error: "Cancelled bookings cannot be rescheduled" },
        { status: 400 }
      );
    }

    if (booking.status === "completed") {
      return NextResponse.json(
        { error: "Completed bookings cannot be rescheduled" },
        { status: 400 }
      );
    }

    if (booking.status === "payment_expired") {
      return NextResponse.json(
        { error: "Expired unpaid bookings cannot be rescheduled. Please book again." },
        { status: 409 }
      );
    }

    const isPendingPrepaid =
      booking.paymentMethod === "pay_now" &&
      booking.paymentStatus !== "paid" &&
      booking.finalAmount > 0;

    if (
      isPendingPrepaid &&
      (!booking.paymentExpiresAt || booking.paymentExpiresAt <= new Date())
    ) {
      await prisma.$transaction(async (tx) => {
        for (const oldBookingSlot of booking.slots) {
          await tx.bookingSlot.update({
            where: { id: oldBookingSlot.id },
            data: { status: "released" },
          });

          await tx.slot.update({
            where: { id: oldBookingSlot.slotId },
            data: {
              isBooked: false,
              isHeld: false,
              holdExpiresAt: null,
            },
          });
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "payment_expired",
            paymentExpiredAt: new Date(),
            paymentPendingReason: "hold_expired",
          },
        });
      });

      return NextResponse.json(
        { error: "Payment window expired. Please book again." },
        { status: 409 }
      );
    }

    const nextSlots = await prisma.slot.findMany({
      where: {
        id: {
          in: slotIds,
        },
      },
      include: {
        team: true,
      },
    });

    if (nextSlots.length !== slotIds.length) {
      return NextResponse.json(
        { error: "One or more selected slots were not found" },
        { status: 404 }
      );
    }

    const teamIds = [...new Set(nextSlots.map((slot) => slot.teamId))];
    if (teamIds.length > 1) {
      return NextResponse.json(
        { error: "All selected slots must belong to the same team" },
        { status: 400 }
      );
    }

    const sortedSlots = [...nextSlots].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const nextBookingStatus =
      isPendingPrepaid ? "pending_payment" : "confirmed";

    const nextBookingSlotStatus = isPendingPrepaid ? "hold" : "confirmed";

    await prisma.$transaction(async (tx) => {
      for (const oldBookingSlot of booking.slots) {
        await tx.bookingSlot.update({
          where: { id: oldBookingSlot.id },
          data: { status: "released" },
        });

        await tx.slot.update({
          where: { id: oldBookingSlot.slotId },
          data: {
            isBooked: false,
            isHeld: false,
            holdExpiresAt: null,
          },
        });
      }

      const lockResult = await validateAndLockSlots(tx, slotIds, {
        mode: isPendingPrepaid ? "held" : "booked",
        holdExpiresAt: isPendingPrepaid ? booking.paymentExpiresAt ?? null : null,
      });

      if (!lockResult.ok) {
        const statusMap: Record<string, number> = {
          SLOTS_NOT_FOUND: 404,
          MIXED_TEAMS: 400,
          NOT_CONSECUTIVE: 400,
          SLOTS_UNAVAILABLE: 409,
        };
        throw Object.assign(new Error(lockResult.error.message), {
          httpStatus: statusMap[lockResult.error.code] ?? 400,
        });
      }

      for (const slot of nextSlots) {
        await tx.bookingSlot.create({
          data: {
            bookingId,
            slotId: slot.id,
            status: nextBookingSlotStatus,
          },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: nextBookingStatus,
          selectedDate: sortedSlots[0].startTime.toISOString().slice(0, 10),
          bookingWindowId: sortedSlots.map((slot) => slot.id).join("__"),
        },
      });
    });

    await supersedeQueuedBookingLifecycleMessages(prisma, bookingId, {
      keepMessageTypes: ["booking_rescheduled_confirmation"],
    });
    const prepared = await prepareCustomerMessageForBooking(prisma, bookingId, "booking_rescheduled_confirmation", {
      deliveryStatus: "queued",
      skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
    });
    await processQueuedCustomerMessages(prisma, { limit: 10, messageIds: [prepared.message.id] });

    return NextResponse.json({
      success: true,
      bookingId,
      status: nextBookingStatus,
      bookingWindow: {
        startTime: sortedSlots[0].startTime,
        endTime: sortedSlots[sortedSlots.length - 1].endTime,
        teamName: sortedSlots[0].team.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("Reschedule booking API error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule booking" },
      { status: 500 }
    );
  }
}
