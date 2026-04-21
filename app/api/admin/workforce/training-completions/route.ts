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
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";
    const score = typeof body.score === "number" ? body.score : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!moduleId || !teamMemberId) {
      return NextResponse.json({ error: "moduleId and teamMemberId are required" }, { status: 400 });
    }

    const trainingModule = await prisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!trainingModule) return NextResponse.json({ error: "Training module not found" }, { status: 404 });

    const rewardsDelta = await prisma.$transaction(async (tx) => {
      await tx.trainingCompletion.upsert({
        where: { moduleId_teamMemberId: { moduleId, teamMemberId } },
        update: {
          status: "completed",
          score,
          notes,
          completedAt: new Date(),
          completedBy: "admin",
        },
        create: {
          moduleId,
          teamMemberId,
          status: "completed",
          score,
          notes,
          completedBy: "admin",
        },
      });

      const grants = [];
      const grant = await awardGroomerXp({
        tx,
        teamMemberId,
        eventType: `training_${moduleId}`,
              summary: `Training completed: ${trainingModule.title}`,
              xpAwarded: trainingModule.xpReward,
              rewardPointsAwarded: trainingModule.rewardPointsReward,
        trustDelta: 1,
        performanceDelta: 3,
        metadata: { moduleId, score, notes },
      });
      if (grant.reward) grants.push(grant.reward);
      return grants;
    });

    const rewardSummary = await getTeamMemberRewardSummary(prisma, teamMemberId);

    return NextResponse.json({
      success: true,
      rewardSummary,
      rewardsDelta,
    });
  } catch (error) {
    console.error("POST /api/admin/workforce/training-completions failed", error);
    return NextResponse.json({ error: "Failed to record training completion" }, { status: 500 });
  }
}
