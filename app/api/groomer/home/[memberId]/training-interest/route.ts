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
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const access = await assertGroomerMemberAccess({ bookingId, memberId, token });
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const moduleId = typeof body.moduleId === "string" ? body.moduleId.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!moduleId) {
      return NextResponse.json({ error: "moduleId is required" }, { status: 400 });
    }

    const trainingModule = await adminPrisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!trainingModule) return NextResponse.json({ error: "Training module not found" }, { status: 404 });

    const interest = await adminPrisma.workforceTrainingInterest.upsert({
      where: {
        teamMemberId_moduleId: {
          teamMemberId: memberId,
          moduleId,
        },
      },
      update: {
        status: "interested",
        note: note || null,
        requestedAt: new Date(),
      },
      create: {
        teamMemberId: memberId,
        moduleId,
        status: "interested",
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, trainingInterest: { id: interest.id, status: interest.status } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save training interest" },
      { status: 500 }
    );
  }
}
