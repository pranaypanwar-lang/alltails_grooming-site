import { NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { consumeStreakShield } from "../../../../../lib/groomerRewards";

export const runtime = "nodejs";

export async function POST() {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await consumeStreakShield(adminPrisma, member.id);
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
