import type { Prisma, PrismaClient } from "./generated/prisma";
import { BOOKING_SOP_STEPS, getMissingRequiredSopEvidenceLabels } from "./booking/sop";
import { getServiceSlaMinutes } from "./serviceSla";

// Lucky booking: 1-in-15 chance of 3× XP multiplier on a booking completion.
// Seeded by bookingId so the result is deterministic and tamper-proof.
export function isLuckyBooking(bookingId: string): boolean {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    hash = (hash * 31 + bookingId.charCodeAt(i)) >>> 0;
  }
  return hash % 15 === 0;
}

type DbTx = Prisma.TransactionClient;
type DbClient = PrismaClient | Prisma.TransactionClient;

export type GroomerRewardGrant = {
  eventType: string;
  summary: string;
  xpAwarded: number;
  rewardPointsAwarded: number;
  trustDelta: number;
  performanceDelta: number;
};

const RANK_LADDER = [
  { minXp: 0, rank: "Groomer Trainee", salaryHikeStage: 0, perk: "Training runway active" },
  { minXp: 7500, rank: "Junior Pet Groomer", salaryHikeStage: 1, perk: "First salary hike review unlocked" },
  { minXp: 16000, rank: "Pet Groomer", salaryHikeStage: 2, perk: "Higher perk eligibility unlocked" },
  { minXp: 27000, rank: "Senior Pet Groomer", salaryHikeStage: 3, perk: "Leadership and premium reward track unlocked" },
  { minXp: 40000, rank: "Lead Groomer", salaryHikeStage: 4, perk: "Lead salary band and advanced privileges unlocked" },
  { minXp: 56000, rank: "Master Groomer", salaryHikeStage: 5, perk: "Master performer salary band unlocked" },
  { minXp: 72000, rank: "Grooming Captain", salaryHikeStage: 6, perk: "Captain tier leadership rewards unlocked" },
  { minXp: 90000, rank: "Grooming Mentor", salaryHikeStage: 7, perk: "Mentor and academy pathway unlocked" },
] as const;

export function getRoleLabel(role: string) {
  if (role === "helper") return "Helper";
  if (role === "team_lead") return "Team Lead";
  return "Groomer";
}

function getLevelForXp(xp: number) {
  let remainingXp = Math.max(0, xp);
  let level = 1;

  while (remainingXp > 0) {
    const xpForNextLevel =
      level <= 10 ? 300 :
      level <= 20 ? 400 :
      level <= 35 ? 500 :
      level <= 50 ? 600 :
      level <= 70 ? 750 :
      level <= 90 ? 900 :
      1100;

    if (remainingXp < xpForNextLevel) break;
    remainingXp -= xpForNextLevel;
    level += 1;
  }

  return level;
}

function getXpFloorForLevel(level: number) {
  let xp = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    xp +=
      currentLevel <= 10 ? 300 :
      currentLevel <= 20 ? 400 :
      currentLevel <= 35 ? 500 :
      currentLevel <= 50 ? 600 :
      currentLevel <= 70 ? 750 :
      currentLevel <= 90 ? 900 :
      1100;
  }
  return xp;
}

function getXpTargetForNextLevel(level: number) {
  return getXpFloorForLevel(level + 1);
}

function getRankEntry(xp: number) {
  return [...RANK_LADDER].reverse().find((entry) => xp >= entry.minXp) ?? RANK_LADDER[0];
}

function getRoleRankLabel(role: string, baseRank: string) {
  if (role === "groomer") return baseRank;
  if (role === "helper") return `${baseRank} Helper`;
  if (role === "team_lead") return `${baseRank} Lead`;
  return baseRank;
}

export function getCurrentRankLabel(role: string, xp: number) {
  return getRoleRankLabel(role, getRankEntry(xp).rank);
}

function getNextRankEntry(xp: number) {
  return RANK_LADDER.find((entry) => entry.minXp > xp) ?? null;
}

