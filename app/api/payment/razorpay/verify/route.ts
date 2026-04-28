import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertBookingAccessToken, bookingAccessMatchesPhone } from "../../../booking/_lib/assertBookingAccess";
import {
  hasValidRazorpaySignature,
  validateBookingPaymentVerification,
} from "../../../../../lib/payment/razorpayVerification";
import { getAddressReadinessSummary } from "../../../../../lib/booking/addressCapture";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../../lib/customerMessaging/provider";
import { sendNewBookingAdminAlert } from "../../../../../lib/telegram/newBookingAlerts";
import { sendMetaConversionsEvent } from "../../../../../lib/analytics/metaConversionsApi";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function getPublicAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}

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
        include: { slots: true, user: true, service: true },
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
        include: {
          user: true,
          service: true,
          _count: { select: { pets: true } },
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

    await supersedeQueuedBookingLifecycleMessages(prisma, updatedBooking.id, {
      keepMessageTypes: ["booking_confirmation"],
    });
    const prepared = await prepareCustomerMessageForBooking(prisma, updatedBooking.id, "booking_confirmation", {
      skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
      deliveryStatus: "queued",
    });
    await processQueuedCustomerMessages(prisma, { limit: 10, messageIds: [prepared.message.id] });

    try {
      await sendNewBookingAdminAlert({
        prisma,
        bookingId: updatedBooking.id,
        sourceLabel: "website prepaid",
        baseUrl: getPublicAppUrl(request),
      });
    } catch (error) {
      console.error("Admin Telegram prepaid booking alert failed:", error);
    }

    try {
      await sendMetaConversionsEvent({
        request,
        eventName: "Purchase",
        bookingId: updatedBooking.id,
        phone: updatedBooking.user.phone,
        externalId: updatedBooking.user.id,
        name: updatedBooking.user.name,
        city: updatedBooking.user.city,
        serviceName: updatedBooking.service.name,
        value: updatedBooking.finalAmount,
        currency: "INR",
        petCount: updatedBooking._count.pets,
        selectedDate: updatedBooking.selectedDate ?? null,
        paymentMethod: updatedBooking.paymentMethod,
      });
    } catch (error) {
      console.error("Meta Conversions API Purchase event failed:", error);
    }

    const addressInfo = getAddressReadinessSummary(updatedBooking);

    return NextResponse.json({
      success: true,
      bookingId: updatedBooking.id,
      paymentStatus: updatedBooking.paymentStatus,
      status: updatedBooking.status,
      finalAmount: updatedBooking.finalAmount,
      originalAmount: updatedBooking.originalAmount,
      serviceAddress: updatedBooking.serviceAddress ?? "",
      serviceLandmark: updatedBooking.serviceLandmark ?? "",
      servicePincode: updatedBooking.servicePincode ?? "",
      serviceLocationUrl: updatedBooking.serviceLocationUrl ?? "",
      addressStatus: addressInfo.status,
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
