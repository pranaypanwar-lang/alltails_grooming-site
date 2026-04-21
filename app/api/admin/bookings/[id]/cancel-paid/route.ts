import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma, logAdminBookingEvent } from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

// Refund modes:
// manual_refund   — refund processed outside the system (bank transfer, UPI, etc.)
// razorpay_refund — refund to be raised on Razorpay dashboard
// waived          — no refund, booking cancelled without refund (e.g. policy violation)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));

    const refundMode: string = body.refundMode ?? "";
    const reason: string = body.reason ?? "";
    const refundNotes: string = body.refundNotes ?? "";

    if (!["manual_refund", "razorpay_refund", "waived"].includes(refundMode)) {
      return NextResponse.json(
        { error: "refundMode must be manual_refund | razorpay_refund | waived" },
        { status: 400 }
      );
    }
    if (!reason.trim()) {
      return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: { slots: true, user: true },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "cancelled") return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    if (booking.status === "completed") return NextResponse.json({ error: "Completed bookings cannot be cancelled" }, { status: 400 });
    if (booking.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Use the regular cancel endpoint for unpaid bookings" },
        { status: 400 }
      );
    }

    const shouldRestoreReward = booking.loyaltyRewardApplied && !booking.loyaltyRewardRestored;

    await adminPrisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "cancelled",
          dispatchState: "issue",
          loyaltyRewardRestored: shouldRestoreReward ? true : booking.loyaltyRewardRestored,
        },
      });

      for (const bs of booking.slots) {
        await tx.bookingSlot.update({ where: { id: bs.id }, data: { status: "released" } });
        await tx.slot.update({
          where: { id: bs.slotId },
          data: { isBooked: false, isHeld: false, holdExpiresAt: null },
        });
      }

      if (shouldRestoreReward) {
        await tx.user.update({
          where: { id: booking.userId },
          data: { loyaltyFreeUnlocked: true, loyaltyLastRedeemedAt: null },
        });
      }
    });

    const refundLabel =
      refundMode === "manual_refund"
        ? "Manual refund"
        : refundMode === "razorpay_refund"
        ? "Razorpay refund"
        : "Waived (no refund)";

    await logAdminBookingEvent({
      bookingId,
      type: "paid_booking_cancelled",
      summary: `Paid booking cancelled — ${refundLabel}`,
      metadata: {
        refundMode,
        reason,
        refundNotes: refundNotes || null,
        originalAmount: booking.originalAmount,
        finalAmount: booking.finalAmount,
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId: booking.razorpayPaymentId,
        loyaltyRewardRestored: shouldRestoreReward,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      status: "cancelled",
      refundMode,
      loyaltyRewardRestored: shouldRestoreReward,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/cancel-paid failed", error);
    return NextResponse.json({ error: "Failed to cancel paid booking" }, { status: 500 });
  }
}