function getNextSalaryHikeEntry(xp: number) {
  return RANK_LADDER.find((entry) => entry.salaryHikeStage > getRankEntry(xp).salaryHikeStage) ?? null;
}

function getPrestigeCreditsForXp(xp: number) {
  return Math.floor(Math.max(0, xp) / 1000);
}

function clampScore(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function clampCount(value: number) {
  return Math.max(0, value);
}

async function recordTeamLeaderboardSnapshot(tx: DbTx) {
  const today = new Date();
  const snapshotDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const peers = await tx.teamMember.findMany({
    where: { isActive: true },
    orderBy: [
      { currentXp: "desc" },
      { performanceScore: "desc" },
      { trustScore: "desc" },
      { completedCount: "desc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      teamId: true,
      currentXp: true,
      performanceScore: true,
      trustScore: true,
    },
  });

  await Promise.all(
    peers.map((peer, index) =>
      tx.teamLeaderboardSnapshot.upsert({
        where: {
          teamMemberId_snapshotDate: {
            teamMemberId: peer.id,
            snapshotDate,
          },
        },
        update: {
          position: index + 1,
          currentXp: peer.currentXp,
          performanceScore: peer.performanceScore,
          trustScore: peer.trustScore,
        },
        create: {
          teamId: peer.teamId,
          teamMemberId: peer.id,
          snapshotDate,
          position: index + 1,
          currentXp: peer.currentXp,
          performanceScore: peer.performanceScore,
          trustScore: peer.trustScore,
        },
      })
    )
  );
}

function parseMetadata(metadataJson?: string | null) {
  if (!metadataJson) return null;
  try {
    return JSON.parse(metadataJson) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getGamificationSnapshot(input: {
  role: string;
  currentXp: number;
  rewardPoints: number;
  trustScore: number;
  performanceScore: number;
  completedCount: number;
  onTimeCount: number;
  reviewCount: number;
  salaryHikeStage: number;
  punctualityStreak?: number;
  reviewStreak?: number;
  noLeaveStreakDays?: number;
  streakShieldCount?: number;
}) {
  const level = getLevelForXp(input.currentXp);
  const rankEntry = getRankEntry(input.currentXp);
  const nextRank = getNextRankEntry(input.currentXp);
  const nextSalaryHike = getNextSalaryHikeEntry(input.currentXp);
  const rankProgressDenominator = (nextRank?.minXp ?? getXpTargetForNextLevel(level)) - rankEntry.minXp;
  const currentLevelXpFloor = getXpFloorForLevel(level);
  const nextLevelXpTarget = getXpTargetForNextLevel(level);
  const rankProgressNumerator = input.currentXp - rankEntry.minXp;
  const completionRateScore = input.completedCount * 3;
  const punctualityScore = input.onTimeCount * 2;
  const reviewScore = input.reviewCount * 4;
  const growthScore = Math.round((input.currentXp / Math.max(1, nextRank?.minXp ?? input.currentXp + 1)) * 100);

  return {
    level,
    rank: getRoleRankLabel(input.role, rankEntry.rank),
    baseRank: rankEntry.rank,
    rankPerk: rankEntry.perk,
    prestigeCredits: getPrestigeCreditsForXp(input.currentXp),
    rewardPoints: input.rewardPoints,
    trustScore: input.trustScore,
    performanceScore: input.performanceScore,
    salaryHikeStage: input.salaryHikeStage,
    salaryHikeLabel:
      input.salaryHikeStage <= 0
        ? "First salary hike review pending"
        : `Salary hike stage ${input.salaryHikeStage} unlocked`,
    nextRank: nextRank
      ? {
          label: getRoleRankLabel(input.role, nextRank.rank),
          xpRequired: nextRank.minXp,
          xpRemaining: Math.max(0, nextRank.minXp - input.currentXp),
        }
      : null,
    nextSalaryHike: nextSalaryHike
      ? {
          label: `Salary hike stage ${nextSalaryHike.salaryHikeStage}`,
          xpRequired: nextSalaryHike.minXp,
          xpRemaining: Math.max(0, nextSalaryHike.minXp - input.currentXp),
        }
      : null,
    progress: {
      currentXp: input.currentXp,
      currentLevelXpFloor,
      nextLevelXpTarget,
      nextLevelXpRemaining: Math.max(0, nextLevelXpTarget - input.currentXp),
      rankProgressPercent: rankProgressDenominator > 0
        ? Math.max(0, Math.min(100, Math.round((rankProgressNumerator / rankProgressDenominator) * 100)))
        : 100,
    },
    streaks: {
      punctuality: input.punctualityStreak ?? 0,
      reviews: input.reviewStreak ?? 0,
      noLeaveDays: input.noLeaveStreakDays ?? 0,
    },
    streakShieldCount: input.streakShieldCount ?? 1,
    scoreBreakdown: {
      completion: completionRateScore,
      punctuality: punctualityScore,
      reviews: reviewScore,
      growth: growthScore,
    },
    badges: [
      (input.completedCount >= 25 ? "First Four" : null),
      (input.reviewCount >= 20 ? "Pawfect Finish" : null),
      (input.onTimeCount >= 21 ? "Clockwork" : null),
      ((input.noLeaveStreakDays ?? 0) >= 90 ? "No Excuses" : null),
    ].filter(Boolean) as string[],
  };
}

export async function awardGroomerXp(input: {
  tx: DbTx;
  teamMemberId: string;
  bookingId?: string | null;
  eventType: string;
  summary: string;
  xpAwarded: number;
  rewardPointsAwarded?: number;
  trustDelta?: number;
  performanceDelta?: number;
  metadata?: Record<string, unknown>;
  statField?: "completedCount" | "onTimeCount" | "reviewCount";
}) {
  const {
    tx,
    teamMemberId,
    bookingId,
    eventType,
    summary,
    xpAwarded,
    rewardPointsAwarded = 0,
    trustDelta = 0,
    performanceDelta = 0,
    metadata,
    statField,
  } = input;

  const existing = await tx.groomerRewardEvent.findFirst({
    where: {
      teamMemberId,
      bookingId: bookingId ?? null,
      eventType,
    },
  });
  if (existing) {
    return { created: false, reward: null as GroomerRewardGrant | null };
  }

  const member = await tx.teamMember.findUnique({
    where: { id: teamMemberId },
    select: {
      id: true,
      teamId: true,
      role: true,
      currentXp: true,
      rewardPoints: true,
      trustScore: true,
      performanceScore: true,
      salaryHikeStage: true,
      completedCount: true,
      onTimeCount: true,
      reviewCount: true,
      highestReviewStreak: true,
      punctualityStreak: true,
      reviewStreak: true,
      streakShieldCount: true,
    },
  });
  if (!member) {
    throw Object.assign(new Error("Groomer not found"), { httpStatus: 404 });
  }

  const nextXp = member.currentXp + xpAwarded;
  const clampedXp = clampCount(nextXp);
  const nextRewardPoints = clampCount(member.rewardPoints + rewardPointsAwarded);
  const nextTrustScore = clampScore(member.trustScore + trustDelta);
  const nextPerformanceScore = clampScore(member.performanceScore + performanceDelta);
  const nextRankEntry = getRankEntry(clampedXp);

  const data: Prisma.TeamMemberUpdateInput = {
    currentXp: clampedXp,
    lifetimeXp: { increment: Math.max(0, xpAwarded) },
    rewardPoints: nextRewardPoints,
    trustScore: nextTrustScore,
    performanceScore: nextPerformanceScore,
    currentLevel: getLevelForXp(clampedXp),
    currentRank: getRoleRankLabel(member.role, nextRankEntry.rank),
    salaryHikeStage: Math.max(member.salaryHikeStage, nextRankEntry.salaryHikeStage),
  };

  if (statField === "completedCount") {
    data.completedCount = { increment: 1 };
    data.lastCompletedAt = new Date();
  }
  if (statField === "onTimeCount") {
    data.onTimeCount = { increment: 1 };
    data.punctualityStreak = { increment: 1 };
    data.lastOnTimeAt = new Date();
  }
  if (statField === "reviewCount") {
    const nextReviewCount = member.reviewCount + 1;
    const nextReviewStreak = member.reviewStreak + 1;
    data.reviewCount = { increment: 1 };
    data.reviewStreak = nextReviewStreak;
    data.highestReviewStreak = Math.max(member.highestReviewStreak, nextReviewStreak);
    data.lastReviewAt = new Date();
    if (nextReviewCount % 5 === 0) {
      data.performanceScore = clampScore(nextPerformanceScore + 5);
    }
  }

  await tx.teamMember.update({
    where: { id: teamMemberId },
    data,
  });

  await tx.groomerRewardEvent.create({
    data: {
      teamMemberId,
      bookingId: bookingId ?? null,
      eventType,
      summary,
      xpAwarded,
      rewardPointsAwarded,
      trustDelta,
      performanceDelta,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });

  await recordTeamLeaderboardSnapshot(tx);

  return {
    created: true,
    reward: {
      eventType,
      summary,
      xpAwarded,
      rewardPointsAwarded,
      trustDelta,
      performanceDelta,
    },
  };
}

export function getSalaryAdvanceEligibility(input: {
  joinedAt: Date;
  trustScore: number;
  performanceScore: number;
  noLeaveStreakDays?: number;
  latestAdvanceRequestedAt?: Date | null;
}) {
  const now = new Date();
  const minimumTenureMonths = 3;
  const cooldownMonths = 4;
  const tenureMonths =
    (now.getFullYear() - input.joinedAt.getFullYear()) * 12 +
    (now.getMonth() - input.joinedAt.getMonth()) -
    (now.getDate() < input.joinedAt.getDate() ? 1 : 0);

  const nextEligibleAt = input.latestAdvanceRequestedAt
    ? new Date(
        input.latestAdvanceRequestedAt.getFullYear(),
        input.latestAdvanceRequestedAt.getMonth() + cooldownMonths,
        input.latestAdvanceRequestedAt.getDate()
      )
    : null;

  const cooldownSatisfied = !nextEligibleAt || nextEligibleAt <= now;
  const eligible =
    tenureMonths >= minimumTenureMonths &&
    input.trustScore >= 70 &&
    input.performanceScore >= 70 &&
    (input.noLeaveStreakDays ?? 0) >= 30 &&
    cooldownSatisfied;

  return {
    eligible,
    tenureMonths: Math.max(0, tenureMonths),
    minimumTenureMonths,
    nextEligibleAt,
  };
}

export async function getBookingRewardSummary(prisma: DbClient, bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      groomerMemberId: true,
      groomerMember: {
        select: {
          id: true,
          name: true,
          role: true,
          currentXp: true,
          currentRank: true,
          currentLevel: true,
          rewardPoints: true,
          trustScore: true,
          performanceScore: true,
          salaryHikeStage: true,
          completedCount: true,
          onTimeCount: true,
          reviewCount: true,
          punctualityStreak: true,
          reviewStreak: true,
          noLeaveStreakDays: true,
        },
      },
    },
  });

  if (!booking?.groomerMemberId || !booking.groomerMember) return null;

  const rewardEvents = await prisma.groomerRewardEvent.findMany({
    where: {
      teamMemberId: booking.groomerMemberId,
      bookingId,
    },
    orderBy: { createdAt: "asc" },
  });

  const reviewBonusMilestone = rewardEvents.find((event) => event.eventType === "review_milestone");
  const reviewMilestone = parseMetadata(reviewBonusMilestone?.metadataJson)?.milestone;
  const gamification = getGamificationSnapshot(booking.groomerMember);

  return {
    teamMember: {
      id: booking.groomerMember.id,
      name: booking.groomerMember.name,
      role: booking.groomerMember.role,
      currentXp: booking.groomerMember.currentXp,
      currentRank: booking.groomerMember.currentRank,
      currentLevel: booking.groomerMember.currentLevel,
      rewardPoints: booking.groomerMember.rewardPoints,
      trustScore: booking.groomerMember.trustScore,
      performanceScore: booking.groomerMember.performanceScore,
      salaryHikeStage: booking.groomerMember.salaryHikeStage,
      completedCount: booking.groomerMember.completedCount,
      onTimeCount: booking.groomerMember.onTimeCount,
      reviewCount: booking.groomerMember.reviewCount,
    },
    gamification,
    totalXpAwarded: rewardEvents.reduce((sum, event) => sum + event.xpAwarded, 0),
    totalRewardPointsAwarded: rewardEvents.reduce((sum, event) => sum + event.rewardPointsAwarded, 0),
    rewards: rewardEvents.map((event) => ({
      eventType: event.eventType,
      summary: event.summary,
      xpAwarded: event.xpAwarded,
      rewardPointsAwarded: event.rewardPointsAwarded,
      trustDelta: event.trustDelta,
      performanceDelta: event.performanceDelta,
    })),
    reviewMilestone,
  };
}

export async function getTeamMemberRewardSummary(prisma: DbClient, teamMemberId: string) {
  const member = await prisma.teamMember.findUnique({
    where: { id: teamMemberId },
    select: {
      id: true,
      name: true,
      role: true,
      currentXp: true,
      currentRank: true,
      currentLevel: true,
      rewardPoints: true,
      trustScore: true,
      performanceScore: true,
      salaryHikeStage: true,
      completedCount: true,
      onTimeCount: true,
      reviewCount: true,
      punctualityStreak: true,
      reviewStreak: true,
      noLeaveStreakDays: true,
    },
  });

  if (!member) return null;

  const rewardEvents = await prisma.groomerRewardEvent.findMany({
    where: { teamMemberId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const gamification = getGamificationSnapshot(member);

  return {
    teamMember: {
      id: member.id,
      name: member.name,
      role: member.role,
      currentXp: member.currentXp,
      currentRank: member.currentRank,
      currentLevel: member.currentLevel,
      rewardPoints: member.rewardPoints,
      trustScore: member.trustScore,
      performanceScore: member.performanceScore,
      salaryHikeStage: member.salaryHikeStage,
      completedCount: member.completedCount,
      onTimeCount: member.onTimeCount,
      reviewCount: member.reviewCount,
    },
    gamification,
    totalXpAwarded: rewardEvents.reduce((sum, event) => sum + event.xpAwarded, 0),
    totalRewardPointsAwarded: rewardEvents.reduce((sum, event) => sum + event.rewardPointsAwarded, 0),
    rewards: rewardEvents.map((event) => ({
      eventType: event.eventType,
      summary: event.summary,
      xpAwarded: event.xpAwarded,
      rewardPointsAwarded: event.rewardPointsAwarded,
      trustDelta: event.trustDelta,
      performanceDelta: event.performanceDelta,
    })),
    reviewMilestone: undefined,
  };
}

/**
 * Monthly streak shield refill — call this from a cron job at the start of each month.
 * Resets every groomer's shield count to 1.
 */
export async function refillMonthlyStreakShields(prisma: DbClient) {
  const now = new Date();
  await (prisma as PrismaClient).teamMember.updateMany({
    where: {
      isActive: true,
      OR: [
        { lastStreakShieldResetAt: null },
        {
          lastStreakShieldResetAt: {
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      ],
    },
    data: {
      streakShieldCount: 1,
      lastStreakShieldResetAt: now,
    },
  });
}

/**
 * Consume a streak shield to protect the punctuality streak from breaking.
 * Returns { used: true } if shield was consumed, { used: false } if none available.
 */
export async function consumeStreakShield(
  prisma: DbClient,
  teamMemberId: string
): Promise<{ used: boolean; shieldsRemaining: number }> {
  return (prisma as PrismaClient).$transaction(async (tx) => {
    const member = await tx.teamMember.findUnique({
      where: { id: teamMemberId },
      select: { streakShieldCount: true },
    });
    if (!member || member.streakShieldCount <= 0) {
      return { used: false, shieldsRemaining: 0 };
    }
    const updated = await tx.teamMember.update({
      where: { id: teamMemberId },
      data: { streakShieldCount: { decrement: 1 } },
      select: { streakShieldCount: true },
    });
    await tx.groomerRewardEvent.create({
      data: {
        teamMemberId,
        bookingId: null,
        eventType: "streak_shield_used",
        summary: "Streak Shield use hua — punctuality streak bachaya! 🛡️",
        xpAwarded: 0,
        rewardPointsAwarded: 0,
        trustDelta: 0,
        performanceDelta: 0,
      },
    });
    return { used: true, shieldsRemaining: updated.streakShieldCount };
  });
}

// Called by the daily check-in API route. Awards XP once per calendar day.
export async function awardDailyCheckin(prisma: DbClient, teamMemberId: string) {
  return prisma.$transaction(async (tx) => {
    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const existing = await tx.groomerRewardEvent.findFirst({
      where: {
        teamMemberId,
        eventType: "daily_checkin",
        createdAt: {
          gte: new Date(`${today}T00:00:00.000Z`),
          lt: new Date(`${today}T23:59:59.999Z`),
        },
      },
    });
    if (existing) return { alreadyClaimed: true, reward: null };

    const result = await awardGroomerXp({
      tx,
      teamMemberId,
      bookingId: null,
      eventType: "daily_checkin",
      summary: "Aaj login — daily check-in bonus ✅",
      xpAwarded: 10,
      rewardPointsAwarded: 2,
      trustDelta: 0,
      performanceDelta: 1,
    });
    return { alreadyClaimed: false, reward: result.reward };
  });
}

// Called when admin marks a profile as complete, or from the profile update API.
export async function awardProfileCompletion(prisma: DbClient, teamMemberId: string) {
  return prisma.$transaction(async (tx) => {
    const result = await awardGroomerXp({
      tx,
      teamMemberId,
      bookingId: null,
      eventType: "profile_complete",
      summary: "Profile 100% complete — account setup bonus 🌟",
      xpAwarded: 80,
      rewardPointsAwarded: 15,
      trustDelta: 3,
      performanceDelta: 3,
    });
    return result.reward;
  });
}

// Called once per year on the groomer's work anniversary.
export async function awardWorkAnniversary(prisma: DbClient, teamMemberId: string, years: number) {
  return prisma.$transaction(async (tx) => {
    const eventType = `work_anniversary_${years}y`;
    const xp = years === 1 ? 1000 : years === 2 ? 2500 : 4000;
    const rp = years === 1 ? 20 : years === 2 ? 40 : 80;
    const result = await awardGroomerXp({
      tx,
      teamMemberId,
      bookingId: null,
      eventType,
      summary: `${years} saal All Tails ke saath — anniversary bonus! 🎂`,
      xpAwarded: xp,
      rewardPointsAwarded: rp,
      trustDelta: 3,
      performanceDelta: 5,
      metadata: { years },
    });
    return result.reward;
  });
}

export async function awardReviewReward(prisma: DbClient, bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        groomerMemberId: true,
        groomerMember: {
          select: { id: true, reviewCount: true },
        },
      },
    });
    if (!booking?.groomerMemberId || !booking.groomerMember) {
      return null;
    }

    const grants: GroomerRewardGrant[] = [];
    const reviewCountBefore = booking.groomerMember.reviewCount;

    const reviewGrant = await awardGroomerXp({
      tx,
      teamMemberId: booking.groomerMemberId,
      bookingId,
      eventType: "review_collected",
      summary: "Review screenshot bonus",
      xpAwarded: 18,
      rewardPointsAwarded: 12,
      trustDelta: 1,
      performanceDelta: 4,
      statField: "reviewCount",
    });
    if (reviewGrant.reward) grants.push(reviewGrant.reward);

    const reviewCountAfter = reviewCountBefore + (reviewGrant.created ? 1 : 0);
    if (reviewGrant.created && reviewCountAfter > 0 && reviewCountAfter % 5 === 0) {
      const milestoneGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "review_milestone",
        summary: `5 review milestone unlocked (${reviewCountAfter})`,
        xpAwarded: 50,
        rewardPointsAwarded: 60,
        trustDelta: 2,
        performanceDelta: 5,
        metadata: { milestone: reviewCountAfter },
      });
      if (milestoneGrant.reward) grants.push(milestoneGrant.reward);
    }

    const rewardSummary = await getBookingRewardSummary(tx, bookingId);
    return rewardSummary ? { rewardSummary, rewardsDelta: grants } : null;
  });
}

