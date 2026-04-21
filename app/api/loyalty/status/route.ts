import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const LOYALTY_CYCLE = 5;

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

type LoyaltyState = "ineligible" | "progressing" | "unlocked" | "redeemed";

function buildLoyaltyPresentation(params: {
  completedCount: number;
  freeUnlocked: boolean;
  unlockedAt: Date | null;
  lastRedeemedAt: Date | null;
}) {
  const { completedCount, freeUnlocked, unlockedAt, lastRedeemedAt } = params;

  const sessionsInCurrentCycle = completedCount % LOYALTY_CYCLE;
  const remainingToFree = freeUnlocked
    ? 0
    : LOYALTY_CYCLE - sessionsInCurrentCycle;

  let state: LoyaltyState = "progressing";

  if (freeUnlocked) {
    state = "unlocked";
  } else if (lastRedeemedAt && completedCount > 0 && sessionsInCurrentCycle === 0) {
    state = "redeemed";
  }

  const progressPercent = freeUnlocked
    ? 100
    : Math.round((sessionsInCurrentCycle / LOYALTY_CYCLE) * 100);

  let headline = "";
  let supportingText = "";

  if (state === "unlocked") {
    headline = "Free session unlocked";
    supportingText = "Your next eligible booking can use this reward.";
  } else if (state === "redeemed") {
    headline = "Free grooming redeemed";
    supportingText = "Your previous reward was used. Your next cycle starts now.";
  } else {
    headline =
      remainingToFree === 1
        ? "1 session to your free grooming"
        : `${remainingToFree} sessions to your free grooming`;
    supportingText =
      remainingToFree === 1
        ? "Complete 1 more eligible session to unlock your next free session."
        : `Complete ${remainingToFree} more eligible sessions to unlock your next free session.`;
  }

  return {
    cycleSize: 5 as const,
    completedCount,
    sessionsInCurrentCycle,
    remainingToFree,
    freeUnlocked,
    unlockedAt: unlockedAt?.toISOString() ?? null,
    lastRedeemedAt: lastRedeemedAt?.toISOString() ?? null,
    state,
    progressPercent,
    headline,
    supportingText,
  };
}

export async function GET(req: NextRequest) {
  try {
    const rawPhone = req.nextUrl.searchParams.get("phone") || "";
    const phone = normalizePhone(rawPhone);

    if (phone.length < 10) {
      return NextResponse.json({ found: false });
    }

    const user = await prisma.user.findFirst({
      where: { phone: { endsWith: phone } },
      select: {
        loyaltyCompletedCount: true,
        loyaltyFreeUnlocked: true,
        loyaltyUnlockedAt: true,
        loyaltyLastRedeemedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ found: false });
    }

    const presentation = buildLoyaltyPresentation({
      completedCount: user.loyaltyCompletedCount,
      freeUnlocked: user.loyaltyFreeUnlocked,
      unlockedAt: user.loyaltyUnlockedAt ?? null,
      lastRedeemedAt: user.loyaltyLastRedeemedAt ?? null,
    });

    return NextResponse.json({
      found: true,
      ...presentation,
    });
  } catch (error) {
    console.error("GET /api/loyalty/status failed", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty status" },
      { status: 500 }
    );
  }
}
