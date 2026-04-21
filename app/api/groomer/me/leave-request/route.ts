import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : "";
    const startDate = typeof body.startDate === "string" ? body.startDate.trim() : "";
    const endDate = typeof body.endDate === "string" ? body.endDate.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const emergencyFlag = !!body.emergencyFlag;

    if (!leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const created = await adminPrisma.workforceLeaveRequest.create({
      data: {
        teamMemberId: member.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        emergencyFlag,
        requestedBy: "groomer",
      },
    });

    return NextResponse.json({ success: true, leaveRequest: { id: created.id, status: created.status } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create leave request" },
      { status: 500 }
    );
  }
}
