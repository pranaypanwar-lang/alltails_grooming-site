import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerMemberAccess } from "../../../_lib/assertGroomerMemberAccess";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await context.params;
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    const token = request.nextUrl.searchParams.get("token");

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const candidateName = typeof body.candidateName === "string" ? body.candidateName.trim() : "";
    const candidatePhone = typeof body.candidatePhone === "string" ? body.candidatePhone.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "groomer";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!candidateName) {
      return NextResponse.json({ error: "Candidate name is required" }, { status: 400 });
    }

    const created = await adminPrisma.workforceReferralRecord.create({
      data: {
        referrerMemberId: memberId,
        candidateName,
        candidatePhone: candidatePhone || null,
        role,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      referral: {
        id: created.id,
        status: created.status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create referral" },
      { status: 500 }
    );
  }
}
