import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { createBookingAccessToken } from "../../../../../../lib/auth/bookingAccess";
import {
  adminPrisma,
  adminRazorpay,
  getPublicAppUrl,
  logAdminBookingEvent,
} from "../../../_lib/bookingAdmin";
import { prepareCustomerMessageForBooking } from "../../../../../../lib/customerMessaging/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;

    if (!adminRazorpay) {
      return NextResponse.json({ error: "Razorpay is not configured" }, { status: 500 });
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.paymentMethod !== "pay_now") {
      return NextResponse.json({ error: "Booking is not prepaid" }, { status: 400 });
    }
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "Booking is already paid" }, { status: 400 });
    }
    if (booking.finalAmount <= 0) {
      return NextResponse.json({ error: "Zero-amount booking does not need payment retry" }, { status: 400 });
    }
    if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "payment_expired") {
      return NextResponse.json({ error: "Booking can no longer be paid" }, { status: 400 });
    }

    const order = await adminRazorpay.orders.create({
      amount: Math.round(booking.finalAmount * 100),
      currency: "INR",
      receipt: booking.id.slice(0, 40),
      notes: { bookingId: booking.id, source: "admin_support" },
    });

    await adminPrisma.booking.update({
      where: { id: booking.id },
      data: {
        razorpayOrderId: order.id,
        paymentPendingReason: "admin_support_retry",
      },
    });

    const accessToken = createBookingAccessToken(booking.id, booking.user.phone);
    const paymentLinkUrl = accessToken
      ? `${getPublicAppUrl(request)}/pay/${booking.id}?token=${encodeURIComponent(accessToken)}`
      : undefined;

    await logAdminBookingEvent({
      bookingId: booking.id,
      type: "payment_link_generated",
      summary: "Support retry order created",
      metadata: {
        orderId: order.id,
        amount: Number(order.amount),
      },
    });

    await prepareCustomerMessageForBooking(
      adminPrisma,
      booking.id,
      "payment_retry_reminder",
      {
        deliveryStatus: "queued",
        skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
        customText: paymentLinkUrl
          ? `Complete payment here: ${paymentLinkUrl}`
          : null,
        actionUrl: paymentLinkUrl ?? null,
      }
    );

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
      paymentLinkUrl,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/retry-payment-support failed", error);
    return NextResponse.json({ error: "Failed to create support retry order" }, { status: 500 });
  }
}
