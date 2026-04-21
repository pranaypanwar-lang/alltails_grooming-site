import type { Prisma, PrismaClient } from "./generated/prisma";
import { getGamificationSnapshot, getSalaryAdvanceEligibility } from "./groomerRewards";
import { resolveGroomerCopy } from "./groomerStateCopy";
import { deriveHomePsychology } from "./groomerPsychology";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function serializeGroomerHome(prisma: DbClient, memberId: string) {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    include: {
      team: true,
      bookings: {
        where: { status: { in: ["confirmed", "completed", "pending_payment"] } },
        include: {
          service: true,
          user: true,
          slots: { include: { slot: true } },
        },
        orderBy: [{ selectedDate: "asc" }, { createdAt: "desc" }],
        take: 12,
      },
      rewardEvents: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      leaveRequests: {
        orderBy: { requestedAt: "desc" },
        take: 10,
      },
      salaryAdvanceRequests: {
        orderBy: { requestedAt: "desc" },
        take: 10,
      },
      referralsMade: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      trainingCompletions: {
        include: { module: true },
        orderBy: { completedAt: "desc" },
        take: 20,
      },
      trainingInterests: {
        orderBy: { requestedAt: "desc" },
        take: 20,
      },
      rewardRedemptionRequests: {
        orderBy: { requestedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!member) return null;

  const allPeers = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: [
      { currentXp: "desc" },
      { performanceScore: "desc" },
      { trustScore: "desc" },
      { completedCount: "desc" },
      { createdAt: "asc" },
    ],
    include: {
      team: { select: { name: true } },
    },
    take: 20,
  });

  const activeModules = await prisma.trainingModule.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const historyStart = new Date();
  historyStart.setDate(historyStart.getDate() - 6);
  const leaderboardHistoryRows = await prisma.teamLeaderboardSnapshot.findMany({
    where: {
      snapshotDate: { gte: new Date(historyStart.getFullYear(), historyStart.getMonth(), historyStart.getDate()) },
    },
    orderBy: [{ snapshotDate: "asc" }, { position: "asc" }],
    include: {
      team: { select: { id: true, name: true } },
    },
  });

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

  const latestAdvanceRequestedAt = member.salaryAdvanceRequests[0]?.requestedAt ?? null;
  const salaryAdvanceEligibility = getSalaryAdvanceEligibility({
    joinedAt: member.joinedAt,
    trustScore: member.trustScore,
    performanceScore: member.performanceScore,
    noLeaveStreakDays: member.noLeaveStreakDays,
    latestAdvanceRequestedAt,
  });

  const completedTrainingIds = new Set(member.trainingCompletions.map((completion) => completion.moduleId));
  const completedModuleCount = member.trainingCompletions.length;
  const profileFields = [
    member.aadhaarNumber,
    member.panNumber,
    member.bankAccountName,
    member.bankAccountNumber,
    member.bankIfsc,
    member.upiId,
    member.emergencyContactName,
    member.emergencyContactPhone,
  ];
  const profileCompletionPercent = Math.round(
    (profileFields.filter((value) => !!String(value ?? "").trim()).length / profileFields.length) * 100
  );
  const daysSinceJoined = Math.max(
    1,
    Math.ceil((Date.now() - member.joinedAt.getTime()) / (24 * 60 * 60 * 1000))
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayBookings = member.bookings.filter((booking) => booking.selectedDate === today);
  const todayBookingsSorted = [...todayBookings].sort((a, b) => {
    const aStart = [...a.slots].sort((x, y) => x.slot.startTime.getTime() - y.slot.startTime.getTime())[0]?.slot.startTime?.getTime() ?? 0;
    const bStart = [...b.slots].sort((x, y) => x.slot.startTime.getTime() - y.slot.startTime.getTime())[0]?.slot.startTime?.getTime() ?? 0;
    return aStart - bStart;
  });
  const nextBooking = todayBookingsSorted.find((booking) => booking.status !== "completed") ?? todayBookingsSorted[0] ?? null;
  const nextBookingStart = nextBooking
    ? [...nextBooking.slots].sort((a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime())[0]?.slot.startTime ?? null
    : null;
  const nextBookingMinutesAway = nextBookingStart
    ? Math.round((nextBookingStart.getTime() - Date.now()) / 60000)
    : null;

  const nextAction = nextBooking
    ? (() => {
        if (nextBooking.dispatchState === "en_route") {
          return {
            tone: "active",
            title: "Ab seedha booking par kaam rakho",
            detail: "Aap en route mark kar chuke ho. Agla step time par complete karo.",
            ctaLabel: "Case kholo",
            bookingId: nextBooking.id,
            minutesAway: nextBookingMinutesAway,
          };
        }
        if (nextBookingMinutesAway !== null && nextBookingMinutesAway <= 25) {
          return {
            tone: "urgent",
            title: nextBookingMinutesAway < 0 ? "Booking start ho chuki hai" : "Abhi nikalna zaroori hai",
            detail: "En route mark karo aur delay se bachne ke liye turant move karo.",
            ctaLabel: "En route ke liye case kholo",
            bookingId: nextBooking.id,
            minutesAway: nextBookingMinutesAway,
          };
        }
        if (nextBookingMinutesAway !== null && nextBookingMinutesAway <= 60) {
          return {
            tone: "soon",
            title: "Agli booking 60 minute ke andar hai",
            detail: "Dress check aur setup ready rakho, phir en route time par mark karo.",
            ctaLabel: "Agli booking dekho",
            bookingId: nextBooking.id,
            minutesAway: nextBookingMinutesAway,
          };
        }
        return {
          tone: "calm",
          title: "Aaj ki next booking ready hai",
          detail: "Time se pehle case khol kar styling notes aur customer details dekh lo.",
          ctaLabel: "Next booking kholo",
          bookingId: nextBooking.id,
          minutesAway: nextBookingMinutesAway,
        };
      })()
    : null;

  const teamAggregateMap = new Map<string, {
    teamId: string;
    teamName: string;
    totalXp: number;
    memberCount: number;
    topPerformerName: string;
    topPerformerXp: number;
  }>();
  for (const peer of allPeers) {
    const existing = teamAggregateMap.get(peer.teamId);
    if (existing) {
      existing.totalXp += peer.currentXp;
      existing.memberCount += 1;
      if (peer.currentXp > existing.topPerformerXp) {
        existing.topPerformerXp = peer.currentXp;
        existing.topPerformerName = peer.name;
      }
    } else {
      teamAggregateMap.set(peer.teamId, {
        teamId: peer.teamId,
        teamName: peer.team.name,
        totalXp: peer.currentXp,
        memberCount: 1,
        topPerformerName: peer.name,
        topPerformerXp: peer.currentXp,
      });
    }
  }
  const teamRows = [...teamAggregateMap.values()].sort((a, b) => b.totalXp - a.totalXp || b.memberCount - a.memberCount || a.teamName.localeCompare(b.teamName));
  const currentTeamIndex = teamRows.findIndex((row) => row.teamId === member.teamId);
  const teamPosition = currentTeamIndex >= 0 ? currentTeamIndex + 1 : null;
  const teamAhead = currentTeamIndex > 0 ? teamRows[currentTeamIndex - 1] : null;

  const historyAggregate = new Map<string, Map<string, { totalXp: number; teamName: string }>>();
  for (const row of leaderboardHistoryRows) {
    const dateKey = row.snapshotDate.toISOString();
    const perDate = historyAggregate.get(dateKey) ?? new Map<string, { totalXp: number; teamName: string }>();
    const teamBucket = perDate.get(row.teamId) ?? { totalXp: 0, teamName: row.team.name };
    teamBucket.totalXp += row.currentXp;
    perDate.set(row.teamId, teamBucket);
    historyAggregate.set(dateKey, perDate);
  }
  const teamHistory = [...historyAggregate.entries()].map(([date, perDate]) => {
    const ranked = [...perDate.entries()]
      .map(([teamId, value]) => ({ teamId, ...value }))
      .sort((a, b) => b.totalXp - a.totalXp || a.teamName.localeCompare(b.teamName));
    const teamEntry = ranked.find((item) => item.teamId === member.teamId);
    return teamEntry
      ? {
          date,
          position: ranked.findIndex((item) => item.teamId === member.teamId) + 1,
          currentXp: teamEntry.totalXp,
        }
      : null;
  }).filter(Boolean) as Array<{ date: string; position: number; currentXp: number }>;

  const teamLeaderboard = {
    teamName: member.team.name,
    currentPosition: teamPosition,
    totalActiveMembers: teamRows.length,
    gapToNextXp: teamAhead ? Math.max(0, teamAhead.totalXp - (teamRows[currentTeamIndex]?.totalXp ?? 0)) : 0,
    currentLabel:
      teamPosition === 1
        ? "Aapki team sab teams mein #1 par hai"
        : teamPosition
          ? `Aapki team sab teams mein #${teamPosition} par hai`
          : "Leaderboard loading",
    chaseLabel: teamAhead
      ? `${teamAhead.teamName} ko catch karne ke liye ${Math.max(0, teamAhead.totalXp - (teamRows[currentTeamIndex]?.totalXp ?? 0))} XP aur chahiye`
      : "Aapki team lead kar rahi hai, streak ko banaye rakho",
    history: teamHistory,
    topMembers: teamRows.slice(0, 8).map((team, index) => ({
      id: team.teamId,
      name: team.teamName,
      memberCount: team.memberCount,
      topPerformerName: team.topPerformerName,
      rank: `${team.memberCount} active members`,
      currentXp: team.totalXp,
      performanceScore: 0,
      position: index + 1,
      isCurrentMember: team.teamId === member.teamId,
    })),
  };

  const trainingInterestByModule = new Map(member.trainingInterests.map((interest) => [interest.moduleId, interest]));
  const rewardStore = [
    {
      key: "half_day_off",
      title: "Half-day off token",
      creditsCost: 4,
      requiredSalaryStage: 1,
      detail: "Junior band se upar aur 4 credits par request bhej sakte ho",
    },
    {
      key: "paid_day_off",
      title: "Paid day off",
      creditsCost: 6,
      requiredSalaryStage: 2,
      detail: "Pet Groomer band ke baad ek paid day off claim kar sakte ho",
    },
    {
      key: "dinner_for_2",
      title: "Dinner for 2",
      creditsCost: 8,
      requiredSalaryStage: 2,
      detail: "8 credits aur clean performance ke saath unlock hota hai",
    },
    {
      key: "family_meal",
      title: "Family meal voucher",
      creditsCost: 10,
      requiredSalaryStage: 3,
      detail: "Senior band aur 10 credits ke baad request bhej sakte ho",
    },
  ].map((reward) => {
    const request = member.rewardRedemptionRequests.find((item) => item.rewardKey === reward.key);
    const eligible = gamification.prestigeCredits >= reward.creditsCost && member.salaryHikeStage >= reward.requiredSalaryStage;
    return {
      ...reward,
      eligible,
      currentStatus: request?.status ?? null,
      requestedAt: request?.requestedAt.toISOString() ?? null,
    };
  });

  const leavePolicy = {
    sameDayImpactCount: todayBookings.filter((booking) => booking.status !== "completed").length,
    sameDayImpactWarning:
      todayBookings.filter((booking) => booking.status !== "completed").length > 0
        ? "Aaj ki bookings par asar pad sakta hai. Emergency ho to hi same-day leave bhejein."
        : "Aaj koi active booking nahi hai, phir bhi planned leave pehle bhejna better hai.",
    advanceNoticeHint: "Planned leave ko jitna jaldi bhejoge, utna ops impact kam hoga.",
  };

  const promotionGates = [
    {
      key: "xp",
      label: "XP gate",
      met: !gamification.nextRank || gamification.nextRank.xpRemaining <= 0,
      detail: gamification.nextRank
        ? `${gamification.nextRank.xpRemaining} XP aur chahiye`
        : "Top rank band reached",
    },
    {
      key: "quality",
      label: "Quality gate",
      met: member.reviewCount >= 5 && member.performanceScore >= 75,
      detail: member.reviewCount >= 5
        ? `Performance score ${member.performanceScore}`
        : "5 verified reviews ke baad strong gate khulega",
    },
    {
      key: "discipline",
      label: "Discipline gate",
      met: member.trustScore >= 75 && member.noLeaveStreakDays >= 30,
      detail: `Trust ${member.trustScore} · No-unplanned-leave ${member.noLeaveStreakDays} din`,
    },
    {
      key: "training",
      label: "Training gate",
      met: completedModuleCount >= 1,
      detail: completedModuleCount > 0
        ? `${completedModuleCount} module complete`
        : "Kam se kam 1 training complete honi chahiye",
    },
  ];

  const monthlyRewardEvents = member.rewardEvents.filter((event) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return event.createdAt.getTime() >= thirtyDaysAgo;
  });

  const monthlyScorecard = {
    output: Math.min(100, member.completedCount * 4),
    quality: Math.min(100, member.reviewCount * 8 + member.performanceScore / 2),
    discipline: Math.min(100, member.trustScore),
    efficiency: Math.min(100, member.onTimeCount * 6),
    growth: Math.min(100, completedModuleCount * 18 + member.rewardPoints / 5),
    grade:
      member.performanceScore >= 90 ? "S" :
      member.performanceScore >= 82 ? "A" :
      member.performanceScore >= 72 ? "B" :
      member.performanceScore >= 60 ? "C" :
      "D",
    monthlyXp: monthlyRewardEvents.reduce((sum, event) => sum + event.xpAwarded, 0),
  };

  const milestoneUnlocks = [
    {
      title: "Half-day off token",
      unlocked: gamification.prestigeCredits >= 4,
      detail: "4 Prestige Credits par unlock",
    },
    {
      title: "Dinner for 2",
      unlocked: gamification.prestigeCredits >= 8 && member.salaryHikeStage >= 2,
      detail: "8 Credits + Pet Groomer band ke baad",
    },
    {
      title: "Travel championship track",
      unlocked: member.salaryHikeStage >= 3 && member.trustScore >= 80 && member.performanceScore >= 80,
      detail: "Senior band + clean trust/performance chahiye",
    },
  ];

  const dailyMissions = [
    {
      key: "bookings",
      title: "Aaj 4 bookings complete karo",
      current: Math.min(4, todayBookings.filter((booking) => booking.status === "completed").length),
      target: 4,
      reward: "+60 Groom XP",
    },
    {
      key: "punctuality",
      title: "Aaj on-time report karo",
      current: member.lastOnTimeAt && member.lastOnTimeAt.toISOString().slice(0, 10) === today ? 1 : 0,
      target: 1,
      reward: "+6 Groom XP",
    },
    {
      key: "documents",
      title: "Profile documents complete rakho",
      current: profileCompletionPercent,
      target: 100,
      reward: "Profile completion XP unlock",
      percentMode: true,
    },
  ];

  const psychology = deriveHomePsychology({
    daysSinceJoined,
    todayBookingCount: todayBookings.length,
    completedTodayCount: todayBookings.filter((booking) => booking.status === "completed").length,
    punctualityDoneToday: !!(member.lastOnTimeAt && member.lastOnTimeAt.toISOString().slice(0, 10) === today),
    monthlyXp: monthlyScorecard.monthlyXp,
    monthlyGrade: monthlyScorecard.grade,
    profileCompletionPercent,
    currentXp: member.currentXp,
    completedCount: member.completedCount,
    reviewCount: member.reviewCount,
    trustScore: member.trustScore,
    performanceScore: member.performanceScore,
    prestigeCredits: gamification.prestigeCredits,
    salaryHikeStage: member.salaryHikeStage,
    rankProgressPercent: rankPercentLike(gamification.progress.rankProgressPercent),
    nextRankLabel: gamification.nextRank?.label ?? null,
    nextRankXpRemaining: gamification.nextRank?.xpRemaining ?? null,
    promotionGates,
    streaks: gamification.streaks,
    nextBookingMinutesAway,
    teamPosition,
    totalTeams: teamRows.length,
    gapToNextXp: teamAhead ? Math.max(0, teamAhead.totalXp - (teamRows[currentTeamIndex]?.totalXp ?? 0)) : 0,
    rewardStore,
    recentRewardCount: member.rewardEvents.length,
    badgeCount: gamification.badges.length,
  });

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
      team: { id: member.team.id, name: member.team.name },
      currentXp: member.currentXp,
      currentRank: gamification.rank,
      currentLevel: gamification.level,
      rewardPoints: member.rewardPoints,
      trustScore: member.trustScore,
      performanceScore: member.performanceScore,
      salaryHikeStage: member.salaryHikeStage,
      completedCount: member.completedCount,
      onTimeCount: member.onTimeCount,
      reviewCount: member.reviewCount,
      profile: {
        aadhaarNumber: member.aadhaarNumber ?? "",
        aadhaarImageUrl: member.aadhaarImageUrl ?? null,
        panNumber: member.panNumber ?? "",
        panImageUrl: member.panImageUrl ?? null,
        bankAccountName: member.bankAccountName ?? "",
        bankAccountNumber: member.bankAccountNumber ?? "",
        bankIfsc: member.bankIfsc ?? "",
        bankName: member.bankName ?? "",
        upiId: member.upiId ?? "",
        emergencyContactName: member.emergencyContactName ?? "",
        emergencyContactPhone: member.emergencyContactPhone ?? "",
        yearsExperience: member.yearsExperience ?? null,
        experienceNotes: member.experienceNotes ?? "",
      },
    },
    gamification: {
      ...gamification,
      profileCompletionPercent,
      streakFamilies: [
        {
          key: "punctuality",
          label: "Punctuality streak",
          current: member.punctualityStreak,
          nextMilestone: member.punctualityStreak < 5 ? 5 : member.punctualityStreak < 10 ? 10 : member.punctualityStreak < 21 ? 21 : 30,
        },
        {
          key: "review",
          label: "Review streak",
          current: member.reviewStreak,
          nextMilestone: member.reviewStreak < 3 ? 3 : member.reviewStreak < 7 ? 7 : member.reviewStreak < 14 ? 14 : 30,
        },
        {
          key: "reliability",
          label: "No unplanned leave streak",
          current: member.noLeaveStreakDays,
          nextMilestone: member.noLeaveStreakDays < 30 ? 30 : member.noLeaveStreakDays < 60 ? 60 : 90,
        },
      ],
      promotionGates,
      milestoneUnlocks,
      monthlyScorecard,
      dailyMissions,
    },
    stateContent: {
      primary: resolveGroomerCopy(psychology.topState.key, "hinglish", psychology.topState.params),
      rewardMood: resolveGroomerCopy(psychology.nextRewardProgress.stateKey),
      xpGainExample: resolveGroomerCopy("XP_GAIN", "hinglish", { xp: 60 }),
      streakRisk: resolveGroomerCopy("STREAK_RISK"),
      psychology: {
        topState: {
          ...psychology.topState,
          text: resolveGroomerCopy(psychology.topState.key, "hinglish", psychology.topState.params).text,
        },
        recognition: psychology.recognition,
        nextRewardProgress: {
          ...psychology.nextRewardProgress,
          text: resolveGroomerCopy(psychology.nextRewardProgress.stateKey).text,
        },
        promotionFocus: {
          ...psychology.promotionFocus,
          text: resolveGroomerCopy(psychology.promotionFocus.stateKey).text,
        },
        victoryLanes: psychology.victoryLanes.map((lane) => ({
          ...lane,
          text: resolveGroomerCopy(lane.stateKey).text,
        })),
      },
    },
    teamLeaderboard,
    nextAction,
    leavePolicy,
    salaryAdvanceEligibility,
    recentRewards: member.rewardEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      summary: event.summary,
      xpAwarded: event.xpAwarded,
      rewardPointsAwarded: event.rewardPointsAwarded,
      createdAt: event.createdAt.toISOString(),
    })),
    upcomingBookings: member.bookings.map((booking) => {
      const firstSlot = [...booking.slots].sort(
        (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
      )[0]?.slot ?? null;
      return {
        id: booking.id,
        status: booking.status,
        selectedDate: booking.selectedDate,
        serviceName: booking.service.name,
        customerName: booking.user.name,
        city: booking.user.city,
        startTime: firstSlot?.startTime.toISOString() ?? null,
      };
    }),
    todayBookings: todayBookings.map((booking) => {
      const firstSlot = [...booking.slots].sort(
        (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
      )[0]?.slot ?? null;
      return {
        id: booking.id,
        status: booking.status,
        selectedDate: booking.selectedDate,
        serviceName: booking.service.name,
        customerName: booking.user.name,
        city: booking.user.city,
        startTime: firstSlot?.startTime.toISOString() ?? null,
      };
    }),
    leaveRequests: member.leaveRequests.map((request) => ({
      id: request.id,
      leaveType: request.leaveType,
      status: request.status,
      emergencyFlag: request.emergencyFlag,
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      reason: request.reason,
      reviewNote: request.reviewNote ?? null,
      requestedAt: request.requestedAt.toISOString(),
    })),
    salaryAdvanceRequests: member.salaryAdvanceRequests.map((request) => ({
      id: request.id,
      status: request.status,
      amount: request.amount,
      reason: request.reason,
      requestedAt: request.requestedAt.toISOString(),
      reviewNote: request.reviewNote ?? null,
    })),
    referrals: member.referralsMade.map((record) => ({
      id: record.id,
      candidateName: record.candidateName,
      candidatePhone: record.candidatePhone ?? "",
      role: record.role,
      status: record.status,
      notes: record.notes ?? "",
      createdAt: record.createdAt.toISOString(),
    })),
    trainingModules: activeModules.map((module) => ({
      id: module.id,
      title: module.title,
      category: module.category,
      description: module.description ?? "",
      xpReward: module.xpReward,
      rewardPointsReward: module.rewardPointsReward,
      completed: completedTrainingIds.has(module.id),
      interestStatus: trainingInterestByModule.get(module.id)?.status ?? null,
      interestRequestedAt: trainingInterestByModule.get(module.id)?.requestedAt.toISOString() ?? null,
    })),
    rewardStore,
  };
}

function rankPercentLike(value: number) {
  return Math.max(0, Math.min(100, value));
}
