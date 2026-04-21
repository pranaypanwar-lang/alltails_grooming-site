import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../../_lib/assertAdmin";
import { adminPrisma, ensureBookingSopSteps, logAdminBookingEvent } from "../../../../_lib/bookingAdmin";

export const runtime = "nodejs";

const COLLECTION_MODES = new Set(["cash", "online", "waived"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const collectionMode = typeof body.collectionMode === "string" ? body.collectionMode.trim() : "";
    const collectedAmount = Number(body.collectedAmount);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!COLLECTION_MODES.has(collectionMode)) {
      return NextResponse.json({ error: "Invalid collection mode" }, { status: 400 });
    }

    if (!Number.isFinite(collectedAmount) || collectedAmount < 0) {
      return NextResponse.json({ error: "Collected amount must be a valid non-negative number" }, { status: 400 });
    }

    const result = await adminPrisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, finalAmount: true, paymentMethod: true },
      });
      if (!booking) {
        throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
      }

      await ensureBookingSopSteps(tx, bookingId);

      const expectedAmount = booking.finalAmount;
      const mismatchFlag = collectionMode !== "waived" && collectedAmount !== expectedAmount;

      const paymentCollection = await tx.bookingPaymentCollection.upsert({
        where: { bookingId },
        update: {
          collectionMode,
          collectedAmount,
          expectedAmount,
          mismatchFlag,
          notes: notes || null,
          recordedAt: new Date(),
          recordedBy: "admin",
        },
        create: {
          bookingId,
          collectionMode,
          collectedAmount,
          expectedAmount,
          mismatchFlag,
          notes: notes || null,
          recordedBy: "admin",
        },
      });

      await tx.bookingSopStep.update({
        where: { bookingId_stepKey: { bookingId, stepKey: "payment_proof" } },
        data: {
          status: "completed",
          completedAt: new Date(),
          completedBy: "admin",
          notes: notes || null,
        },
      });

      return paymentCollection;
    });

    await logAdminBookingEvent({
      bookingId,
      type: "payment_collection_recorded",
      summary: result.mismatchFlag ? "Payment proof recorded with mismatch" : "Payment proof recorded",
      metadata: {
        collectionMode: result.collectionMode,
        collectedAmount: result.collectedAmount,
        expectedAmount: result.expectedAmount,
        mismatchFlag: result.mismatchFlag,
        notes: result.notes ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      paymentCollection: {
        collectionMode: result.collectionMode,
        collectedAmount: result.collectedAmount,
        expectedAmount: result.expectedAmount,
        mismatchFlag: result.mismatchFlag,
        notes: result.notes ?? null,
        recordedAt: result.recordedAt.toISOString(),
        recordedBy: result.recordedBy ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("POST /api/admin/bookings/:id/sop/payment-proof failed", error);
    return NextResponse.json({ error: "Failed to record payment proof" }, { status: 500 });
  }
}
