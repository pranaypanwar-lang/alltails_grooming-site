import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";
import { getSalaryAdvanceEligibility } from "../../../../../../lib/groomerRewards";

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
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!amount || !reason) {
      return NextResponse.json({ error: "Amount and reason are required" }, { status: 400 });
    }

    const latestRequest = await adminPrisma.workforceSalaryAdvanceRequest.findFirst({
      where: { teamMemberId: memberId },
      orderBy: { requestedAt: "desc" },
    });

    const eligibility = getSalaryAdvanceEligibility({
      joinedAt: access.member!.joinedAt,
      trustScore: access.member!.trustScore,
      performanceScore: access.member!.performanceScore,
      noLeaveStreakDays: access.member!.noLeaveStreakDays,
      latestAdvanceRequestedAt: latestRequest?.requestedAt ?? null,
    });

    const created = await adminPrisma.workforceSalaryAdvanceRequest.create({
      data: {
        teamMemberId: memberId,
        amount,
        reason,
        eligibilitySnapshot: eligibility.eligible,
        tenureMonthsSnapshot: eligibility.tenureMonths,
        trustScoreSnapshot: access.member!.trustScore,
        performanceSnapshot: access.member!.performanceScore,
        nextEligibleAt: eligibility.nextEligibleAt,
        requestedBy: "groomer",
      },
    });

    return NextResponse.json({
      success: true,
      salaryAdvanceRequest: {
        id: created.id,
        status: created.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create salary advance request" },
      { status: 500 }
    );
  }
}
