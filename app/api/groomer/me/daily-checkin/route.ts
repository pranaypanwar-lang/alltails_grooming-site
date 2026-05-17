import { NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { awardDailyCheckin } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

export async function POST() {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await awardDailyCheckin(adminPrisma, member.id);
    return NextResponse.json({ success: true, alreadyClaimed: result.alreadyClaimed, reward: result.reward });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check-in failed" },
      { status: 500 }
    );
  }
}
