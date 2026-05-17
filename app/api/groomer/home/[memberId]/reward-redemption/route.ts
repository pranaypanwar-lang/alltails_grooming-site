import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";
import { getGamificationSnapshot } from "../../../../../../lib/groomerRewards";
import { REWARD_STORE_MAP } from "../../../../../../lib/groomerRewardStore";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await context.params;
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    const token = request.nextUrl.searchParams.get("token");
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;
    if (!access.member) return NextResponse.json({ error: "Groomer not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const rewardKey = typeof body.rewardKey === "string" ? body.rewardKey.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const reward = REWARD_STORE_MAP[rewardKey];
    if (!reward) {
      return NextResponse.json({ error: "Unknown reward" }, { status: 400 });
    }

    const gamification = getGamificationSnapshot({
      role: access.member.role,
      currentXp: access.member.currentXp,
      rewardPoints: access.member.rewardPoints,
      trustScore: access.member.trustScore,
      performanceScore: access.member.performanceScore,
      completedCount: access.member.completedCount,
      onTimeCount: access.member.onTimeCount,
      reviewCount: access.member.reviewCount,
      salaryHikeStage: access.member.salaryHikeStage,
      punctualityStreak: access.member.punctualityStreak,
      reviewStreak: access.member.reviewStreak,
      noLeaveStreakDays: access.member.noLeaveStreakDays,
    });

    if (gamification.prestigeCredits < reward.creditsCost || access.member.salaryHikeStage < reward.requiredSalaryStage) {
      return NextResponse.json({ error: "Reward abhi unlock nahi hua" }, { status: 400 });
    }

    const existingPending = await adminPrisma.workforceRewardRedemptionRequest.findFirst({
      where: {
        teamMemberId: memberId,
        rewardKey,
        status: "pending",
      },
    });
    if (existingPending) {
      return NextResponse.json({ error: "Is reward ka request already pending hai" }, { status: 400 });
    }

    const created = await adminPrisma.workforceRewardRedemptionRequest.create({
      data: {
        teamMemberId: memberId,
        rewardKey,
        rewardTitle: reward.title,
        creditsCost: reward.creditsCost,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, redemption: { id: created.id, status: created.status } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create reward redemption request" },
      { status: 500 }
    );
  }
}
