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
 *  0. Partition candidates into free / blocked / occupied.
 *  1. Try exact start+end-time match against FREE candidates only
 *     (preserves the happy path when grids align perfectly).
 *  2. Fall back to a flexible match — find a contiguous run of FREE
 *     target-team slots that covers the booking's total duration.
 *  3. If neither works, return a verbose error listing every blocked
 *     and every occupied slot in the window so the admin knows
 *     exactly what's in the way.
 *
 * Bug surfaced in production: the previous version aborted on the
 * first occupied slot it found (which was almost never the slot the
 * admin had been looking at in the UI), making the message confusing.
 * Now we ignore occupied slots if a free run exists, and only fall
 * back to listing them when no free run can be found.
 */
function chooseTargetSlots(
  bookingSlots: Array<{ slot: { id: string; startTime: Date; endTime: Date } }>,
  candidates: TargetSlotWithBookings[]
):
  | { ok: true; targetSlots: TargetSlotWithBookings[] }
  | { ok: false; reason: "no_overlap" | "no_free_coverage" | "partial_coverage"; details: string } {
  const sortedBooking = [...bookingSlots].sort(
    (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
  );
  const earliestStart = sortedBooking[0].slot.startTime;
  const latestEnd = sortedBooking[sortedBooking.length - 1].slot.endTime;
  const totalMs = latestEnd.getTime() - earliestStart.getTime();
  const totalMinutes = Math.round(totalMs / 60000);

  if (!candidates.length) {
    return {
      ok: false,
      reason: "no_overlap",
      details: `Selected team has no slots between ${formatTime(earliestStart)} and ${formatTime(latestEnd)} on this date. Reschedule the booking to one of the team's available windows, or pick a different team.`,
    };
  }

  // Partition: a candidate is "free" only if it isn't admin-blocked AND
  // has zero overlapping active bookings.
  const free: TargetSlotWithBookings[] = [];
  const blocked: TargetSlotWithBookings[] = [];
  const occupied: TargetSlotWithBookings[] = [];
  for (const slot of candidates) {
    if (slot.isBlocked) {
      blocked.push(slot);
    } else if (slot.bookings.length > 0) {
      occupied.push(slot);
    } else {
      free.push(slot);
    }
  }

  const sortedFree = [...free].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  // 1) Exact match per current slot against free candidates — preferred.
  const freeByKey = new Map(sortedFree.map((slot) => [slotKey(slot), slot]));
  const exact = sortedBooking
    .map((item) => freeByKey.get(slotKey(item.slot)))
    .filter((slot): slot is TargetSlotWithBookings => Boolean(slot));
  if (exact.length === sortedBooking.length) {
    return { ok: true, targetSlots: exact };
  }

  // 2) Flexible coverage — greedy contiguous run of free slots covering
  //    the booking's total duration.
  for (let startIdx = 0; startIdx < sortedFree.length; startIdx++) {
    const run: TargetSlotWithBookings[] = [];
    let runStart: Date | null = null;
    let runEnd: Date | null = null;
    for (let i = startIdx; i < sortedFree.length; i++) {
      const slot = sortedFree[i];
      if (run.length === 0) {
        run.push(slot);
        runStart = slot.startTime;
        runEnd = slot.endTime;
      } else if (runEnd && slot.startTime.getTime() === runEnd.getTime()) {
        run.push(slot);
        runEnd = slot.endTime;
      } else {
        break;
      }
      if (runStart && runEnd && runEnd.getTime() - runStart.getTime() >= totalMs) {
        return { ok: true, targetSlots: run };
      }
    }
  }

  // 3) No free coverage — build a verbose, admin-friendly error listing
  //    every blocked + occupied slot in the window. Helps figure out
  //    which one the dispatch UI was hiding.
  const lines: string[] = [
    `Selected team can't cover the ${totalMinutes}-minute booking from ${formatTime(earliestStart)} to ${formatTime(latestEnd)}.`,
  ];
  if (blocked.length) {
    lines.push(
      `Admin-blocked: ${blocked.map((s) => `${formatTime(s.startTime)}–${formatTime(s.endTime)}`).join(", ")}.`
    );
  }
  if (occupied.length) {
    lines.push(
      `Already booked: ${occupied
        .map((s) => {
          const otherBookingId = s.bookings[0]?.booking?.id ?? null;
          const tag = otherBookingId ? ` (booking ${otherBookingId.slice(0, 8)})` : "";
          return `${formatTime(s.startTime)}–${formatTime(s.endTime)}${tag}`;
        })
        .join(", ")}.`
    );
  }
  if (sortedFree.length) {
    lines.push(
      `Free slots that don't form a long enough run: ${sortedFree.map((s) => `${formatTime(s.startTime)}–${formatTime(s.endTime)}`).join(", ")}.`
    );
  }
  if (!blocked.length && !occupied.length && !sortedFree.length) {
    lines.push("No matching slots found at all on this date for the selected team.");
  }

  return {
    ok: false,
    reason: sortedFree.length ? "partial_coverage" : "no_free_coverage",
    details: lines.join(" "),
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
    //
    // The "occupying booking" filter explicitly excludes pending_payment
    // bookings whose paymentExpiresAt has already passed. Those are stale
    // holds that the release-expired-pending cron will eventually clean up,
    // but we don't want a cron lag to silently block legitimate reassigns —
    // the admin saw the slot as free in the dispatch board (which filters
    // those out) and rightly expects the reassign to succeed.
    const now = new Date();
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
                booking: {
                  AND: [
                    { status: { in: ACTIVE_BOOKING_STATUSES } },
                    {
                      OR: [
                        // Confirmed / completed bookings always occupy.
                        { status: { in: ["confirmed", "completed"] } },
                        // Pending-payment bookings only occupy while their
                        // payment hold is still live.
                        {
                          status: "pending_payment",
                          OR: [
                            { paymentExpiresAt: null },
                            { paymentExpiresAt: { gt: now } },
                          ],
                        },
                      ],
                    },
                  ],
                },
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
              // Mirror the candidate-pull filter: only treat live holds as
              // occupying. Stale pending-payment bookings past their
              // payment expiry shouldn't block the lock.
              none: {
                bookingId: { not: bookingId },
                status: { in: ACTIVE_BOOKING_SLOT_STATUSES },
                booking: {
                  AND: [
                    { status: { in: ACTIVE_BOOKING_STATUSES } },
                    {
                      OR: [
                        { status: { in: ["confirmed", "completed"] } },
                        {
                          status: "pending_payment",
                          OR: [
                            { paymentExpiresAt: null },
                            { paymentExpiresAt: { gt: now } },
                          ],
                        },
                      ],
                    },
                  ],
                },
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
