import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { getSalaryAdvanceEligibility } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!amount || !reason) {
      return NextResponse.json({ error: "Amount and reason are required" }, { status: 400 });
    }

    const latestRequest = await adminPrisma.workforceSalaryAdvanceRequest.findFirst({
      where: { teamMemberId: member.id },
      orderBy: { requestedAt: "desc" },
    });

    const eligibility = getSalaryAdvanceEligibility({
      joinedAt: member.joinedAt,
      trustScore: member.trustScore,
      performanceScore: member.performanceScore,
      noLeaveStreakDays: member.noLeaveStreakDays,
      latestAdvanceRequestedAt: latestRequest?.requestedAt ?? null,
    });

    const created = await adminPrisma.workforceSalaryAdvanceRequest.create({
      data: {
        teamMemberId: member.id,
        amount,
        reason,
        eligibilitySnapshot: eligibility.eligible,
        tenureMonthsSnapshot: eligibility.tenureMonths,
        trustScoreSnapshot: member.trustScore,
        performanceSnapshot: member.performanceScore,
        nextEligibleAt: eligibility.nextEligibleAt,
        requestedBy: "groomer",
      },
    });

    return NextResponse.json({ success: true, salaryAdvanceRequest: { id: created.id, status: created.status } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create salary advance request" },
      { status: 500 }
    );
  }
}
