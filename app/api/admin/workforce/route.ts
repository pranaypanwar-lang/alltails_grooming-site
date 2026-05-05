import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { getGamificationSnapshot, getSalaryAdvanceEligibility } from "../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const members = await prisma.teamMember.findMany({
      orderBy: [{ currentXp: "desc" }, { rewardPoints: "desc" }, { performanceScore: "desc" }],
      include: {
        team: { select: { id: true, name: true } },
        bookings: {
          select: {
            id: true,
            status: true,
            selectedDate: true,
          },
        },
        rewardEvents: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
        leaveRequests: {
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
        salaryAdvanceRequests: {
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    });

    const [leaveRequests, salaryAdvanceRequests, referrals, trainingModules] = await Promise.all([
      prisma.workforceLeaveRequest.findMany({
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
        include: {
          teamMember: {
            select: {
              id: true,
              name: true,
              role: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
        take: 50,
      }),
      prisma.workforceSalaryAdvanceRequest.findMany({
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
        include: {
          teamMember: {
            select: {
              id: true,
              name: true,
              role: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
        take: 50,
      }),
      prisma.workforceReferralRecord.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          referrerMember: {
            select: {
              id: true,
              name: true,
              role: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
        take: 50,
      }),
      prisma.trainingModule.findMany({
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        include: {
          completions: {
            include: {
              teamMember: {
                select: {
                  id: true,
                  name: true,
                  team: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { completedAt: "desc" },
            take: 8,
          },
        },
      }),
    ]);

    const leaderboard = members.map((member) => {
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
      const salaryAdvanceEligibility = getSalaryAdvanceEligibility({
        joinedAt: member.joinedAt,
        trustScore: member.trustScore,
        performanceScore: member.performanceScore,
        noLeaveStreakDays: member.noLeaveStreakDays,
        latestAdvanceRequestedAt: member.salaryAdvanceRequests[0]?.requestedAt ?? null,
      });

      return {
        id: member.id,
        name: member.name,
        phone: member.phone,
        role: member.role,
        isActive: member.isActive,
        team: member.team,
        currentXp: member.currentXp,
        lifetimeXp: member.lifetimeXp,
        rewardPoints: member.rewardPoints,
        trustScore: member.trustScore,
        performanceScore: member.performanceScore,
        currentLevel: gamification.level,
        currentRank: gamification.rank,
        salaryHikeStage: gamification.salaryHikeStage,
        completedCount: member.completedCount,
        onTimeCount: member.onTimeCount,
        reviewCount: member.reviewCount,
        punctualityStreak: member.punctualityStreak,
        reviewStreak: member.reviewStreak,
        noLeaveStreakDays: member.noLeaveStreakDays,
        salaryAdvanceEligibility,
        upcomingBookingsCount: member.bookings.filter(
          (booking) =>
            booking.status === "confirmed" &&
            !!booking.selectedDate &&
            booking.selectedDate >= today
        ).length,
        recentRewardEvents: member.rewardEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          summary: event.summary,
          xpAwarded: event.xpAwarded,
          rewardPointsAwarded: event.rewardPointsAwarded,
          createdAt: event.createdAt.toISOString(),
        })),
        gamification,
      };
    });

    const activeMembers = leaderboard.filter((member) => member.isActive);
    const salaryHikeReadyCount = activeMembers.filter((member) => {
      const nextSalaryHike = member.gamification.nextSalaryHike;
      if (!nextSalaryHike) return true;
      return (
        nextSalaryHike.xpRemaining <= 120 &&
        member.performanceScore >= 75 &&
        member.trustScore >= 75
      );
    }).length;

    const avgPerformanceScore =
      activeMembers.length > 0
        ? Math.round(activeMembers.reduce((sum, member) => sum + member.performanceScore, 0) / activeMembers.length)
        : 0;
    const avgTrustScore =
      activeMembers.length > 0
        ? Math.round(activeMembers.reduce((sum, member) => sum + member.trustScore, 0) / activeMembers.length)
        : 0;

    return NextResponse.json({
      summary: {
        totalMembers: leaderboard.length,
        activeMembers: activeMembers.length,
        salaryHikeReadyCount,
        avgPerformanceScore,
        avgTrustScore,
        totalRewardPoints: leaderboard.reduce((sum, member) => sum + member.rewardPoints, 0),
      },
      leaderboard,
      leaveRequests: leaveRequests.map((request) => ({
        id: request.id,
        leaveType: request.leaveType,
        status: request.status,
        emergencyFlag: request.emergencyFlag,
        startDate: request.startDate.toISOString(),
        endDate: request.endDate.toISOString(),
        reason: request.reason,
        reviewNote: request.reviewNote,
        requestedAt: request.requestedAt.toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        teamMember: {
          id: request.teamMember.id,
          name: request.teamMember.name,
          role: request.teamMember.role,
          team: request.teamMember.team,
        },
      })),
      salaryAdvanceRequests: salaryAdvanceRequests.map((request) => ({
        id: request.id,
        status: request.status,
        amount: request.amount,
        reason: request.reason,
        eligibilitySnapshot: request.eligibilitySnapshot,
        tenureMonthsSnapshot: request.tenureMonthsSnapshot,
        trustScoreSnapshot: request.trustScoreSnapshot,
        performanceSnapshot: request.performanceSnapshot,
        nextEligibleAt: request.nextEligibleAt?.toISOString() ?? null,
        recoverFromMonth: request.recoverFromMonth,
        reviewNote: request.reviewNote,
        requestedAt: request.requestedAt.toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() ?? null,
        teamMember: {
          id: request.teamMember.id,
          name: request.teamMember.name,
          role: request.teamMember.role,
          team: request.teamMember.team,
        },
      })),
      referrals: referrals.map((record) => ({
        id: record.id,
        candidateName: record.candidateName,
        candidatePhone: record.candidatePhone,
        role: record.role,
        status: record.status,
        notes: record.notes,
        joinedAt: record.joinedAt?.toISOString() ?? null,
        probationPassedAt: record.probationPassedAt?.toISOString() ?? null,
        rewardIssuedAt: record.rewardIssuedAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        referrerMember: {
          id: record.referrerMember.id,
          name: record.referrerMember.name,
          role: record.referrerMember.role,
          team: record.referrerMember.team,
        },
      })),
      trainingModules: trainingModules.map((module) => ({
        id: module.id,
        title: module.title,
        category: module.category,
        description: module.description,
        xpReward: module.xpReward,
        rewardPointsReward: module.rewardPointsReward,
        isActive: module.isActive,
        completionCount: module.completions.length,
        recentCompletions: module.completions.map((completion) => ({
          id: completion.id,
          status: completion.status,
          score: completion.score,
          notes: completion.notes,
          completedAt: completion.completedAt.toISOString(),
          teamMember: {
            id: completion.teamMember.id,
            name: completion.teamMember.name,
            team: completion.teamMember.team,
          },
        })),
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/workforce failed", error);
    return NextResponse.json({ error: "Failed to load workforce" }, { status: 500 });
  }
}
