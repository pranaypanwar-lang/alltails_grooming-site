import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { prepareCustomerMessageForBooking } from "../../../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const slotIds = Array.isArray(body.slotIds)
      ? body.slotIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (!slotIds.length) {
      return NextResponse.json({ error: "slotIds are required" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        slots: { include: { slot: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "payment_expired") {
      return NextResponse.json({ error: "Booking can no longer be rescheduled" }, { status: 400 });
    }

    const isPendingPrepaid =
      booking.paymentMethod === "pay_now" &&
      booking.paymentStatus !== "paid" &&
      booking.finalAmount > 0;

    const nextSlots = await adminPrisma.slot.findMany({
      where: { id: { in: slotIds } },
      include: { team: true },
    });

    if (nextSlots.length !== slotIds.length) {
      return NextResponse.json({ error: "One or more selected slots were not found" }, { status: 404 });
    }

    const teamIds = [...new Set(nextSlots.map((slot) => slot.teamId))];
    if (teamIds.length > 1) {
      return NextResponse.json({ error: "All selected slots must belong to the same team" }, { status: 400 });
    }

    const unavailableSlot = nextSlots.find((slot) => slot.isBooked || slot.isBlocked || slot.isHeld);
    if (unavailableSlot) {
      return NextResponse.json({ error: "One or more selected slots are no longer available" }, { status: 409 });
    }

    const sortedSlots = [...nextSlots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    await adminPrisma.$transaction(async (tx) => {
      for (const oldBookingSlot of booking.slots) {
        await tx.bookingSlot.update({
          where: { id: oldBookingSlot.id },
          data: { status: "released" },
        });

        await tx.slot.update({
          where: { id: oldBookingSlot.slotId },
          data: { isBooked: false, isHeld: false, holdExpiresAt: null },
        });
      }

      for (const slot of sortedSlots) {
        await tx.bookingSlot.create({
          data: {
            bookingId,
            slotId: slot.id,
            status: isPendingPrepaid ? "hold" : "confirmed",
          },
        });

        await tx.slot.update({
          where: { id: slot.id },
          data: isPendingPrepaid
            ? {
                isBooked: false,
                isHeld: true,
                holdExpiresAt: booking.paymentExpiresAt ?? null,
              }
            : {
                isBooked: true,
                isHeld: false,
                holdExpiresAt: null,
              },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: isPendingPrepaid ? "pending_payment" : "confirmed",
          selectedDate: sortedSlots[0].startTime.toISOString().slice(0, 10),
          bookingWindowId: sortedSlots.map((slot) => slot.id).join("__"),
          assignedTeamId: sortedSlots[0].teamId,
          dispatchState: "assigned",
        },
      });
    });

    await logAdminBookingEvent({
      bookingId,
      type: "booking_rescheduled",
      summary: `Booking rescheduled to ${sortedSlots[0].startTime.toISOString().slice(0, 10)} · ${sortedSlots[0].team.name}`,
      metadata: {
        selectedDate: sortedSlots[0].startTime.toISOString().slice(0, 10),
        teamId: sortedSlots[0].teamId,
        slotIds,
      },
    });

    await prepareCustomerMessageForBooking(
      adminPrisma,
      bookingId,
      "booking_rescheduled_confirmation",
      {
        deliveryStatus: "queued",
        skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
      }
    );

    return NextResponse.json({
      success: true,
      bookingId,
      bookingWindow: {
        startTime: sortedSlots[0].startTime,
        endTime: sortedSlots[sortedSlots.length - 1].endTime,
        team: { id: sortedSlots[0].teamId, name: sortedSlots[0].team.name },
      },
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/reschedule failed", error);
    return NextResponse.json({ error: "Failed to reschedule booking" }, { status: 500 });
  }
}
