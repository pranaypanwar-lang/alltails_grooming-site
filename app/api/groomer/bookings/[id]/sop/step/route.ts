import { NextRequest, NextResponse } from "next/server";
import { adminPrisma, ensureBookingSopSteps, logBookingEvent } from "../../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../../_lib/assertGroomerAccess";
import { getBookingSopStepDefinition, isBookingSopStepKey } from "../../../../../../../lib/booking/sop";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const stepKey = typeof body.stepKey === "string" ? body.stepKey.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!isBookingSopStepKey(stepKey)) {
      return NextResponse.json({ error: "Invalid SOP step" }, { status: 400 });
    }
    if (!["pending", "completed"].includes(status)) {
      return NextResponse.json({ error: "Invalid SOP status" }, { status: 400 });
    }

    const definition = getBookingSopStepDefinition(stepKey);
    if (!definition) {
      return NextResponse.json({ error: "SOP step configuration not found" }, { status: 400 });
    }

    await adminPrisma.$transaction(async (tx) => {
      await ensureBookingSopSteps(tx, bookingId);
      await tx.bookingSopStep.update({
        where: { bookingId_stepKey: { bookingId, stepKey } },
        data: {
          status: status as "pending" | "completed",
          completedAt: status === "completed" ? new Date() : null,
          completedBy: status === "completed" ? "groomer" : null,
        },
      });
    });

    await logBookingEvent({
      bookingId,
      actor: "groomer",
      type: "sop_step_updated",
      summary: `${definition.label} marked ${status}`,
      metadata: { stepKey, status, source: "groomer_portal" },
    });

    return NextResponse.json({ success: true, bookingId, stepKey, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update SOP step" },
      { status: 500 }
    );
  }
}
