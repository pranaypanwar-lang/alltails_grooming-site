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

type TargetSlotWithBookings = {
  id: string;
  teamId: string;
  startTime: Date;
  endTime: Date;
  isBlocked: boolean;
  bookings: Array<{ booking: { id: string; status: string } | null; status: string }>;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Pick target-team slots covering the booking's current time window.
 *
 * Strategy:
 *  1. Try exact start+end-time match per booking slot (preserves the
 *     existing happy path for teams whose grids align perfectly).
 *  2. If that fails, fall back to a flexible match — find a contiguous
 *     run of target-team slots from earliestStart..latestEnd whose
 *     combined duration covers the booking duration.
 *
 * Returns the chosen target slots in order, OR a structured error
 * describing exactly what went wrong (no overlap, blocked, already
 * booked, partial coverage). Lets the route surface real diagnostics
 * to the admin instead of a generic 409.
 */
function chooseTargetSlots(
  bookingSlots: Array<{ slot: { id: string; startTime: Date; endTime: Date } }>,
  candidates: TargetSlotWithBookings[]
):
  | { ok: true; targetSlots: TargetSlotWithBookings[] }
  | { ok: false; reason: "no_overlap" | "blocked" | "already_booked" | "partial_coverage"; details: string } {
  if (!candidates.length) {
    return {
      ok: false,
      reason: "no_overlap",
      details: "Selected team has no slots overlapping this booking's time window. Reschedule the booking to one of the team's available windows first.",
    };
  }

  const blockedCandidate = candidates.find((slot) => slot.isBlocked);
  if (blockedCandidate) {
    return {
      ok: false,
      reason: "blocked",
      details: `Selected team's slot at ${formatTime(blockedCandidate.startTime)} is blocked.`,
    };
  }

  const occupiedCandidate = candidates.find((slot) => slot.bookings.length > 0);
  if (occupiedCandidate) {
    return {
      ok: false,
      reason: "already_booked",
      details: `Selected team's slot at ${formatTime(occupiedCandidate.startTime)} is already booked.`,
    };
  }

  const candidateByKey = new Map(candidates.map((slot) => [slotKey(slot), slot]));

  // 1) Exact match per current slot — preferred.
  const exact = bookingSlots
    .map((item) => candidateByKey.get(slotKey(item.slot)))
    .filter((slot): slot is TargetSlotWithBookings => Boolean(slot));
  if (exact.length === bookingSlots.length) {
    return { ok: true, targetSlots: exact };
  }

  // 2) Flexible coverage — find a contiguous run that covers the booking
  //    window's total duration.
  const sortedBooking = [...bookingSlots].sort(
    (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
  );
  const earliestStart = sortedBooking[0].slot.startTime;
  const latestEnd = sortedBooking[sortedBooking.length - 1].slot.endTime;
  const totalMs = latestEnd.getTime() - earliestStart.getTime();

  const sortedCandidates = [...candidates].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // Greedy contiguous run starting at the earliest candidate within the window.
  for (let startIdx = 0; startIdx < sortedCandidates.length; startIdx++) {
    const run: TargetSlotWithBookings[] = [];
    let runStart = sortedCandidates[startIdx].startTime;
    let runEnd = sortedCandidates[startIdx].startTime;
    for (let i = startIdx; i < sortedCandidates.length; i++) {
      const slot = sortedCandidates[i];
      // Must be contiguous with the previous slot in the run.
      if (run.length > 0 && slot.startTime.getTime() !== runEnd.getTime()) break;
      run.push(slot);
      runEnd = slot.endTime;
      if (runEnd.getTime() - runStart.getTime() >= totalMs) {
        return { ok: true, targetSlots: run };
      }
    }
  }

  return {
    ok: false,
    reason: "partial_coverage",
    details: `Selected team has slots in this window but not enough contiguous capacity to cover the ${Math.round(totalMs / 60000)}-minute booking. Available slots: ${sortedCandidates
      .map((s) => `${formatTime(s.startTime)}–${formatTime(s.endTime)}`)
      .join(", ")}.`,
  };
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
      booking.status === "pending_payment" &&
      booking.paymentStatus === "unpaid" &&
      ((booking.paymentMethod === "pay_now" && booking.finalAmount > 0) ||
        booking.paymentMethod === "pay_after_service");
    const nextBookingSlotStatus = isPendingPrepaid ? "hold" : "confirmed";

    // Booking's overall window — used for the flexible-coverage fallback.
    const sortedActive = [...activeBookingSlots].sort(
      (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
    );
    const windowStart = sortedActive[0].slot.startTime;
    const windowEnd = sortedActive[sortedActive.length - 1].slot.endTime;

    // Pull target-team candidates that overlap this window. Wider net than
    // exact-time match so chooseTargetSlots() can do a flexible contiguous-run
    // search when grids don't align.
    const targetCandidates: TargetSlotWithBookings[] = targetTeamAlreadyOwnsSlots
      ? []
      : await adminPrisma.slot.findMany({
          where: {
            teamId: team.id,
            startTime: { lt: windowEnd },
            endTime: { gt: windowStart },
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

    let targetSlots: TargetSlotWithBookings[] = [];
    if (!targetTeamAlreadyOwnsSlots) {
      const choice = chooseTargetSlots(activeBookingSlots, targetCandidates);
      if (!choice.ok) {
        return NextResponse.json(
          { error: choice.details, reason: choice.reason },
          { status: 409 }
        );
      }
      targetSlots = choice.targetSlots;
    }

    // Mark targetSlotByKey for the legacy 1:1 mapping path; unused on the
    // flexible-coverage path but kept so the analytics/event metadata
    // continues to work for both cases.
    void new Map(targetSlots.map((slot) => [slotKey(slot), slot]));
    const nextSlotIds: string[] = targetTeamAlreadyOwnsSlots
      ? activeBookingSlots.map((item) => item.slotId)
      : targetSlots.map((slot) => slot.id);

    const updated = await adminPrisma.$transaction(async (tx) => {
      if (!targetTeamAlreadyOwnsSlots) {
        const targetIds = nextSlotIds;
        const oldSlotIds = activeBookingSlots.map((item) => item.slotId);
        const oldSlotIdsToRelease = oldSlotIds.filter((id) => !targetIds.includes(id));

        // Lock the chosen target slots with the appropriate state (held for
        // pending-prepaid bookings, booked for confirmed). Atomic check
        // ensures another admin / customer didn't grab them between the
        // candidate query and this update.
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

        // Release the old BookingSlot records (mark "released" — same pattern
        // as /reschedule). We replace them with fresh BookingSlot rows
        // pointing at the target team's slots, so the count of bookingSlots
        // can change (e.g. 3 old 30-min → 1 new 90-min slot).
        await tx.bookingSlot.updateMany({
          where: { id: { in: activeBookingSlots.map((bs) => bs.id) } },
          data: { status: "released" },
        });

        for (const targetSlotId of targetIds) {
          await tx.bookingSlot.create({
            data: {
              bookingId,
              slotId: targetSlotId,
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

      // Update booking record. selectedDate may shift if the target slots
      // happen to be on a different calendar day (rare but possible if
      // teams operate cross-midnight); pull from the first target slot.
      const firstTarget = targetSlots[0] ?? null;
      const updatedSelectedDate = firstTarget
        ? firstTarget.startTime.toISOString().slice(0, 10)
        : booking.selectedDate;

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          assignedTeamId: team.id,
          groomerMemberId: booking.assignedTeamId !== team.id ? null : booking.groomerMemberId,
          dispatchState: "assigned",
          bookingWindowId: nextSlotIds.join("__"),
          selectedDate: updatedSelectedDate,
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
