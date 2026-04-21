import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../../_lib/assertAdmin";
import { adminPrisma, ensureBookingSopSteps, logAdminBookingEvent } from "../../../../_lib/bookingAdmin";
import { getBookingSopStepDefinition, isBookingSopStepKey } from "../../../../../../../lib/booking/sop";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const stepKey = typeof body.stepKey === "string" ? body.stepKey.trim() : "";
    const status = body.status === "completed" ? "completed" : "pending";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!isBookingSopStepKey(stepKey)) {
      return NextResponse.json({ error: "Invalid SOP step" }, { status: 400 });
    }

    const definition = getBookingSopStepDefinition(stepKey);
    if (!definition) {
      return NextResponse.json({ error: "SOP step configuration not found" }, { status: 400 });
    }

    const result = await adminPrisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
      if (!booking) {
        throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
      }

      await ensureBookingSopSteps(tx, bookingId);

      const step = await tx.bookingSopStep.findUnique({
        where: { bookingId_stepKey: { bookingId, stepKey } },
      });

      if (!step) {
        throw Object.assign(new Error("SOP step not found"), { httpStatus: 404 });
      }

      const updated = await tx.bookingSopStep.update({
        where: { id: step.id },
        data: {
          status,
          notes: notes || null,
          completedAt: status === "completed" ? new Date() : null,
          completedBy: status === "completed" ? "admin" : null,
        },
      });

      return updated;
    });

    await logAdminBookingEvent({
      bookingId,
      type: "sop_step_updated",
      summary: `${definition.label} marked ${status === "completed" ? "complete" : "pending"}`,
      metadata: {
        stepKey,
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      stepKey,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("POST /api/admin/bookings/:id/sop/step failed", error);
    return NextResponse.json({ error: "Failed to update SOP step" }, { status: 500 });
  }
}
