import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";
import { consumeStreakShield } from "../../../../../../lib/groomerRewards";

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

    const result = await consumeStreakShield(adminPrisma, memberId);
    if (!result.used) {
      return NextResponse.json({ error: "Is mahine koi shield bacha nahi hai" }, { status: 400 });
    }
    return NextResponse.json({ success: true, shieldsRemaining: result.shieldsRemaining });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shield use fail ho gaya" },
      { status: 500 }
    );
  }
}
