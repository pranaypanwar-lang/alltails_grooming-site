import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { getSalaryAdvanceEligibility } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";
    const amount = Number(body.amount ?? 0);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!teamMemberId || !amount || !reason) {
      return NextResponse.json({ error: "teamMemberId, amount and reason are required" }, { status: 400 });
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: {
        salaryAdvanceRequests: {
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    });
    if (!member) return NextResponse.json({ error: "Team member not found" }, { status: 404 });

    const eligibility = getSalaryAdvanceEligibility({
      joinedAt: member.joinedAt,
      trustScore: member.trustScore,
      performanceScore: member.performanceScore,
      noLeaveStreakDays: member.noLeaveStreakDays,
      latestAdvanceRequestedAt: member.salaryAdvanceRequests[0]?.requestedAt ?? null,
    });

    await prisma.workforceSalaryAdvanceRequest.create({
      data: {
        teamMemberId,
        amount,
        reason,
        eligibilitySnapshot: eligibility.eligible,
        tenureMonthsSnapshot: eligibility.tenureMonths,
        trustScoreSnapshot: member.trustScore,
        performanceSnapshot: member.performanceScore,
        nextEligibleAt: eligibility.nextEligibleAt,
        requestedBy: "admin",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/workforce/salary-advance-requests failed", error);
    return NextResponse.json({ error: "Failed to create salary advance request" }, { status: 500 });
  }
}
