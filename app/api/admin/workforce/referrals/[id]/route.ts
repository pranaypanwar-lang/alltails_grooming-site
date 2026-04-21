import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { awardGroomerXp, getTeamMemberRewardSummary } from "../../../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const record = await prisma.workforceReferralRecord.findUnique({ where: { id } });
    if (!record) return NextResponse.json({ error: "Referral record not found" }, { status: 404 });

    let rewardsDelta: Array<{
      eventType: string;
      summary: string;
      xpAwarded: number;
      rewardPointsAwarded: number;
      trustDelta: number;
      performanceDelta: number;
    }> = [];

    if (status === "joined" || status === "probation_passed") {
      const rewardResult = await prisma.$transaction(async (tx) => {
        const grants = [];
        const joinedGrant = status === "joined"
          ? await awardGroomerXp({
              tx,
              teamMemberId: record.referrerMemberId,
              eventType: "referral_joined",
              summary: `Referral joined: ${record.candidateName}`,
              xpAwarded: 20,
              rewardPointsAwarded: 100,
              trustDelta: 1,
              performanceDelta: 2,
              metadata: { referralRecordId: record.id },
            })
          : null;
        if (joinedGrant?.reward) grants.push(joinedGrant.reward);

        const probationGrant = status === "probation_passed"
          ? await awardGroomerXp({
              tx,
              teamMemberId: record.referrerMemberId,
              eventType: "referral_probation_passed",
              summary: `Referral passed probation: ${record.candidateName}`,
              xpAwarded: 30,
              rewardPointsAwarded: 300,
              trustDelta: 2,
              performanceDelta: 3,
              metadata: { referralRecordId: record.id },
            })
          : null;
        if (probationGrant?.reward) grants.push(probationGrant.reward);

        return grants;
      });
      rewardsDelta = rewardResult;
    }

    await prisma.workforceReferralRecord.update({
      where: { id },
      data: {
        status,
        notes,
        joinedAt: status === "joined" && !record.joinedAt ? new Date() : record.joinedAt,
        probationPassedAt: status === "probation_passed" ? new Date() : record.probationPassedAt,
        rewardIssuedAt:
          (status === "joined" || status === "probation_passed") && rewardsDelta.length
            ? new Date()
            : record.rewardIssuedAt,
      },
    });

    const rewardSummary = rewardsDelta.length
      ? await getTeamMemberRewardSummary(prisma, record.referrerMemberId)
      : null;

    return NextResponse.json({ success: true, rewardSummary, rewardsDelta });
  } catch (error) {
    console.error("PATCH /api/admin/workforce/referrals/:id failed", error);
    return NextResponse.json({ error: "Failed to update referral record" }, { status: 500 });
  }
}
