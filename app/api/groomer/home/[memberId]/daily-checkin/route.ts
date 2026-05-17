import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";
import { awardDailyCheckin } from "../../../../../../lib/groomerRewards";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await context.params;
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    const token = request.nextUrl.searchParams.get("token");
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

    const result = await awardDailyCheckin(adminPrisma, memberId);
    return NextResponse.json({ success: true, alreadyClaimed: result.alreadyClaimed, reward: result.reward });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check-in failed" },
      { status: 500 }
    );
  }
}
