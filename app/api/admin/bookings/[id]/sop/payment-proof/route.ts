import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../../_lib/assertAdmin";
import { adminPrisma, ensureBookingSopSteps, logAdminBookingEvent } from "../../../../_lib/bookingAdmin";
import { syncCashCollectionLedgerForBooking } from "../../../../../../../lib/finance/groomerLedger";

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
    const applyServiceAmountChange = body.applyServiceAmountChange === true;

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
      if (applyServiceAmountChange && booking.paymentMethod !== "pay_after_service") {
        throw Object.assign(new Error("Service amount changes are only allowed for pay-after-service bookings"), { httpStatus: 400 });
      }
      if (applyServiceAmountChange && !notes) {
        throw Object.assign(new Error("Add a note explaining the plan change"), { httpStatus: 400 });
      }

      const mismatchFlag =
        collectionMode !== "waived" &&
        collectedAmount !== expectedAmount &&
        !applyServiceAmountChange;

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

      if (applyServiceAmountChange && booking.finalAmount !== collectedAmount) {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            finalAmount: collectedAmount,
          },
        });
      }

      await syncCashCollectionLedgerForBooking(tx, bookingId);

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
      type: applyServiceAmountChange ? "service_amount_updated" : "payment_collection_recorded",
      summary: applyServiceAmountChange
        ? (collectedAmount > result.expectedAmount ? "Service amount updated for upsell" : "Service amount updated for downgrade")
        : result.mismatchFlag ? "Payment proof recorded with mismatch" : "Payment proof recorded",
      metadata: {
        collectionMode: result.collectionMode,
        collectedAmount: result.collectedAmount,
        expectedAmount: result.expectedAmount,
        mismatchFlag: result.mismatchFlag,
        applyServiceAmountChange,
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
        serviceAmountUpdated: !result.mismatchFlag && result.collectedAmount !== result.expectedAmount,
        serviceAmountDirection:
          !result.mismatchFlag && result.collectedAmount !== result.expectedAmount
            ? result.collectedAmount > result.expectedAmount
              ? "upsell"
              : "downgrade"
            : null,
        notes: result.notes ?? null,
        recordedAt: result.recordedAt.toISOString(),
        recordedBy: result.recordedBy ?? null,
      },
      finalAmount: applyServiceAmountChange ? collectedAmount : result.expectedAmount === collectedAmount && !result.mismatchFlag ? collectedAmount : result.expectedAmount,
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
