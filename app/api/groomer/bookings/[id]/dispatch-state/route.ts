import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, ensureBookingSopSteps, logBookingEvent } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";
import { queueTeamOnTheWayMessage } from "../../../../../../lib/customerMessaging/automation";
import { awardGroomerXp, getBookingRewardSummary } from "../../../../../../lib/groomerRewards";

export const runtime = "nodejs";

const ALLOWED_STATES = new Set(["en_route", "started"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const dispatchState = typeof body.dispatchState === "string" ? body.dispatchState.trim() : "";
    if (!ALLOWED_STATES.has(dispatchState)) {
      return NextResponse.json({ error: "Invalid dispatch state" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, slots: { include: { slot: true } } },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "confirmed") {
      return NextResponse.json({ error: "Only confirmed bookings can change dispatch state" }, { status: 400 });
    }

    const rewardResult = await adminPrisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { dispatchState },
      });

      await ensureBookingSopSteps(tx, bookingId);

      if (dispatchState === "en_route" || dispatchState === "started") {
        const stepKey = dispatchState === "en_route" ? "en_route" : "arrived";
        await tx.bookingSopStep.update({
          where: { bookingId_stepKey: { bookingId, stepKey } },
          data: {
            status: "completed",
            completedAt: new Date(),
            completedBy: "groomer",
          },
        });
      }

      const rewardsDelta = [];
      if (
        dispatchState === "en_route" &&
        booking.groomerMemberId &&
        booking.slots.some((bookingSlot) => bookingSlot.slot.startTime.getTime() > Date.now())
      ) {
        const onTimeGrant = await awardGroomerXp({
          tx,
          teamMemberId: booking.groomerMemberId,
          bookingId,
          eventType: "on_time_departure",
          summary: "On-time departure bonus",
          xpAwarded: 15,
          statField: "onTimeCount",
        });
        if (onTimeGrant.reward) rewardsDelta.push(onTimeGrant.reward);
      }

      const rewardSummary = await getBookingRewardSummary(tx, bookingId);
      return { rewardsDelta, rewardSummary };
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: "dispatch_state_changed",
      summary: `Dispatch moved to ${dispatchState.replace(/_/g, " ")}`,
      metadata: {
        nextDispatchState: dispatchState,
        source: "groomer_portal",
      },
    });

    if (dispatchState === "en_route") {
      const prepared = await queueTeamOnTheWayMessage(adminPrisma, bookingId);
      if (prepared.created) {
        await logBookingEvent({
          bookingId,
          actor: "system",
          type: "customer_message_prepared",
          summary: "Team on the way message queued for customer",
          metadata: {
            messageType: "team_on_the_way",
            status: prepared.message.status,
            recipient: prepared.message.recipient,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      bookingId,
      dispatchState,
      rewardsDelta: rewardResult.rewardsDelta,
      rewardSummary: rewardResult.rewardSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update groomer dispatch state" },
      { status: 500 }
    );
  }
}
