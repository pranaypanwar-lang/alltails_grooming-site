import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { getGamificationSnapshot } from "../../../../../lib/groomerRewards";

const REWARD_STORE = {
  half_day_off: { title: "Half-day off token", creditsCost: 4, requiredSalaryStage: 1 },
  paid_day_off: { title: "Paid day off", creditsCost: 6, requiredSalaryStage: 2 },
  dinner_for_2: { title: "Dinner for 2", creditsCost: 8, requiredSalaryStage: 2 },
  family_meal: { title: "Family meal voucher", creditsCost: 10, requiredSalaryStage: 3 },
} as const;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const rewardKey = typeof body.rewardKey === "string" ? body.rewardKey.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const reward = REWARD_STORE[rewardKey as keyof typeof REWARD_STORE];
    if (!reward) {
      return NextResponse.json({ error: "Unknown reward" }, { status: 400 });
    }

    const gamification = getGamificationSnapshot({
      role: member.role,
      currentXp: member.currentXp,
      rewardPoints: member.rewardPoints,
      trustScore: member.trustScore,
      performanceScore: member.performanceScore,
      completedCount: member.completedCount,
      onTimeCount: member.onTimeCount,
      reviewCount: member.reviewCount,
      salaryHikeStage: member.salaryHikeStage,
      punctualityStreak: member.punctualityStreak,
      reviewStreak: member.reviewStreak,
      noLeaveStreakDays: member.noLeaveStreakDays,
    });

    if (gamification.prestigeCredits < reward.creditsCost || member.salaryHikeStage < reward.requiredSalaryStage) {
      return NextResponse.json({ error: "Reward abhi unlock nahi hua" }, { status: 400 });
    }

    const existingPending = await adminPrisma.workforceRewardRedemptionRequest.findFirst({
      where: {
        teamMemberId: member.id,
        rewardKey,
        status: "pending",
      },
    });
    if (existingPending) {
      return NextResponse.json({ error: "Is reward ka request already pending hai" }, { status: 400 });
    }

    const created = await adminPrisma.workforceRewardRedemptionRequest.create({
      data: {
        teamMemberId: member.id,
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
