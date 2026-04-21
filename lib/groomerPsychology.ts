import { resolveGroomerCopy } from "./groomerStateCopy";

type HomePsychologyInput = {
  daysSinceJoined: number;
  todayBookingCount: number;
  completedTodayCount: number;
  punctualityDoneToday: boolean;
  monthlyXp: number;
  monthlyGrade: string;
  profileCompletionPercent: number;
  currentXp: number;
  completedCount: number;
  reviewCount: number;
  trustScore: number;
  performanceScore: number;
  prestigeCredits: number;
  salaryHikeStage: number;
  rankProgressPercent: number;
  nextRankLabel: string | null;
  nextRankXpRemaining: number | null;
  promotionGates: Array<{ key: string; met: boolean }>;
  streaks: {
    punctuality: number;
    reviews: number;
    noLeaveDays: number;
  };
  nextBookingMinutesAway: number | null;
  teamPosition: number | null;
  totalTeams: number;
  gapToNextXp: number;
  rewardStore: Array<{
    key: string;
    title: string;
    creditsCost: number;
    requiredSalaryStage: number;
    detail: string;
    eligible: boolean;
    currentStatus: string | null;
  }>;
  recentRewardCount: number;
  badgeCount: number;
};

type Tone = "celebrate" | "warning" | "focus" | "steady";

export type HomePsychologyOutput = {
  topState: {
    key: string;
    params?: Record<string, string | number | undefined>;
    tone: Tone;
    detail: string;
  };
  recognition: {
    title: string;
    detail: string;
  };
  nextRewardProgress: {
    title: string;
    detail: string;
    percent: number;
    stateKey: string;
  };
  promotionFocus: {
    title: string;
    detail: string;
    stateKey: string;
  };
  victoryLanes: Array<{
    key: string;
    title: string;
    detail: string;
    percent: number;
    stateKey: string;
  }>;
};

type JobPsychologyInput = {
  dispatchState: string;
  bookingStatus: string;
  nextBookingMinutesAway: number | null;
  slaSecondsRemaining: number | null;
  completedRequiredStepCount: number;
  totalRequiredStepCount: number;
  reviewCompleted: boolean;
  reviewCount: number;
};

export type JobPsychologyOutput = {
  stateKey: string;
  tone: Tone;
  detail: string;
};

type ActionMomentInput = {
  action:
    | "claim_member"
    | "en_route"
    | "started"
    | "step_saved"
    | "payment_saved"
    | "complete";
  stepKey?: string;
  xpAwarded?: number;
  rewardCreditsAwarded?: number;
  prestigeCredits?: number;
};

