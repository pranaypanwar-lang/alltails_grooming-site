import { NextResponse } from "next/server";
import "dotenv/config";
import Razorpay from "razorpay";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { createBookingAccessToken } from "../../../../lib/auth/bookingAccess";
import {
  createBookingWithBusinessRules,
  type BookingCreatePetInput,
} from "../../../../lib/booking/createBooking";
import { prepareCustomerMessageForBooking } from "../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

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
    const body = await request.json();

    const {
      name,
      phone,
      city,
      serviceName,
      selectedDate,
      bookingWindowId,
      slotIds,
      pets,
      paymentMethod,
      couponCode,
    }: {
      name?: string;
      phone?: string;
      city?: string;
      serviceName?: string;
      selectedDate?: string;
      bookingWindowId?: string;
      slotIds?: string[];
      pets?: BookingCreatePetInput[];
      paymentMethod?: "pay_now" | "pay_after_service";
      couponCode?: string;
    } = body;

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !city?.trim() ||
      !serviceName?.trim() ||
      !selectedDate?.trim() ||
      !bookingWindowId?.trim() ||
      !slotIds?.length ||
      !pets?.length ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    if (!["pay_now", "pay_after_service"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const invalidPet = pets.some((pet) => !pet.breed?.trim());
    if (invalidPet) {
      return NextResponse.json(
        { error: "Each pet must have a breed" },
        { status: 400 }
      );
    }

    const result = await createBookingWithBusinessRules(prisma, {
      name,
      phone,
      city,
      serviceName,
      selectedDate,
      bookingWindowId,
      slotIds,
      pets,
      paymentMethod,
      couponCode,
      bookingSource: "website",
    });

    const shouldSendImmediateConfirmation = result.booking.status === "confirmed";

    if (shouldSendImmediateConfirmation) {
      await prepareCustomerMessageForBooking(prisma, result.booking.id, "booking_confirmation", {
        skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
        deliveryStatus: "queued",
      });
      await processQueuedCustomerMessages(prisma, { limit: 10 });
    }

    let paymentOrder: { orderId: string; amount: number; currency: string } | null = null;

    if (
      result.booking.paymentMethod === "pay_now" &&
      result.booking.finalAmount > 0
    ) {
      if (!razorpay) {
        return NextResponse.json(
          { error: "Razorpay is not configured." },
          { status: 500 }
        );
      }

      const order = await razorpay.orders.create({
        amount: Math.round(result.booking.finalAmount * 100),
        currency: "INR",
        receipt: result.booking.id.slice(0, 40),
        notes: {
          bookingId: result.booking.id,
        },
      });

      await prisma.booking.update({
        where: { id: result.booking.id },
        data: {
          razorpayOrderId: order.id,
        },
      });

      paymentOrder = {
  orderId: order.id,
  amount: Number(order.amount),
  currency: String(order.currency),
};
    }

    const accessToken = createBookingAccessToken(result.booking.id, result.user.phone);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Booking access token configuration is missing." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId: result.booking.id,
      accessToken,
      selectedDate,
      bookingWindowId,
      paymentMethod,
      paymentStatus: result.booking.paymentStatus,
      status: result.booking.status,
      originalAmount: result.service.price,
      finalAmount: result.booking.finalAmount,
      couponCode: result.normalizedCouponCode,
      paymentOrder,
      paymentExpiresAt: result.booking.paymentExpiresAt,
      loyalty: result.loyalty,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }

    console.error("Booking create API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create booking",
      },
      { status: 500 }
    );
  }
}
