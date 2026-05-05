import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import {
  adminPrisma,
  logAdminBookingEvent,
  processBookingRefund,
  type RefundMode,
} from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

/**
 * Re-issue or retry a refund on a paid booking.
 *
 * Use cases:
 *  - Booking was cancelled with razorpay_refund but the call failed (refundStatus=failed) — retry.
 *  - Booking was cancelled before this feature existed and now needs a refund recorded.
 *  - Admin chose "waived" originally and now wants to issue a refund anyway.
 *
 * Idempotency: refuses if refundStatus is already "completed" to prevent double refunds.
 * Admin can override by passing { force: true } if explicitly intended.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));

    const refundMode = body.refundMode as RefundMode;
    const refundNotes: string = body.refundNotes ?? "";
    const force: boolean = body.force === true;

    if (!["manual_refund", "razorpay_refund", "waived"].includes(refundMode)) {
      return NextResponse.json(
        { error: "refundMode must be manual_refund | razorpay_refund | waived" },
        { status: 400 }
      );
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Refunds are only valid for paid bookings." },
        { status: 400 }
      );
    }
    if (booking.refundStatus === "completed" && !force) {
      return NextResponse.json(
        {
          error:
            "Refund is already marked completed. Pass { force: true } to override (use carefully — this can cause double refunds).",
        },
        { status: 409 }
      );
    }

    const refund = await processBookingRefund({
      refundMode,
      razorpayPaymentId: booking.razorpayPaymentId,
      amount: booking.finalAmount,
    });

    await adminPrisma.booking.update({
      where: { id: bookingId },
      data: {
        refundStatus: refund.refundStatus,
        refundMode: refund.refundMode,
        refundNotes: refundNotes.trim() || booking.refundNotes,
        refundAmount: refund.refundAmount,
        refundedAt: refund.refundedAt ?? booking.refundedAt,
        razorpayRefundId: refund.razorpayRefundId ?? booking.razorpayRefundId,
      },
    });

    const summary =
      refund.refundStatus === "completed"
        ? `Refund issued — ${refundMode === "razorpay_refund" ? "Razorpay" : refundMode === "manual_refund" ? "manual" : "waived"}`
        : refund.refundStatus === "failed"
          ? "Refund attempt FAILED"
          : "Refund waived";

    await logAdminBookingEvent({
      bookingId,
      type: "booking_refund_issued",
      summary,
      metadata: {
        refundMode,
        refundStatus: refund.refundStatus,
        razorpayRefundId: refund.razorpayRefundId,
        refundError: refund.errorMessage,
        refundAmount: refund.refundAmount,
        refundNotes: refundNotes || null,
        finalAmount: booking.finalAmount,
        razorpayPaymentId: booking.razorpayPaymentId,
        force,
      },
    });

    return NextResponse.json({
      success: refund.refundStatus !== "failed",
      bookingId,
      refundStatus: refund.refundStatus,
      refundMode: refund.refundMode,
      razorpayRefundId: refund.razorpayRefundId,
      refundAmount: refund.refundAmount,
      refundError: refund.errorMessage,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/refund failed", error);
    return NextResponse.json({ error: "Failed to issue refund" }, { status: 500 });
  }
}
