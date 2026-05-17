/**
 * Single source of truth for the groomer reward store.
 * Used by groomerHome.ts serializer and both redemption API routes.
 *
 * creditsCost = prestige credits (1 credit = 1000 XP).
 * requiredSalaryStage = minimum salaryHikeStage to unlock.
 * tier = display grouping (1 = cheapest / most accessible).
 */

export type RewardStoreItem = {
  key: string;
  title: string;
  titleHindi: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  creditsCost: number;
  requiredSalaryStage: number;
  detail: string;
  emoji: string;
};

export const REWARD_STORE_ITEMS: RewardStoreItem[] = [
  // ─── Tier 1 · Chota Inam (3–8 credits) ───────────────────────────────────
  {
    key: "phone_recharge_30",
    title: "₹30 Phone Recharge",
    titleHindi: "₹30 Fone Recharge",
    tier: 1,
    creditsCost: 3,
    requiredSalaryStage: 0,
    detail: "3 credits par seedha recharge milega",
    emoji: "📱",
  },
  {
    key: "snack_treat",
    title: "Tea & Snack Treat",
    titleHindi: "Chai Naashta Treat",
    tier: 1,
    creditsCost: 3,
    requiredSalaryStage: 0,
    detail: "₹50 snack voucher, kisi bhi din use karo",
    emoji: "☕",
  },
  {
    key: "early_exit_1hr",
    title: "Leave 1 Hour Early",
    titleHindi: "1 Ghanta Pehle Chhuthi",
    tier: 1,
    creditsCost: 4,
    requiredSalaryStage: 0,
    detail: "Kisi bhi working day pe 1 ghanta pehle jaane ki permission",
    emoji: "🕐",
  },
  {
    key: "wristband",
    title: "All Tails Wristband",
    titleHindi: "All Tails Wristband",
    tier: 1,
    creditsCost: 4,
    requiredSalaryStage: 0,
    detail: "Branded All Tails wristband — groomer ki pehchaan",
    emoji: "🎽",
  },

  // ─── Tier 2 · Accha Inam (10–25 credits) ─────────────────────────────────
  {
    key: "half_day_off",
    title: "Half-Day Off",
    titleHindi: "Aadha Din Chhuthi",
    tier: 2,
    creditsCost: 10,
    requiredSalaryStage: 1,
    detail: "Junior band se upar aur 10 credits par aadhe din ki chhuthi",
    emoji: "🌤️",
  },
  {
    key: "swiggy_150",
    title: "Swiggy / Zomato ₹150",
    titleHindi: "Swiggy / Zomato ₹150",
    tier: 2,
    creditsCost: 12,
    requiredSalaryStage: 1,
    detail: "Food delivery voucher seedha mobile par aayega",
    emoji: "🍱",
  },
  {
    key: "movie_ticket",
    title: "Movie Ticket",
    titleHindi: "Movie Ticket",
    tier: 2,
    creditsCost: 14,
    requiredSalaryStage: 1,
    detail: "PVR / Inox ticket, apni date aur theatre choose karo",
    emoji: "🎬",
  },
  {
    key: "tshirt",
    title: "All Tails T-Shirt",
    titleHindi: "All Tails T-Shirt",
    tier: 2,
    creditsCost: 18,
    requiredSalaryStage: 1,
    detail: "Official branded groomer tee — apna size choose karo",
    emoji: "👕",
  },

  // ─── Tier 3 · Bada Inam (30–60 credits) ──────────────────────────────────
  {
    key: "paid_day_off",
    title: "Paid Full Day Off",
    titleHindi: "Paid Pura Din Chhuthi",
    tier: 3,
    creditsCost: 30,
    requiredSalaryStage: 2,
    detail: "Pet Groomer band ke baad ek paid day off claim karo",
    emoji: "🌴",
  },
  {
    key: "grocery_300",
    title: "Grocery Voucher ₹300",
    titleHindi: "Grocery Voucher ₹300",
    tier: 3,
    creditsCost: 32,
    requiredSalaryStage: 2,
    detail: "Kirana / BigBasket ₹300 ka voucher",
    emoji: "🛒",
  },
  {
    key: "amazon_300",
    title: "Amazon / Flipkart ₹300",
    titleHindi: "Amazon / Flipkart ₹300",
    tier: 3,
    creditsCost: 35,
    requiredSalaryStage: 2,
    detail: "Online shopping gift voucher apni choice ka",
    emoji: "🛍️",
  },
  {
    key: "grooming_tool",
    title: "Grooming Tool of Choice",
    titleHindi: "Apni Pasand ka Tool",
    tier: 3,
    creditsCost: 45,
    requiredSalaryStage: 2,
    detail: "Naya scissors, comb ya brush — admin se list maango",
    emoji: "✂️",
  },
  {
    key: "swiggy_300",
    title: "Swiggy / Zomato ₹300",
    titleHindi: "Swiggy / Zomato ₹300",
    tier: 3,
    creditsCost: 38,
    requiredSalaryStage: 2,
    detail: "Bada food delivery voucher",
    emoji: "🍛",
  },

  // ─── Tier 4 · Khaas Inam (80–150 credits) ────────────────────────────────
  {
    key: "dinner_for_2",
    title: "Family Dinner (₹800)",
    titleHindi: "Family Dinner (₹800)",
    tier: 4,
    creditsCost: 80,
    requiredSalaryStage: 2,
    detail: "₹800 restaurant voucher — family ke saath enjoy karo",
    emoji: "🍽️",
  },
  {
    key: "weekend_off",
    title: "Full Weekend Off",
    titleHindi: "Poora Weekend Off",
    tier: 4,
    creditsCost: 90,
    requiredSalaryStage: 3,
    detail: "Saturday + Sunday off — advance mein book karo",
    emoji: "🏖️",
  },
  {
    key: "data_sim_3m",
    title: "3-Month Data SIM Recharge",
    titleHindi: "3 Mahine ka Data Recharge",
    tier: 4,
    creditsCost: 100,
    requiredSalaryStage: 2,
    detail: "3 mahine ka unlimited data plan, apne number par",
    emoji: "📶",
  },
  {
    key: "all_tails_jacket",
    title: "All Tails Jacket",
    titleHindi: "All Tails Jacket",
    tier: 4,
    creditsCost: 120,
    requiredSalaryStage: 3,
    detail: "Official branded groomer jacket — status symbol",
    emoji: "🧥",
  },
  {
    key: "family_meal",
    title: "Family Meal Voucher",
    titleHindi: "Family Meal Voucher",
    tier: 4,
    creditsCost: 140,
    requiredSalaryStage: 3,
    detail: "Puri family ke liye bada meal voucher",
    emoji: "👨‍👩‍👧‍👦",
  },

  // ─── Tier 5 · Champion Inam (200–400 credits) ────────────────────────────
  {
    key: "new_phone",
    title: "New Smartphone",
    titleHindi: "Naya Smartphone",
    tier: 5,
    creditsCost: 250,
    requiredSalaryStage: 4,
    detail: "Redmi / Realme entry-level phone — mehnat ka inaam",
    emoji: "📲",
  },
  {
    key: "festival_bonus_2000",
    title: "Festival Bonus ₹2,000",
    titleHindi: "Tyohaar Bonus ₹2,000",
    tier: 5,
    creditsCost: 200,
    requiredSalaryStage: 4,
    detail: "₹2,000 cash bonus seedha salary mein ya hand-to-hand",
    emoji: "🪔",
  },
  {
    key: "five_day_leave",
    title: "5-Day Paid Leave",
    titleHindi: "5 Din Paid Chhuthi",
    tier: 5,
    creditsCost: 220,
    requiredSalaryStage: 4,
    detail: "5 consecutive paid days off — advance mein plan karo",
    emoji: "🗓️",
  },
  {
    key: "family_trip_3000",
    title: "Family Trip Contribution ₹3,000",
    titleHindi: "Family Trip ₹3,000",
    tier: 5,
    creditsCost: 300,
    requiredSalaryStage: 4,
    detail: "Travel ke liye ₹3,000 direct support",
    emoji: "🚂",
  },

  // ─── Tier 6 · Legend Reward (600+ credits) ───────────────────────────────
  {
    key: "laptop_tablet",
    title: "Tablet / Laptop",
    titleHindi: "Tablet / Laptop",
    tier: 6,
    creditsCost: 600,
    requiredSalaryStage: 5,
    detail: "Entry-level device for growth — Hall of Fame groomers only",
    emoji: "💻",
  },
  {
    key: "cash_5000",
    title: "₹5,000 Cash Reward",
    titleHindi: "₹5,000 Nakit Inam",
    tier: 6,
    creditsCost: 650,
    requiredSalaryStage: 5,
    detail: "Direct cash — legend-tier achievement",
    emoji: "💵",
  },
  {
    key: "recognition_event",
    title: "Public Recognition Event",
    titleHindi: "Public Samman Samaroh",
    tier: 6,
    creditsCost: 700,
    requiredSalaryStage: 6,
    detail: "Official All Tails ceremony, certificate, aur office Hall of Fame photo",
    emoji: "🏆",
  },
];

export const REWARD_STORE_MAP = Object.fromEntries(
  REWARD_STORE_ITEMS.map((item) => [item.key, item])
) as Record<string, RewardStoreItem>;

export const TIER_LABELS: Record<number, string> = {
  1: "Chota Inam",
  2: "Accha Inam",
  3: "Bada Inam",
  4: "Khaas Inam",
  5: "Champion Inam",
  6: "Legend Reward",
};
