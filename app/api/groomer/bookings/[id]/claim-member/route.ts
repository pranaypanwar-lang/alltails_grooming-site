import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, logBookingEvent } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";

export const runtime = "nodejs";

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
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";
    if (!teamMemberId) {
      return NextResponse.json({ error: "Team member is required" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        assignedTeamId: true,
        groomerMemberId: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (!booking.assignedTeamId) {
      return NextResponse.json({ error: "Booking team is not assigned yet" }, { status: 409 });
    }

    const member = await adminPrisma.teamMember.findFirst({
      where: {
        id: teamMemberId,
        teamId: booking.assignedTeamId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        currentRank: true,
        currentXp: true,
      },
    });
    if (!member) {
      return NextResponse.json({ error: "Selected groomer is not active for this team" }, { status: 404 });
    }

    await adminPrisma.booking.update({
      where: { id: bookingId },
      data: { groomerMemberId: member.id },
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: "groomer_member_claimed",
      summary: `${member.name} claimed this booking`,
      metadata: {
        teamMemberId: member.id,
        role: member.role,
        source: "groomer_portal",
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      groomerMember: member,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to claim booking" },
      { status: 500 }
    );
  }
}
