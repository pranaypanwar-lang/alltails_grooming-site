import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { getGamificationSnapshot } from "../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      include: {
        members: {
          orderBy: { name: "asc" },
        },
        coverageRules: {
          include: { areas: { include: { serviceArea: true } } },
        },
      },
    });

    const result = teams.map((t) => ({
      id: t.id,
      name: t.name,
      isActive: t.isActive,
      opsLeadName: t.opsLeadName,
      opsLeadPhone: t.opsLeadPhone,
      telegramChatId: t.telegramChatId,
      telegramAlertsEnabled: t.telegramAlertsEnabled,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      members: t.members.map((member) => {
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

        return {
          id: member.id,
          name: member.name,
          phone: member.phone,
          role: member.role,
          isActive: member.isActive,
          currentXp: member.currentXp,
          rewardPoints: member.rewardPoints,
          trustScore: member.trustScore,
          performanceScore: member.performanceScore,
          currentLevel: gamification.level,
          currentRank: gamification.rank,
          salaryHikeStage: member.salaryHikeStage,
          completedCount: member.completedCount,
          onTimeCount: member.onTimeCount,
          reviewCount: member.reviewCount,
          punctualityStreak: member.punctualityStreak,
          reviewStreak: member.reviewStreak,
          noLeaveStreakDays: member.noLeaveStreakDays,
        };
      }),
      coverageRules: t.coverageRules.map((r) => ({
        id: r.id,
        weekday: r.weekday,
        coverageType: r.coverageType,
        isActive: r.isActive,
        areas: r.areas.map((a) => ({
          serviceAreaId: a.serviceAreaId,
          name: a.serviceArea.name,
          slug: a.serviceArea.slug,
        })),
      })),
    }));

    return NextResponse.json({ teams: result });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
