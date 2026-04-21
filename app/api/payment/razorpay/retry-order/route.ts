import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../../../booking/_lib/assertBookingAccess";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export async function POST(request: Request) {
  try {
    const { bookingId, accessToken } = await request.json();

    if (!bookingId?.trim()) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) {
      return access;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { slots: true, user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    if (booking.paymentMethod !== "pay_now") {
      return NextResponse.json({ error: "Booking is not prepaid" }, { status: 400 });
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json({ error: "Booking is already paid" }, { status: 400 });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return NextResponse.json({ error: "Booking can no longer be paid" }, { status: 400 });
    }

    if (booking.finalAmount <= 0) {
      return NextResponse.json({ error: "Zero-amount booking cannot retry payment" }, { status: 400 });
    }

    // If hold expired, release slots and close the booking
    if (!booking.paymentExpiresAt || booking.paymentExpiresAt < new Date()) {
      await prisma.$transaction(async (tx) => {
        for (const bookingSlot of booking.slots) {
          await tx.bookingSlot.update({
            where: { id: bookingSlot.id },
            data: { status: "released" },
          });
          await tx.slot.update({
            where: { id: bookingSlot.slotId },
            data: { isHeld: false, holdExpiresAt: null },
          });
        }
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "payment_expired",
            paymentExpiredAt: new Date(),
            paymentPendingReason: "hold_expired",
          },
        });
      });
      return NextResponse.json(
        { error: "Payment window expired. Please book again." },
        { status: 409 }
      );
    }

    if (!razorpay) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(booking.finalAmount * 100),
      currency: "INR",
      receipt: booking.id.slice(0, 40),
      notes: { bookingId: booking.id },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
      paymentExpiresAt: booking.paymentExpiresAt,
    });
  } catch (error) {
    console.error("Retry order error:", error);
    return NextResponse.json({ error: "Failed to create retry payment order" }, { status: 500 });
  }
}