export type ActionMomentOutput = {
  titleKey: string;
  titleParams?: Record<string, string | number | undefined>;
  detail: string;
  tone: Tone;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getRewardProgress(input: HomePsychologyInput) {
  const nextReward = input.rewardStore.find((reward) => reward.currentStatus !== "approved" && !reward.eligible) ?? input.rewardStore[0];
  if (!nextReward) {
    return {
      title: "Rewards live hain",
      detail: "Naya reward lane jaldi yahan dikhega.",
      percent: 100,
      stateKey: "REWARD_READY",
    };
  }

  const creditPercent = nextReward.creditsCost > 0
    ? (input.prestigeCredits / nextReward.creditsCost) * 100
    : 100;
  const stagePercent = nextReward.requiredSalaryStage > 0
    ? (input.salaryHikeStage / nextReward.requiredSalaryStage) * 100
    : 100;
  const percent = clampPercent(Math.min(creditPercent, stagePercent));

  const stateKey =
    nextReward.currentStatus === "pending"
      ? "REWARD_PENDING"
      : nextReward.eligible
        ? "REWARD_READY"
        : percent >= 95
          ? "REWARD_NEAR_95"
          : percent >= 80
            ? "REWARD_NEAR_80"
            : "REWARD_LOCKED";

  const creditGap = Math.max(0, nextReward.creditsCost - input.prestigeCredits);
  const stageGap = Math.max(0, nextReward.requiredSalaryStage - input.salaryHikeStage);
  const detail =
    nextReward.currentStatus === "pending"
      ? `${nextReward.title} ke liye request ja chuki hai. Ab approval ka wait hai.`
      : nextReward.eligible
        ? `${nextReward.title} ab claim ke liye ready hai.`
        : stageGap > 0
          ? `${nextReward.title} ke liye ${creditGap} credits aur stage ${nextReward.requiredSalaryStage} chahiye.`
          : `${nextReward.title} ke liye bas ${creditGap} credits aur chahiye.`;

  return {
    title: nextReward.title,
    detail,
    percent,
    stateKey,
  };
}

function getPromotionFocus(input: HomePsychologyInput) {
  const metCount = input.promotionGates.filter((gate) => gate.met).length;
  const totalCount = Math.max(1, input.promotionGates.length);
  const gatesPercent = clampPercent((metCount / totalCount) * 100);
  const allMet = metCount === totalCount;

  if (allMet && (input.nextRankXpRemaining ?? 0) <= 0) {
    return {
      title: input.nextRankLabel ?? "Agla rank",
      detail: "Aap promotion ke liye ready ho. Review panel ke baad rank unlock hoga.",
      stateKey: "PROMOTION_READY",
    };
  }

  if (input.rankProgressPercent >= 95) {
    return {
      title: input.nextRankLabel ?? "Agla rank",
      detail: "Aap promotion ke bahut kareeb ho. Pending gates ko close karke push poora karo.",
      stateKey: allMet ? "PROMOTION_NEAR" : "PROMOTION_BLOCKED",
    };
  }

  if (input.rankProgressPercent >= 80 || gatesPercent >= 75) {
    return {
      title: input.nextRankLabel ?? "Agla rank",
      detail: `Promotion chase strong hai. ${Math.max(0, input.nextRankXpRemaining ?? 0)} XP aur gates par focus rakho.`,
      stateKey: "PROMOTION_CHASE",
    };
  }

  return {
    title: input.nextRankLabel ?? "Agla rank",
    detail: `Abhi foundation build ho raha hai. ${Math.max(0, input.nextRankXpRemaining ?? 0)} XP aur chahiye.`,
    stateKey: "PROMOTION_PROGRESS",
  };
}

function getVictoryLanes(input: HomePsychologyInput) {
  const consistencyPercent = clampPercent(
    Math.max(
      (input.streaks.punctuality / 10) * 100,
      (input.streaks.noLeaveDays / 30) * 100
    )
  );
  const qualityPercent = clampPercent(
    Math.max(
      input.reviewCount >= 5 ? 100 : (input.reviewCount / 5) * 100,
      input.performanceScore
    )
  );
  const teamPercent = clampPercent(
    input.teamPosition && input.totalTeams > 0
      ? 100 - (((input.teamPosition - 1) / input.totalTeams) * 100)
      : 0
  );
  const recoveryPercent = clampPercent(
    Math.max(
      input.profileCompletionPercent,
      input.monthlyXp >= 120 ? 100 : (input.monthlyXp / 120) * 100
    )
  );

  return [
    {
      key: "consistency",
      title: "Consistency lane",
      detail:
        consistencyPercent >= 80
          ? "Aapki daily discipline strong chal rahi hai."
          : "On-time aur no-break routine se yeh lane strong hoti hai.",
      percent: consistencyPercent,
      stateKey: consistencyPercent >= 80 ? "DISCIPLINE_LANE" : "TASK_PENDING",
    },
    {
      key: "quality",
      title: "Quality lane",
      detail:
        qualityPercent >= 80
          ? "Reviews aur performance score dono growth dikha rahe hain."
          : "5 verified reviews aur cleaner performance score ki taraf push karo.",
      percent: qualityPercent,
      stateKey: qualityPercent >= 80 ? "QUALITY_LANE" : "REVIEW_OPTIONAL_BONUS",
    },
    {
      key: "team",
      title: "Team push lane",
      detail:
        input.teamPosition === 1
          ? "Aapki team lead kar rahi hai. Position ko hold karna bhi जीत hai."
          : `Aapki team ko upar lane ke liye ${input.gapToNextXp} XP ka push chahiye.`,
      percent: teamPercent,
      stateKey: input.teamPosition === 1 ? "TEAM_LEADING" : "TEAM_CHASE",
    },
    {
      key: "growth",
      title: "Most improved lane",
      detail:
        recoveryPercent >= 80
          ? "Profile aur monthly momentum dono strong ho rahe hain."
          : "Documents, training aur daily XP se yeh lane tez chalegi.",
      percent: recoveryPercent,
      stateKey: recoveryPercent >= 80 ? "MOST_IMPROVED" : "SMALL_EARLY_WIN",
    },
  ];
}

export function deriveHomePsychology(input: HomePsychologyInput): HomePsychologyOutput {
  const rewardProgress = getRewardProgress(input);
  const promotionFocus = getPromotionFocus(input);
  const victoryLanes = getVictoryLanes(input);

  const highestStreak = Math.max(input.streaks.punctuality, input.streaks.reviews, input.streaks.noLeaveDays);
  const allPromotionGatesMet = input.promotionGates.every((gate) => gate.met);

  const candidates: Array<{
    key: string;
    params?: Record<string, string | number | undefined>;
    tone: Tone;
    detail: string;
    priority: number;
  }> = [];

  if (rewardProgress.stateKey === "REWARD_READY") {
    candidates.push({
      key: "REWARD_READY",
      tone: "celebrate",
      detail: `${rewardProgress.title} ab claim ke liye ready hai.`,
      priority: 100,
    });
  }
  if (allPromotionGatesMet && (input.nextRankXpRemaining ?? 0) <= 0) {
    candidates.push({
      key: "PROMOTION_READY",
      tone: "celebrate",
      detail: "Sab gates clear hain. Promotion review ke liye aap ready ho.",
      priority: 96,
    });
  }
  if (
    input.nextBookingMinutesAway !== null &&
    input.nextBookingMinutesAway <= 25 &&
    !input.punctualityDoneToday &&
    highestStreak >= 3
  ) {
    candidates.push({
      key: "STREAK_RISK_25",
      tone: "warning",
      detail: "Aaj on-time step miss hua toh current streak par asar padega.",
      priority: 94,
    });
  }
  if (input.daysSinceJoined <= 7) {
    candidates.push({
      key: "ONBOARDING_DAY_7",
      tone: "focus",
      detail: "Pehle hafte ki routine hi aage ka growth base banati hai.",
      priority: 88,
    });
  } else if (input.daysSinceJoined <= 14) {
    candidates.push({
      key: "ONBOARDING_DAY_14",
      tone: "focus",
      detail: "Dusre hafte mein consistency dikhi toh progression fast feel hone lagti hai.",
      priority: 82,
    });
  }
  if (rewardProgress.percent >= 95 && rewardProgress.stateKey !== "REWARD_READY") {
    candidates.push({
      key: "REWARD_NEAR_95",
      tone: "focus",
      detail: `${rewardProgress.title} bas ek chhote push par hai.`,
      priority: 90,
    });
  } else if (rewardProgress.percent >= 80) {
    candidates.push({
      key: "REWARD_NEAR_80",
      tone: "focus",
      detail: `${rewardProgress.title} ka unlock zone shuru ho chuka hai.`,
      priority: 84,
    });
  }
  if (
    input.monthlyGrade === "C" ||
    input.monthlyGrade === "D" ||
    (input.monthlyXp < 60 && input.todayBookingCount > 0)
  ) {
    candidates.push({
      key: "RESPECTFUL_RECOVERY",
      tone: "steady",
      detail: "Aaj ek strong shift se momentum wapas pakda ja sakta hai.",
      priority: 76,
    });
  }
  if (
    input.currentXp >= 7500 ||
    input.completedCount >= 25 ||
    input.badgeCount >= 2
  ) {
    candidates.push({
      key: "IDENTITY_SHIFT",
      tone: "steady",
      detail: "Ab aap sirf tasks complete nahi kar rahe, ek strong professional track build kar rahe ho.",
      priority: 68,
    });
  }
  if (input.currentXp < 1500 || input.profileCompletionPercent < 100) {
    candidates.push({
      key: "SMALL_EARLY_WIN",
      tone: "focus",
      detail: "Chhote wins se confidence aur XP dono fast bante hain.",
      priority: 60,
    });
  }
  if (input.teamPosition !== null && input.teamPosition > 1) {
    candidates.push({
      key: "TEAM_CHASE",
      tone: "focus",
      detail: `Aapki team ko next position ke liye ${input.gapToNextXp} XP ka push chahiye.`,
      priority: 54,
    });
  }

  const winner =
    candidates.sort((a, b) => b.priority - a.priority)[0] ?? {
      key: "DAY_START",
      tone: "steady" as Tone,
      detail: "Aaj ka progress abhi aapke haath mein hai.",
      priority: 0,
    };

  const recognition =
    winner.key === "ONBOARDING_DAY_7" || winner.key === "ONBOARDING_DAY_14"
      ? {
          title: "Shuruaati rhythm bahut important hai",
          detail: "Pehle do hafte ki aadat hi aage ka level pace set karti hai.",
        }
      : winner.key === "IDENTITY_SHIFT"
      ? {
          title: "Aap bas kaam nahi, standard build kar rahe ho",
          detail: "Har clean day aapko next professional band ke kareeb le ja raha hai.",
        }
      : winner.key === "RESPECTFUL_RECOVERY"
        ? {
            title: "Comeback ka din",
            detail: "Aaj ka disciplined shift poore week ko better bana sakta hai.",
          }
        : winner.key.startsWith("REWARD_NEAR")
          ? {
              title: "Reward ab visible zone mein hai",
              detail: "Near-win moments ko front par rakhna hi momentum build karta hai.",
            }
          : {
              title: input.recentRewardCount > 0 ? "Recent progress live hai" : "Aaj ka shine",
              detail:
                input.recentRewardCount > 0
                  ? "Jo momentum ban chuka hai, usko aaj bhi continue rakho."
                  : "Aaj ka strong kaam hi next unlock banayega.",
            };

  return {
    topState: {
      key: winner.key,
      params: winner.params,
      tone: winner.tone,
      detail: winner.detail,
    },
    recognition,
    nextRewardProgress: rewardProgress,
    promotionFocus,
    victoryLanes,
  };
}

export function deriveJobFlowPsychology(input: JobPsychologyInput): JobPsychologyOutput {
  const completionPercent = input.totalRequiredStepCount > 0
    ? (input.completedRequiredStepCount / input.totalRequiredStepCount) * 100
    : 0;

  if (input.bookingStatus === "completed") {
    return {
      stateKey: "DAY_COMPLETE",
      tone: "celebrate",
      detail: "Booking close ho chuki hai. Review screenshot aaye to extra bonus mil sakta hai.",
    };
  }

  if (input.nextBookingMinutesAway !== null && input.nextBookingMinutesAway <= 25 && input.dispatchState !== "en_route") {
    return {
      stateKey: "STREAK_RISK",
      tone: "warning",
      detail: "Abhi nikalna zaroori hai. Delay se streak aur customer dono par asar pad sakta hai.",
    };
  }

  if (input.dispatchState === "assigned" && input.nextBookingMinutesAway !== null && input.nextBookingMinutesAway <= 60) {
    return {
      stateKey: "TASK_PENDING",
      tone: "focus",
      detail: "Next step hai en route mark karna. Time par nikalne se XP aur trust dono bante hain.",
    };
  }

  if (completionPercent >= 100 && !input.reviewCompleted) {
    return {
      stateKey: "REVIEW_OPTIONAL_BONUS",
      tone: "steady",
      detail: "Main kaam ho gaya hai. Review screenshot optional hai, lekin extra XP aur review streak ke liye useful hai.",
    };
  }

  if (completionPercent >= 80) {
    return {
      stateKey: "SOP_MOMENTUM",
      tone: "focus",
      detail: "Bas thoda aur. Remaining steps time par complete karke clean finish lo.",
    };
  }

  if (input.dispatchState === "started") {
    return {
      stateKey: "TASK_IN_PROGRESS",
      tone: "steady",
      detail: "Aap sahi track par ho. Ab har step ko sequence ke saath complete karo.",
    };
  }

  return {
    stateKey: "DAY_START",
    tone: "steady",
    detail: "Har sahi step se aaj ka case strong banta hai.",
  };
}

export function deriveActionMoment(input: ActionMomentInput): ActionMomentOutput {
  if (input.action === "complete") {
    return {
      titleKey: "DAY_COMPLETE",
      detail: "Booking strong finish hui. Ab reward summary, post-care aur agla unlock sab ek saath move karte hain.",
      tone: "celebrate",
    };
  }
  if (input.action === "en_route") {
    return {
      titleKey: input.xpAwarded && input.xpAwarded > 0 ? "XP_GAIN" : "TASK_IN_PROGRESS",
      titleParams: input.xpAwarded && input.xpAwarded > 0 ? { xp: input.xpAwarded } : undefined,
      detail: "Time par nikalna punctuality aur streak dono ko strong banata hai.",
      tone: "celebrate",
    };
  }
  if (input.action === "started") {
    return {
      titleKey: "TASK_IN_PROGRESS",
      detail: "Kaam start ho gaya. Ab sequence aur SLA dono par dhyan rakho.",
      tone: "steady",
    };
  }
  if (input.action === "claim_member") {
    return {
      titleKey: "IDENTITY_SHIFT",
      detail: "Ab is booking ka progress aur rewards sahi naam par save honge.",
      tone: "steady",
    };
  }
  if (input.action === "payment_saved") {
    return {
      titleKey: "TASK_COMPLETE",
      detail: "Payment save ho gaya. Ab final close aur review bonus par dhyan do.",
      tone: "celebrate",
    };
  }
  if (input.stepKey === "review_proof") {
    return {
      titleKey: input.xpAwarded && input.xpAwarded > 0 ? "XP_GAIN" : "REVIEW_OPTIONAL_BONUS",
      titleParams: input.xpAwarded && input.xpAwarded > 0 ? { xp: input.xpAwarded } : undefined,
      detail: "Review optional tha, lekin isse quality lane, review streak aur unlock pace teeno strong hote hain.",
      tone: "celebrate",
    };
  }
  if (input.stepKey === "dress_check_selfie") {
    return {
      titleKey: "SMALL_EARLY_WIN",
      detail: "Clean start aur regulation follow karna trust build karta hai.",
      tone: "steady",
    };
  }
  return {
    titleKey: input.xpAwarded && input.xpAwarded > 0 ? "XP_GAIN" : "TASK_COMPLETE",
    titleParams: input.xpAwarded && input.xpAwarded > 0 ? { xp: input.xpAwarded } : undefined,
    detail: "Har सही step se case momentum aur progression dono badhte hain.",
    tone: "celebrate",
  };
}

export function resolvePsychologyText(
  key: string,
  mode: "hindi" | "hinglish",
  params?: Record<string, string | number | undefined>
) {
  return resolveGroomerCopy(key, mode, params).text;
}
