import { NextResponse } from "next/server";
import { adminPrisma } from "../../_lib/bookingAdmin";
import { refillMonthlyStreakShields, awardWorkAnniversary } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const results: { shields: string; anniversaries: { memberId: string; years: number; status: string }[] } = {
    shields: "",
    anniversaries: [],
  };

  // 1. Refill streak shields for all active groomers
  await refillMonthlyStreakShields(adminPrisma);
  results.shields = "refilled";

  // 2. Award work anniversaries to groomers whose join date matches today (month + day)
  const activeMembers = await adminPrisma.teamMember.findMany({
    where: { isActive: true, joinedAt: { not: undefined } },
    select: { id: true, joinedAt: true, name: true },
  });

  for (const member of activeMembers) {
    if (!member.joinedAt) continue;
    const joined = new Date(member.joinedAt);
    if (joined.getMonth() !== today.getMonth() || joined.getDate() !== today.getDate()) continue;

    const years = today.getFullYear() - joined.getFullYear();
    if (years < 1) continue;

    try {
      await awardWorkAnniversary(adminPrisma, member.id, years);
      results.anniversaries.push({ memberId: member.id, years, status: "awarded" });
    } catch (error) {
      results.anniversaries.push({
        memberId: member.id,
        years,
        status: `error: ${error instanceof Error ? error.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({ success: true, ...results });
}
