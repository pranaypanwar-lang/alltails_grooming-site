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
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const [booking, team] = await Promise.all([
      adminPrisma.booking.findUnique({
        where: { id: bookingId },
        include: { assignedTeam: true },
      }),
      adminPrisma.team.findUnique({ where: { id: teamId } }),
    ]);

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!team || !team.isActive) return NextResponse.json({ error: "Team not found or inactive" }, { status: 404 });
    if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "payment_expired") {
      return NextResponse.json({ error: "Booking can no longer be assigned" }, { status: 400 });
    }

    const updated = await adminPrisma.booking.update({
      where: { id: bookingId },
      data: {
        assignedTeamId: team.id,
        groomerMemberId: booking.assignedTeamId !== team.id ? null : booking.groomerMemberId,
        dispatchState: "assigned",
      },
      include: {
        assignedTeam: { select: { id: true, name: true } },
      },
    });

    await logAdminBookingEvent({
      bookingId,
      type: booking.assignedTeamId ? "team_reassigned" : "team_assigned",
      summary: `${booking.assignedTeamId ? "Team reassigned" : "Team assigned"} to ${team.name}`,
      metadata: {
        previousTeamId: booking.assignedTeamId,
        nextTeamId: team.id,
        previousGroomerMemberId: booking.assignedTeamId !== team.id ? booking.groomerMemberId : null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      team: updated.assignedTeam,
      dispatchState: updated.dispatchState,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/assign-team failed", error);
    return NextResponse.json({ error: "Failed to assign team" }, { status: 500 });
  }
}
