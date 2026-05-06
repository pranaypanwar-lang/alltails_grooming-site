import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import {
  OCCUPYING_BOOKING_SLOT_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "../../../../../../lib/slots/occupancy";

export const runtime = "nodejs";

const ACTIVE_BOOKING_SLOT_STATUSES = [...OCCUPYING_BOOKING_SLOT_STATUSES];
const ACTIVE_BOOKING_STATUSES = [...OCCUPYING_BOOKING_STATUSES];

function slotKey(slot: { startTime: Date; endTime: Date }) {
  return `${slot.startTime.getTime()}__${slot.endTime.getTime()}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const [booking, team] = await Promise.all([
      adminPrisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          assignedTeam: true,
          slots: {
            where: { status: { in: ACTIVE_BOOKING_SLOT_STATUSES } },
            include: { slot: true },
            orderBy: { slot: { startTime: "asc" } },
          },
        },
      }),
      adminPrisma.team.findUnique({ where: { id: teamId } }),
    ]);

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!team || !team.isActive) return NextResponse.json({ error: "Team not found or inactive" }, { status: 404 });
    if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "payment_expired") {
      return NextResponse.json({ error: "Booking can no longer be assigned" }, { status: 400 });
    }

    const activeBookingSlots = booking.slots;
    if (!activeBookingSlots.length) {
      return NextResponse.json({ error: "Booking has no active slots to move" }, { status: 400 });
    }

    const targetTeamAlreadyOwnsSlots = activeBookingSlots.every((item) => item.slot.teamId === team.id);
    const isPendingPrepaid =
      booking.paymentMethod === "pay_now" &&
      booking.paymentStatus !== "paid" &&
      booking.finalAmount > 0;
    const nextBookingSlotStatus = isPendingPrepaid ? "hold" : "confirmed";

    const targetSlots = targetTeamAlreadyOwnsSlots
      ? []
      : await adminPrisma.slot.findMany({
          where: {
            teamId: team.id,
            OR: activeBookingSlots.map((item) => ({
              startTime: item.slot.startTime,
              endTime: item.slot.endTime,
            })),
          },
          include: {
            bookings: {
              where: {
                bookingId: { not: bookingId },
                status: { in: ACTIVE_BOOKING_SLOT_STATUSES },
                booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
              },
              include: { booking: { select: { id: true, status: true } } },
            },
          },
        });

    const targetSlotByKey = new Map(targetSlots.map((slot) => [slotKey(slot), slot]));
    const nextSlotIds = targetTeamAlreadyOwnsSlots
      ? activeBookingSlots.map((item) => item.slotId)
      : activeBookingSlots.map((item) => targetSlotByKey.get(slotKey(item.slot))?.id ?? null);

    if (nextSlotIds.some((id) => !id)) {
      return NextResponse.json(
        { error: "Selected team does not have matching slots for this booking window" },
        { status: 409 }
      );
    }

    const unavailableTargetSlot = targetSlots.find((slot) => slot.isBlocked || slot.bookings.length > 0);
    if (unavailableTargetSlot) {
      return NextResponse.json(
        { error: "Selected team is not available for this booking window" },
        { status: 409 }
      );
    }

    const updated = await adminPrisma.$transaction(async (tx) => {
      if (!targetTeamAlreadyOwnsSlots) {
        const targetIds = nextSlotIds.filter((id): id is string => typeof id === "string");
        const oldSlotIds = activeBookingSlots.map((item) => item.slotId);
        const oldSlotIdsToRelease = oldSlotIds.filter((id) => !targetIds.includes(id));

        const lockResult = await tx.slot.updateMany({
          where: {
            id: { in: targetIds },
            isBlocked: false,
            bookings: {
              none: {
                bookingId: { not: bookingId },
                status: { in: ACTIVE_BOOKING_SLOT_STATUSES },
                booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
              },
            },
          },
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

        if (lockResult.count !== targetIds.length) {
          throw Object.assign(new Error("Selected team is no longer available for this booking window"), {
            httpStatus: 409,
          });
        }

        for (const bookingSlot of activeBookingSlots) {
          const nextSlotId = targetSlotByKey.get(slotKey(bookingSlot.slot))?.id;
          if (!nextSlotId) {
            throw Object.assign(new Error("Selected team does not have matching slots for this booking window"), {
              httpStatus: 409,
            });
          }

          await tx.bookingSlot.update({
            where: { id: bookingSlot.id },
            data: {
              slotId: nextSlotId,
              status: nextBookingSlotStatus,
            },
          });
        }

        if (oldSlotIdsToRelease.length) {
          await tx.slot.updateMany({
            where: {
              id: { in: oldSlotIdsToRelease },
              bookings: {
                none: {
                  bookingId: { not: bookingId },
                  status: { in: ACTIVE_BOOKING_SLOT_STATUSES },
                  booking: { status: { in: ACTIVE_BOOKING_STATUSES } },
                },
              },
            },
            data: {
              isBooked: false,
              isHeld: false,
              holdExpiresAt: null,
            },
          });
        }
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          assignedTeamId: team.id,
          groomerMemberId: booking.assignedTeamId !== team.id ? null : booking.groomerMemberId,
          dispatchState: "assigned",
          bookingWindowId: nextSlotIds.filter((id): id is string => typeof id === "string").join("__"),
        },
        include: {
          assignedTeam: { select: { id: true, name: true } },
        },
      });
    });

    await logAdminBookingEvent({
      bookingId,
      type: booking.assignedTeamId ? "team_reassigned" : "team_assigned",
      summary: `${booking.assignedTeamId ? "Team reassigned" : "Team assigned"} to ${team.name}`,
      metadata: {
        previousTeamId: booking.assignedTeamId,
        nextTeamId: team.id,
        previousGroomerMemberId: booking.assignedTeamId !== team.id ? booking.groomerMemberId : null,
        previousSlotIds: activeBookingSlots.map((item) => item.slotId),
        nextSlotIds,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      team: updated.assignedTeam,
      dispatchState: updated.dispatchState,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("POST /api/admin/bookings/:id/assign-team failed", error);
    return NextResponse.json({ error: "Failed to assign team" }, { status: 500 });
  }
}
