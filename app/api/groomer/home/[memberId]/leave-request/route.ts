import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const bookingId = request.nextUrl.searchParams.get("bookingId") ?? "";
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

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
        teamMemberId: memberId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        emergencyFlag,
        requestedBy: "groomer",
      },
    });

    return NextResponse.json({
      success: true,
      leaveRequest: {
        id: created.id,
        status: created.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create leave request" },
      { status: 500 }
    );
  }
}
