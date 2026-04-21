type CopyVariant = {
  hindi: string;
  hinglish: string;
  ui?: "hero" | "banner" | "popup" | "card" | "inline";
  priority?: "high" | "medium" | "low";
};

function fillTemplate(template: string, params: Record<string, string | number | undefined> = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? ""));
}

export const GROOMER_STATE_COPY: Record<string, CopyVariant> = {
  ONBOARDING_WELCOME: {
    hindi: "All Tails mein aapka swagat hai",
    hinglish: "All Tails mein aapka swagat hai",
    ui: "hero",
    priority: "high",
  },
  ONBOARDING_NO_ACTIVITY: {
    hindi: "Aaj ka progress abhi shuru nahi hua hai",
    hinglish: "Aaj ka progress abhi shuru nahi hua hai",
    ui: "card",
  },
  ONBOARDING_DAY_7: {
    hindi: "Pehle 7 din ki strong aadat ab ban rahi hai",
    hinglish: "Pehle 7 din ki strong aadat ab ban rahi hai",
    ui: "banner",
    priority: "medium",
  },
  ONBOARDING_DAY_14: {
    hindi: "14 din ke andar jo rhythm banti hai wahi long-term growth ko push karti hai",
    hinglish: "14 din ke andar jo rhythm banti hai wahi long-term growth ko push karti hai",
    ui: "banner",
    priority: "medium",
  },
  DAY_START: {
    hindi: "Aaj ka din shuru kijiye",
    hinglish: "Aaj ka din shuru kijiye",
    ui: "banner",
  },
  TASK_PENDING: {
    hindi: "Yeh task abhi baaki hai",
    hinglish: "Yeh task abhi baaki hai",
    ui: "inline",
  },
  TASK_IN_PROGRESS: {
    hindi: "Aap sahi track par hain",
    hinglish: "Aap sahi track par hain",
    ui: "inline",
  },
  TASK_COMPLETE: {
    hindi: "Shabash! Aapne yeh task complete kar liya",
    hinglish: "Shabash! Aapne yeh task complete kar liya",
    ui: "popup",
    priority: "medium",
  },
  DAY_COMPLETE: {
    hindi: "Aaj ka mission poora ho gaya",
    hinglish: "Aaj ka mission poora ho gaya",
    ui: "banner",
    priority: "medium",
  },
  XP_GAIN: {
    hindi: "+{{xp}} Groom XP earn kiya",
    hinglish: "+{{xp}} Groom XP earn kiya",
    ui: "popup",
    priority: "low",
  },
  XP_HIGH_DAY: {
    hindi: "Aaj ka performance strong tha",
    hinglish: "Aaj ka performance strong tha",
    ui: "card",
  },
  XP_LOW_DAY: {
    hindi: "Aaj thoda improvement ki zaroorat hai",
    hinglish: "Aaj thoda improvement ki zaroorat hai",
    ui: "card",
  },
  STREAK_ACTIVE: {
    hindi: "Aapki streak chal rahi hai — great job",
    hinglish: "Aapki streak chal rahi hai — great job",
    ui: "card",
  },
  STREAK_MILESTONE: {
    hindi: "Aapne {{days}} din ki streak complete ki",
    hinglish: "Aapne {{days}} din ki streak complete ki",
    ui: "popup",
    priority: "high",
  },
  STREAK_RISK: {
    hindi: "Aaj miss hua toh streak toot jayegi",
    hinglish: "Aaj miss hua toh streak toot jayegi",
    ui: "banner",
    priority: "high",
  },
  STREAK_RISK_25: {
    hindi: "Abhi action nahi liya toh aaj ka streak risk mein chala jayega",
    hinglish: "Abhi action nahi liya toh aaj ka streak risk mein chala jayega",
    ui: "banner",
    priority: "high",
  },
  REWARD_LOCKED: {
    hindi: "Yeh reward abhi locked hai",
    hinglish: "Yeh reward abhi locked hai",
    ui: "card",
  },
  REWARD_NEAR: {
    hindi: "Bas thoda aur — reward unlock hone wala hai",
    hinglish: "Bas thoda aur — reward unlock hone wala hai",
    ui: "card",
    priority: "medium",
  },
  REWARD_NEAR_80: {
    hindi: "Aap reward zone ke andar aa gaye hain",
    hinglish: "Aap reward zone ke andar aa gaye hain",
    ui: "banner",
    priority: "medium",
  },
  REWARD_NEAR_95: {
    hindi: "Bas ek strong push aur — reward khulne wala hai",
    hinglish: "Bas ek strong push aur — reward khulne wala hai",
    ui: "banner",
    priority: "high",
  },
  REWARD_READY: {
    hindi: "Yeh reward ab aap claim kar sakte hain",
    hinglish: "Yeh reward ab aap claim kar sakte hain",
    ui: "banner",
    priority: "high",
  },
  REWARD_PENDING: {
    hindi: "Reward request bhej di gayi hai",
    hinglish: "Reward request bhej di gayi hai",
    ui: "card",
    priority: "medium",
  },
  REWARD_CLAIMED: {
    hindi: "Aapne reward claim kar liya hai",
    hinglish: "Aapne reward claim kar liya hai",
    ui: "popup",
    priority: "medium",
  },
  PROMOTION_PROGRESS: {
    hindi: "Aap next rank ki taraf badh rahe hain",
    hinglish: "Aap next rank ki taraf badh rahe hain",
    ui: "card",
  },
  PROMOTION_NEAR: {
    hindi: "Aap promotion ke bahut kareeb hain",
    hinglish: "Aap promotion ke bahut kareeb hain",
    ui: "banner",
    priority: "medium",
  },
  PROMOTION_CHASE: {
    hindi: "Promotion chase ab active zone mein hai",
    hinglish: "Promotion chase ab active zone mein hai",
    ui: "card",
    priority: "medium",
  },
  PROMOTION_READY: {
    hindi: "Aap promotion ke liye eligible ho chuke hain",
    hinglish: "Aap promotion ke liye eligible ho chuke hain",
    ui: "banner",
    priority: "high",
  },
  PROMOTION_BLOCKED: {
    hindi: "Kuch requirements abhi pending hain",
    hinglish: "Kuch requirements abhi pending hain",
    ui: "card",
  },
  SMALL_EARLY_WIN: {
    hindi: "Chhoti jeet se hi strong momentum banta hai",
    hinglish: "Chhoti jeet se hi strong momentum banta hai",
    ui: "card",
    priority: "medium",
  },
  IDENTITY_SHIFT: {
    hindi: "Aap dheere dheere ek strong All Tails professional ban rahe hain",
    hinglish: "Aap dheere dheere ek strong All Tails professional ban rahe hain",
    ui: "banner",
    priority: "medium",
  },
  RESPECTFUL_RECOVERY: {
    hindi: "Aaj ka din reset aur strong comeback ka mauka hai",
    hinglish: "Aaj ka din reset aur strong comeback ka mauka hai",
    ui: "card",
    priority: "medium",
  },
  TEAM_CHASE: {
    hindi: "Aapki team अगली position ke bahut kareeb aa sakti hai",
    hinglish: "Aapki team agali position ke bahut kareeb aa sakti hai",
    ui: "card",
    priority: "medium",
  },
  TEAM_LEADING: {
    hindi: "Aapki team abhi lead kar rahi hai",
    hinglish: "Aapki team abhi lead kar rahi hai",
    ui: "card",
    priority: "medium",
  },
  DISCIPLINE_LANE: {
    hindi: "Discipline lane strong chal rahi hai",
    hinglish: "Discipline lane strong chal rahi hai",
    ui: "card",
    priority: "medium",
  },
  MOST_IMPROVED: {
    hindi: "Aapka progress pichhle phase se strong upar gaya hai",
    hinglish: "Aapka progress pichhle phase se strong upar gaya hai",
    ui: "card",
    priority: "medium",
  },
  QUALITY_LANE: {
    hindi: "Quality lane strong chal rahi hai",
    hinglish: "Quality lane strong chal rahi hai",
    ui: "card",
    priority: "medium",
  },
  REVIEW_OPTIONAL_BONUS: {
    hindi: "Review optional hai, lekin isse extra XP aur quality growth milti hai",
    hinglish: "Review optional hai, lekin isse extra XP aur quality growth milti hai",
    ui: "card",
    priority: "low",
  },
  SOP_MOMENTUM: {
    hindi: "SOP momentum strong hai, bas clean finish baaki hai",
    hinglish: "SOP momentum strong hai, bas clean finish baaki hai",
    ui: "banner",
    priority: "medium",
  },
  NO_BOOKINGS: {
    hindi: "Aaj ke liye koi booking assign nahi hui hai",
    hinglish: "Aaj ke liye koi booking assign nahi hui hai",
    ui: "card",
  },
  ERROR_NETWORK: {
    hindi: "Connection issue aa raha hai",
    hinglish: "Connection issue aa raha hai",
    ui: "banner",
    priority: "high",
  },
};

export function resolveGroomerCopy(
  key: keyof typeof GROOMER_STATE_COPY | string,
  mode: "hindi" | "hinglish" = "hinglish",
  params?: Record<string, string | number | undefined>
) {
  const copy = GROOMER_STATE_COPY[key];
  if (!copy) {
    return {
      text: "",
      ui: "inline" as const,
      priority: "low" as const,
    };
  }

  return {
    text: fillTemplate(copy[mode], params),
    ui: copy.ui ?? "inline",
    priority: copy.priority ?? "low",
  };
}
