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
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";

    if (!teamMemberId) {
      return NextResponse.json({ error: "teamMemberId is required" }, { status: 400 });
    }

    const [booking, member] = await Promise.all([
      adminPrisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          assignedTeam: true,
          groomerMember: true,
        },
      }),
      adminPrisma.teamMember.findUnique({
        where: { id: teamMemberId },
        include: { team: true },
      }),
    ]);

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "payment_expired") {
      return NextResponse.json({ error: "Booking can no longer be assigned" }, { status: 400 });
    }
    if (!booking.assignedTeamId) {
      return NextResponse.json({ error: "Assign a team before assigning a groomer" }, { status: 400 });
    }
    if (!member || !member.isActive) {
      return NextResponse.json({ error: "Groomer not found or inactive" }, { status: 404 });
    }
    if (member.teamId !== booking.assignedTeamId) {
      return NextResponse.json({ error: "Selected groomer is not part of the assigned team" }, { status: 400 });
    }

    const updated = await adminPrisma.booking.update({
      where: { id: bookingId },
      data: {
        groomerMemberId: member.id,
        dispatchState: booking.dispatchState === "unassigned" ? "assigned" : booking.dispatchState,
      },
      include: {
        groomerMember: {
          select: {
            id: true,
            name: true,
            role: true,
            currentRank: true,
            currentXp: true,
            currentLevel: true,
          },
        },
      },
    });

    await logAdminBookingEvent({
      bookingId,
      type: booking.groomerMemberId ? "groomer_reassigned" : "groomer_assigned",
      summary: `${booking.groomerMemberId ? "Groomer reassigned" : "Groomer assigned"} to ${member.name}`,
      metadata: {
        previousGroomerMemberId: booking.groomerMemberId,
        nextGroomerMemberId: member.id,
        teamId: member.teamId,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      groomerMember: updated.groomerMember,
      dispatchState: updated.dispatchState,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/assign-groomer failed", error);
    return NextResponse.json({ error: "Failed to assign groomer" }, { status: 500 });
  }
}
