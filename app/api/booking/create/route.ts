import { NextResponse } from "next/server";
import "dotenv/config";
import Razorpay from "razorpay";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { canIssueBookingAccessTokens, createBookingAccessToken } from "../../../../lib/auth/bookingAccess";
import {
  createBookingWithBusinessRules,
  type BookingCreatePetInput,
} from "../../../../lib/booking/createBooking";
import { SLOT_BLOCK_DEPOSIT_AMOUNT } from "../../../../lib/booking/constants";
import { getAddressReadinessSummary } from "../../../../lib/booking/addressCapture";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../lib/customerMessaging/provider";
import { sendNewBookingAdminAlert } from "../../../../lib/telegram/newBookingAlerts";
import { sendMetaConversionsEvent } from "../../../../lib/analytics/metaConversionsApi";

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

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

const BOOKING_ADD_ONS = [
  { id: "anti_tick_bath", name: "Anti-Tick Bath", price: 399 },
  { id: "tick_collar", name: "Tick Collar", price: 699 },
  { id: "gland_cleaning", name: "Gland Cleaning", price: 299 },
] as const;

type BookingAddOnInput = {
  id?: string;
  name?: string;
  price?: number;
};

function resolveSelectedAddOns(addOns: BookingAddOnInput[] | undefined) {
  if (!Array.isArray(addOns)) return [];

  const selectedIds = new Set(addOns.map((addOn) => addOn.id).filter(Boolean));
  return BOOKING_ADD_ONS.filter((addOn) => selectedIds.has(addOn.id));
}

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
      addOns,
      serviceAddress,
      serviceLandmark,
      servicePincode,
      serviceLocationUrl,
      serviceLat,
      serviceLng,
      serviceLocationSource,
      finalAmount,
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
      addOns?: BookingAddOnInput[];
      serviceAddress?: string;
      serviceLandmark?: string;
      servicePincode?: string;
      serviceLocationUrl?: string;
      serviceLat?: number | null;
      serviceLng?: number | null;
      serviceLocationSource?: string;
      finalAmount?: number;
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

    if (!canIssueBookingAccessTokens()) {
      return NextResponse.json(
        { error: "Booking access token configuration is missing." },
        { status: 500 }
      );
    }

    const invalidPet = pets.some((pet) => !pet.breed?.trim());
    if (invalidPet) {
      return NextResponse.json(
        { error: "Each pet must have a breed" },
        { status: 400 }
      );
    }

    const selectedAddOns = resolveSelectedAddOns(addOns);
    const addOnsTotal = selectedAddOns.reduce((total, addOn) => total + addOn.price, 0);
    const service = await prisma.service.findFirst({
      where: { name: serviceName.trim() },
      select: { price: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Selected service not found" },
        { status: 404 }
      );
    }

    const requestedFinalAmount =
      typeof finalAmount === "number" && Number.isFinite(finalAmount)
        ? Math.max(0, Math.round(finalAmount))
        : null;
    const recomputedAmount = service.price * pets.length + addOnsTotal;
    const overrideFinalAmount =
      requestedFinalAmount !== null && requestedFinalAmount <= recomputedAmount
        ? requestedFinalAmount
        : addOnsTotal > 0
          ? recomputedAmount
          : null;
    const addOnAdminNote = selectedAddOns.length
      ? `Selected add-ons: ${selectedAddOns.map((addOn) => `${addOn.name} (${addOn.price})`).join(", ")}`
      : null;

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
      overrideFinalAmount,
      adminNote: addOnAdminNote,
      serviceAddress: serviceAddress?.trim() || null,
      serviceLandmark: serviceLandmark?.trim() || null,
      servicePincode: servicePincode?.trim() || null,
      serviceLocationUrl: serviceLocationUrl?.trim() || null,
      serviceLat: typeof serviceLat === "number" ? serviceLat : null,
      serviceLng: typeof serviceLng === "number" ? serviceLng : null,
      serviceLocationSource: serviceLocationSource?.trim() || null,
      bookingSource: "website",
    });

    const hasSubmittedAddress =
      !!serviceAddress?.trim() ||
      !!serviceLandmark?.trim() ||
      !!servicePincode?.trim() ||
      !!serviceLocationUrl?.trim() ||
      (typeof serviceLat === "number" && typeof serviceLng === "number");

    const latestSavedAddress = hasSubmittedAddress ? null : await prisma.booking.findFirst({
      where: {
        userId: result.user.id,
        id: { not: result.booking.id },
        serviceAddress: { not: null },
        serviceLandmark: { not: null },
        OR: [
          { servicePincode: { not: null } },
          {
            AND: [
              { serviceLat: { not: null } },
              { serviceLng: { not: null } },
            ],
          },
        ],
      },
      orderBy: [{ addressUpdatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        serviceAddress: true,
        serviceLandmark: true,
        servicePincode: true,
        serviceLocationUrl: true,
        serviceLat: true,
        serviceLng: true,
        serviceLocationSource: true,
        addressUpdatedAt: true,
      },
    });

    let bookingWithAddress = result.booking;

    if (
      latestSavedAddress?.serviceAddress?.trim() &&
      latestSavedAddress.serviceLandmark?.trim() &&
      (latestSavedAddress.servicePincode?.trim() ||
        (typeof latestSavedAddress.serviceLat === "number" && typeof latestSavedAddress.serviceLng === "number"))
    ) {
      bookingWithAddress = await prisma.booking.update({
        where: { id: result.booking.id },
        data: {
          serviceAddress: latestSavedAddress.serviceAddress.trim(),
          serviceLandmark: latestSavedAddress.serviceLandmark.trim(),
          servicePincode: latestSavedAddress.servicePincode?.trim() || null,
          serviceLocationUrl: latestSavedAddress.serviceLocationUrl?.trim() || null,
          serviceLat: latestSavedAddress.serviceLat,
          serviceLng: latestSavedAddress.serviceLng,
          serviceLocationSource: latestSavedAddress.serviceLocationSource,
          addressUpdatedAt: latestSavedAddress.addressUpdatedAt ?? new Date(),
        },
      });
    }

    const addressInfo = getAddressReadinessSummary(bookingWithAddress);
    const accessToken = createBookingAccessToken(bookingWithAddress.id, result.user.phone);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Booking access token configuration is missing." },
        { status: 500 }
      );
    }

    const shouldSendImmediateConfirmation = bookingWithAddress.status === "confirmed";

    // Fire CAPI Lead + Qualified BEFORE the slower WhatsApp/Telegram side-effects so
    // a stalled message queue or admin alert doesn't delay or starve the CAPI call.
    // Browser pixel fires after the response — both share the same event_id for dedup.
    try {
      await sendMetaConversionsEvent({
        request,
        eventName: "Lead",
        bookingId: bookingWithAddress.id,
        phone: result.user.phone,
        externalId: result.user.id,
        name: result.user.name,
        city: result.user.city,
        serviceName: result.service.name,
        value: bookingWithAddress.finalAmount,
        currency: "INR",
        petCount: pets.length,
        selectedDate,
        paymentMethod: bookingWithAddress.paymentMethod,
      });
    } catch (error) {
      console.error("Meta Conversions API Lead event failed:", error);
    }

    try {
      await sendMetaConversionsEvent({
        request,
        eventName: "Qualified",
        qualifiedStage: "initiated",
        bookingId: bookingWithAddress.id,
        phone: result.user.phone,
        externalId: result.user.id,
        name: result.user.name,
        city: result.user.city,
        serviceName: result.service.name,
        value: bookingWithAddress.finalAmount,
        currency: "INR",
        petCount: pets.length,
        selectedDate,
        paymentMethod: bookingWithAddress.paymentMethod,
      });
    } catch (error) {
      console.error("Meta Conversions API Qualified event failed:", error);
    }

    if (shouldSendImmediateConfirmation) {
      try {
        await supersedeQueuedBookingLifecycleMessages(prisma, bookingWithAddress.id, {
          keepMessageTypes: ["booking_confirmation"],
        });
        const prepared = await prepareCustomerMessageForBooking(prisma, bookingWithAddress.id, "booking_confirmation", {
          skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
          deliveryStatus: "queued",
        });
        await processQueuedCustomerMessages(prisma, { limit: 10, messageIds: [prepared.message.id] });
      } catch (error) {
        console.error("Customer booking confirmation message failed:", error);
      }

      try {
        await sendNewBookingAdminAlert({
          prisma,
          bookingId: bookingWithAddress.id,
          sourceLabel: "website pay-after-service",
          baseUrl: getPublicAppUrl(request),
        });
      } catch (error) {
        console.error("Admin Telegram booking alert failed:", error);
      }
    }

    let paymentOrder: { orderId: string; amount: number; currency: string } | null = null;

    const needsPrepaidHold =
      (bookingWithAddress.paymentMethod === "pay_now" && bookingWithAddress.finalAmount > 0) ||
      bookingWithAddress.paymentMethod === "pay_after_service";

    if (needsPrepaidHold) {
      if (!razorpay) {
        return NextResponse.json(
          { error: "Razorpay is not configured." },
          { status: 500 }
        );
      }

      // Pay-after-service: collect a fixed slot-blocking deposit upfront.
      // Pay-now: collect the full booking amount.
      const orderAmountRupees =
        bookingWithAddress.paymentMethod === "pay_after_service"
          ? SLOT_BLOCK_DEPOSIT_AMOUNT
          : bookingWithAddress.finalAmount;

      const order = await razorpay.orders.create({
        amount: Math.round(orderAmountRupees * 100),
        currency: "INR",
        receipt: bookingWithAddress.id.slice(0, 40),
        notes: {
          bookingId: bookingWithAddress.id,
          paymentIntent:
            bookingWithAddress.paymentMethod === "pay_after_service"
              ? "slot_block_deposit"
              : "full_payment",
        },
      });

      await prisma.booking.update({
        where: { id: bookingWithAddress.id },
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

    return NextResponse.json({
      success: true,
      bookingId: bookingWithAddress.id,
      accessToken,
      selectedDate,
      bookingWindowId,
      paymentMethod,
      paymentStatus: bookingWithAddress.paymentStatus,
      status: bookingWithAddress.status,
      originalAmount: result.service.price * pets.length + addOnsTotal,
      finalAmount: bookingWithAddress.finalAmount,
      addOns: selectedAddOns,
      couponCode: result.normalizedCouponCode,
      paymentOrder,
      paymentExpiresAt: bookingWithAddress.paymentExpiresAt,
      serviceAddress: bookingWithAddress.serviceAddress ?? "",
      serviceLandmark: bookingWithAddress.serviceLandmark ?? "",
      servicePincode: bookingWithAddress.servicePincode ?? "",
      serviceLocationUrl: bookingWithAddress.serviceLocationUrl ?? "",
      serviceLat: bookingWithAddress.serviceLat,
      serviceLng: bookingWithAddress.serviceLng,
      serviceLocationSource: bookingWithAddress.serviceLocationSource,
      addressStatus: addressInfo.status,
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
