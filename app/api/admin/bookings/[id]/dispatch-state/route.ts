import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { queueTeamOnTheWayMessage } from "../../../../../../lib/customerMessaging/automation";

export const runtime = "nodejs";

const ALLOWED_STATES = new Set(["assigned", "en_route", "started", "issue"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const dispatchState =
      typeof body.dispatchState === "string" ? body.dispatchState.trim() : "";

    if (!ALLOWED_STATES.has(dispatchState)) {
      return NextResponse.json({ error: "Invalid dispatch state" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.status !== "confirmed") {
      return NextResponse.json({ error: "Only confirmed bookings can change dispatch state" }, { status: 400 });
    }
    if (!booking.assignedTeamId && dispatchState !== "issue") {
      return NextResponse.json({ error: "Assign a team before progressing dispatch" }, { status: 400 });
    }

    await adminPrisma.booking.update({
      where: { id: bookingId },
      data: { dispatchState },
    });

    await logAdminBookingEvent({
      bookingId,
      type: "dispatch_state_changed",
      summary: `Dispatch moved to ${dispatchState.replace(/_/g, " ")}`,
      metadata: {
        previousDispatchState: booking.dispatchState,
        nextDispatchState: dispatchState,
      },
    });

    if (dispatchState === "en_route") {
      const prepared = await queueTeamOnTheWayMessage(adminPrisma, bookingId);
      if (prepared.created) {
        await logAdminBookingEvent({
          bookingId,
          type: "customer_message_prepared",
          summary: "Team on the way message queued for customer",
          metadata: {
            messageType: "team_on_the_way",
            recipient: prepared.message.recipient,
            status: prepared.message.status,
          },
        });
      }
    }

    return NextResponse.json({ success: true, bookingId, dispatchState });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/dispatch-state failed", error);
    return NextResponse.json({ error: "Failed to update dispatch state" }, { status: 500 });
  }
}
