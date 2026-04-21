import { NextResponse } from "next/server";
import { createBookingAccessToken } from "../../../../../../lib/auth/bookingAccess";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import {
  adminPrisma,
  getPublicAppUrl,
  logAdminBookingEvent,
} from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: bookingId } = await params;
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

    const accessToken = createBookingAccessToken(booking.id, booking.user.phone);
    if (!accessToken) {
      return NextResponse.json({ error: "Booking access token configuration is missing." }, { status: 500 });
    }

    const paymentLinkUrl = `${getPublicAppUrl(request)}/pay/${booking.id}?token=${encodeURIComponent(accessToken)}`;

    await logAdminBookingEvent({
      bookingId,
      type: "payment_link_generated",
      summary: "Operator generated payment link",
      metadata: {
        paymentExpiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId,
      paymentLinkUrl,
      accessToken,
      expiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("POST /api/admin/bookings/:id/payment-link failed", error);
    return NextResponse.json({ error: "Failed to generate payment link" }, { status: 500 });
  }
}
