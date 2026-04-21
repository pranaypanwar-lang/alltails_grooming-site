import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
          teamMemberId: member.id,
          moduleId,
        },
      },
      update: {
        status: "interested",
        note: note || null,
        requestedAt: new Date(),
      },
      create: {
        teamMemberId: member.id,
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
