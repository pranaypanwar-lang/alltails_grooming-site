import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { awardGroomerXp, getTeamMemberRewardSummary } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";
    const mode = body.mode === "penalty" ? "penalty" : "reward";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const xpAwarded = Number(body.xpAwarded ?? 0);
    const rewardPointsAwarded = Number(body.rewardPointsAwarded ?? 0);
    const trustDelta = Number(body.trustDelta ?? 0);
    const performanceDelta = Number(body.performanceDelta ?? 0);
    const cashAmount = typeof body.cashAmount === "number" ? body.cashAmount : undefined;
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!teamMemberId || !summary) {
      return NextResponse.json({ error: "teamMemberId and summary are required" }, { status: 400 });
    }

    const normalizedXp = mode === "penalty" ? -Math.abs(xpAwarded) : Math.abs(xpAwarded);
    const normalizedRewardPoints = mode === "penalty" ? -Math.abs(rewardPointsAwarded) : Math.abs(rewardPointsAwarded);
    const normalizedTrust = mode === "penalty" ? -Math.abs(trustDelta) : Math.abs(trustDelta);
    const normalizedPerformance = mode === "penalty" ? -Math.abs(performanceDelta) : Math.abs(performanceDelta);

    const rewardsDelta = await prisma.$transaction(async (tx) => {
      const createdRewards = [];
      const grant = await awardGroomerXp({
        tx,
        teamMemberId,
        eventType: mode === "penalty" ? "manual_penalty" : "manual_reward",
        summary,
        xpAwarded: normalizedXp,
        rewardPointsAwarded: normalizedRewardPoints,
        trustDelta: normalizedTrust,
        performanceDelta: normalizedPerformance,
        metadata: {
          cashAmount: cashAmount ?? null,
          notes: notes ?? null,
          mode,
        },
      });
      if (grant.reward) createdRewards.push(grant.reward);
      return createdRewards;
    });

    const rewardSummary = await getTeamMemberRewardSummary(prisma, teamMemberId);

    return NextResponse.json({
      success: true,
      rewardSummary,
      rewardsDelta,
    });
  } catch (error) {
    console.error("POST /api/admin/workforce/adjustments failed", error);
    return NextResponse.json({ error: "Failed to create workforce adjustment" }, { status: 500 });
  }
}
