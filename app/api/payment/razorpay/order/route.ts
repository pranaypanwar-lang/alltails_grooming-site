import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../../../booking/_lib/assertBookingAccess";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const razorpay =
  keyId && keySecret
    ? new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      })
    : null;

export async function POST(request: Request) {
  try {
    if (!keyId || !keySecret || !razorpay) {
      return NextResponse.json(
        { error: "Razorpay keys are missing in environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { bookingId, accessToken }: { bookingId?: string; accessToken?: string } = body;

    if (!bookingId?.trim()) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) {
      return access;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!bookingAccessMatchesPhone(booking.user.phone, access.phone)) {
      return NextResponse.json({ error: "Booking access does not match this booking" }, { status: 403 });
    }

    if (booking.paymentMethod !== "pay_now") {
      return NextResponse.json(
        { error: "Booking is not eligible for prepaid checkout" },
        { status: 400 }
      );
    }

    if (booking.finalAmount <= 0) {
      return NextResponse.json(
        { error: "Zero-amount booking must not create a Razorpay order" },
        { status: 400 }
      );
    }

    if (booking.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Booking is already paid" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(booking.finalAmount * 100),
      currency: "INR",
      receipt: booking.id.slice(0, 40),
      notes: {
        bookingId: booking.id,
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        razorpayOrderId: order.id,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}