export async function awardCompletionRewards(prisma: DbClient, bookingId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        slots: { include: { slot: true } },
        paymentCollection: true,
        groomerMember: true,
        sopSteps: { include: { proofs: true } },
        service: true,
        user: { select: { id: true } },
      },
    });
    if (!booking?.groomerMemberId || !booking.groomerMember) {
      return null;
    }

    const grants: GroomerRewardGrant[] = [];
    const missingRequiredEvidenceLabels = getMissingRequiredSopEvidenceLabels(booking.sopSteps, {
      hasPaymentCollection: !!booking.paymentCollection,
    });

    if (missingRequiredEvidenceLabels.length > 0) {
      const rewardSummary = await getBookingRewardSummary(tx, bookingId);
      return rewardSummary
        ? {
            rewardSummary,
            rewardsDelta: grants,
            rewardSuppressedReason: `XP withheld because required QA evidence was missing: ${missingRequiredEvidenceLabels.join(", ")}`,
          }
        : null;
    }

    const completionGrant = await awardGroomerXp({
      tx,
      teamMemberId: booking.groomerMemberId,
      bookingId,
      eventType: "booking_completed",
      summary: "Booking completed bonus",
      xpAwarded: 14,
      rewardPointsAwarded: 8,
      trustDelta: 1,
      performanceDelta: 2,
      statField: "completedCount",
    });
    if (completionGrant.reward) grants.push(completionGrant.reward);

    const requiredStepKeys = new Set<string>(
      BOOKING_SOP_STEPS.filter((step) => step.requiredForCompletion).map((step) => step.key)
    );
    const requiredSteps = booking.sopSteps.filter((step) => requiredStepKeys.has(step.stepKey));
    const completedRequiredSteps = requiredSteps.filter((step) => step.status === "completed");
    const sopCompletionRatio = requiredSteps.length > 0 ? completedRequiredSteps.length / requiredSteps.length : 0;

    if (requiredSteps.length > 0 && completedRequiredSteps.length === requiredSteps.length) {
      const sopGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "full_sop_completion",
        summary: "All required SOP steps completed cleanly",
        xpAwarded: 24,
        rewardPointsAwarded: 16,
        trustDelta: 2,
        performanceDelta: 6,
      });
      if (sopGrant.reward) grants.push(sopGrant.reward);
    } else if (requiredSteps.length > 0 && sopCompletionRatio >= 0.75) {
      const sopPartialGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "strong_sop_adherence",
        summary: "Strong SOP adherence bonus",
        xpAwarded: 10,
        rewardPointsAwarded: 6,
        trustDelta: 1,
        performanceDelta: 3,
      });
      if (sopPartialGrant.reward) grants.push(sopPartialGrant.reward);
    }

    if (booking.paymentCollection && !booking.paymentCollection.mismatchFlag) {
      const cleanPaymentGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "clean_payment",
        summary: "Payment matched amount",
        xpAwarded: 8,
        rewardPointsAwarded: 5,
        trustDelta: 2,
        performanceDelta: 2,
      });
      if (cleanPaymentGrant.reward) grants.push(cleanPaymentGrant.reward);
    }

    if (
      booking.paymentCollection &&
      !booking.paymentCollection.mismatchFlag &&
      booking.paymentCollection.collectedAmount > booking.paymentCollection.expectedAmount
    ) {
      const upsellDelta = booking.paymentCollection.collectedAmount - booking.paymentCollection.expectedAmount;
      const upsellGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "service_upsell",
        summary: `Customer upgraded service (+₹${upsellDelta})`,
        xpAwarded: 12,
        rewardPointsAwarded: 8,
        trustDelta: 1,
        performanceDelta: 3,
      });
      if (upsellGrant.reward) grants.push(upsellGrant.reward);
    }

    const firstSlot = [...booking.slots].sort(
      (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
    )[0]?.slot;
    if (firstSlot) {
      const slaMinutes = getServiceSlaMinutes(booking.service.name);
      const slaDeadline = new Date(firstSlot.startTime.getTime() + slaMinutes * 60 * 1000);
      if (Date.now() <= slaDeadline.getTime()) {
        const inTimeGrant = await awardGroomerXp({
          tx,
          teamMemberId: booking.groomerMemberId,
          bookingId,
          eventType: "sla_completion",
          summary: `Finished within ${slaMinutes}-minute service SLA`,
          xpAwarded: 12,
          rewardPointsAwarded: 8,
          trustDelta: 1,
          performanceDelta: 4,
        });
        if (inTimeGrant.reward) grants.push(inTimeGrant.reward);
      }
    }

    // First-ever booking bonus
    const completedCountAfter = booking.groomerMember.completedCount + 1;
    if (completedCountAfter === 1) {
      const firstGrant = await awardGroomerXp({
        tx,
        teamMemberId: booking.groomerMemberId,
        bookingId,
        eventType: "first_booking_ever",
        summary: "Pehli booking complete — welcome bonus! 🎉",
        xpAwarded: 200,
        rewardPointsAwarded: 30,
        trustDelta: 2,
        performanceDelta: 5,
      });
      if (firstGrant.reward) grants.push(firstGrant.reward);
    }

    // Repeat customer bonus (same pet parent booked this groomer before)
    if (booking.user) {
      const priorBookingsWithUser = await tx.booking.count({
        where: {
          groomerMemberId: booking.groomerMemberId,
          userId: booking.user.id,
          status: "completed",
          id: { not: bookingId },
        },
      });
      if (priorBookingsWithUser > 0) {
        const repeatGrant = await awardGroomerXp({
          tx,
          teamMemberId: booking.groomerMemberId,
          bookingId,
          eventType: "repeat_customer",
          summary: "Wahi customer wapas aaya — rishta bana! 💛",
          xpAwarded: 40,
          rewardPointsAwarded: 12,
          trustDelta: 1,
          performanceDelta: 2,
        });
        if (repeatGrant.reward) grants.push(repeatGrant.reward);
      }
    }

    // Lucky booking: deterministic 1-in-15 multiplier
    if (isLuckyBooking(bookingId)) {
      const baseXpEarned = grants.reduce((sum, g) => sum + g.xpAwarded, 0);
      const luckyBonus = Math.round(baseXpEarned * 2); // 3× total = base + 2× bonus
      if (luckyBonus > 0) {
        const luckyGrant = await awardGroomerXp({
          tx,
          teamMemberId: booking.groomerMemberId,
          bookingId,
          eventType: "lucky_booking",
          summary: `Lucky booking! ⭐ 3× XP multiplier mila (+${luckyBonus} bonus XP)`,
          xpAwarded: luckyBonus,
          rewardPointsAwarded: Math.round(luckyBonus / 3),
          trustDelta: 0,
          performanceDelta: 0,
          metadata: { baseXpEarned, multiplier: 3 },
        });
        if (luckyGrant.reward) grants.push(luckyGrant.reward);
      }
    }

    const rewardSummary = await getBookingRewardSummary(tx, bookingId);
    return rewardSummary ? { rewardSummary, rewardsDelta: grants } : null;
  });
}
