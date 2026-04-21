import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";

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
    const explicitTeamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
    const outcome = typeof body.outcome === "string" ? body.outcome.trim() : "connected";

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        assignedTeam: true,
        slots: {
          include: { slot: { include: { team: true } } },
          orderBy: { slot: { startTime: "asc" } },
        },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const fallbackTeamId = explicitTeamId || booking.assignedTeamId || booking.slots[0]?.slot.teamId || "";
    if (!fallbackTeamId) {
      return NextResponse.json({ error: "Assign a team before logging a relay call" }, { status: 400 });
    }

    const session = await adminPrisma.relayCallSession.create({
      data: {
        bookingId,
        teamId: fallbackTeamId,
        connectedAt: outcome === "connected" ? new Date() : null,
        endedAt: new Date(),
        outcome,
        durationSecs: outcome === "connected" ? 0 : null,
      },
    });

    const outcomeLabel = outcome === "connected" ? "connected" : outcome === "no_answer" ? "no answer" : outcome;
    await logAdminBookingEvent({
      bookingId,
      type: "relay_call",
      summary: `Relay call logged — ${outcomeLabel}`,
      metadata: { outcome, sessionId: session.id, teamId: fallbackTeamId },
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/relay-call failed", error);
    return NextResponse.json({ error: "Failed to log relay call" }, { status: 500 });
  }
}
