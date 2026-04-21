import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../../../booking/_lib/assertBookingAccess";
import {
  hasValidRazorpaySignature,
  validateBookingPaymentVerification,
} from "../../../../../lib/payment/razorpayVerification";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret) {
      return NextResponse.json(
        { error: "Razorpay secret key is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      bookingId,
      accessToken,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }: {
      bookingId?: string;
      accessToken?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    } = body;

    if (
      !bookingId ||
      !accessToken ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return NextResponse.json(
        { error: "Missing Razorpay verification fields" },
        { status: 400 }
      );
    }

    const access = assertBookingAccessToken(bookingId, accessToken);
    if (access instanceof NextResponse) {
      return access;
    }

    if (
      !hasValidRazorpaySignature({
        secret: razorpaySecret,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      })
    ) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { slots: true, user: true },
      });

      if (!booking) {
        throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
      }

      const validation = validateBookingPaymentVerification({
        bookingPhone: booking.user.phone,
        accessPhone: access.phone,
        bookingOrderId: booking.razorpayOrderId,
        orderId: razorpay_order_id,
        paymentExpiresAt: booking.paymentExpiresAt,
        bookingAccessMatchesPhone,
      });
      if (!validation.ok) {
        throw Object.assign(new Error(validation.error), {
          httpStatus: validation.status,
        });
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: "paid",
          status: "confirmed",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          paymentPendingReason: null,
          paymentGatewayError: null,
          paymentFailedAt: null,
        },
      });

      for (const bookingSlot of booking.slots) {
        await tx.bookingSlot.update({
          where: { id: bookingSlot.id },
          data: { status: "confirmed" },
        });

        await tx.slot.update({
          where: { id: bookingSlot.slotId },
          data: { isBooked: true, isHeld: false, holdExpiresAt: null },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      bookingId: updatedBooking.id,
      paymentStatus: updatedBooking.paymentStatus,
      status: updatedBooking.status,
      finalAmount: updatedBooking.finalAmount,
      originalAmount: updatedBooking.originalAmount,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    console.error("Razorpay verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment" },
      { status: 500 }
    );
  }
}
