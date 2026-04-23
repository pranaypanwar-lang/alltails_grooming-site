import { NextResponse } from "next/server";
import { createBookingAccessToken } from "../../../../../lib/auth/bookingAccess";
import {
  createBookingWithBusinessRules,
  type BookingCreatePetInput,
} from "../../../../../lib/booking/createBooking";
import {
  buildManualBookingWindowId,
  formatBookingWindowLabel,
  getIstTimeInputValue,
  localIstDateTimeToUtc,
} from "../../../../../lib/booking/window";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { adminPrisma, adminRazorpay, getPublicAppUrl, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { sendBookingDispatchAlert } from "../../../../../lib/telegram/dispatchAlerts";
import { prepareCustomerMessageForBooking } from "../../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../../lib/customerMessaging/provider";

export const runtime = "nodejs";

function getTodayInIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type AdminBookingSource =
  | "call"
  | "instagram_dm"
  | "whatsapp"
  | "manual_internal";

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      phone,
      city,
      serviceName,
      selectedDate,
      bookingWindowId,
      slotIds,
      customStartTime,
      customAmount,
      serviceAddress,
      serviceLandmark,
      servicePincode,
      serviceLocationUrl,
      pets,
      paymentMethod,
      couponCode,
      source,
      adminNote,
    }: {
      name?: string;
      phone?: string;
      city?: string;
      serviceName?: string;
      selectedDate?: string;
      bookingWindowId?: string;
      slotIds?: string[];
      customStartTime?: string;
      customAmount?: number;
      serviceAddress?: string;
      serviceLandmark?: string;
      servicePincode?: string;
      serviceLocationUrl?: string;
      pets?: BookingCreatePetInput[];
      paymentMethod?: "pay_now" | "pay_after_service";
      couponCode?: string;
      source?: AdminBookingSource;
      adminNote?: string;
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
      !paymentMethod ||
      !source
    ) {
      return NextResponse.json(
        { error: "Missing required booking fields" },
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

    let effectiveBookingWindowId = bookingWindowId;
    let effectiveSlotIds = slotIds;
    let bookingWindowLabel: string | null = null;

    if (customStartTime?.trim()) {
      const baseSlots = await adminPrisma.slot.findMany({
        where: { id: { in: slotIds } },
        include: { team: true },
        orderBy: { startTime: "asc" },
      });

      if (baseSlots.length !== slotIds.length) {
        return NextResponse.json({ error: "Selected booking window is no longer valid" }, { status: 409 });
      }

      const teamIds = [...new Set(baseSlots.map((slot) => slot.teamId))];
      if (teamIds.length !== 1) {
        return NextResponse.json({ error: "Selected booking window must belong to exactly one team" }, { status: 400 });
      }

      const firstBaseSlot = baseSlots[0];
      const lastBaseSlot = baseSlots[baseSlots.length - 1];
      const durationMs = lastBaseSlot.endTime.getTime() - firstBaseSlot.startTime.getTime();
      const customStartAt = localIstDateTimeToUtc(selectedDate, customStartTime.trim());
      const customEndAt = new Date(customStartAt.getTime() + durationMs);

      const overlappingSlots = await adminPrisma.slot.findMany({
        where: {
          teamId: teamIds[0],
          startTime: { lt: customEndAt },
          endTime: { gt: customStartAt },
        },
        orderBy: { startTime: "asc" },
      });

      if (!overlappingSlots.length) {
        return NextResponse.json(
          { error: "No overlapping operational slots exist for that custom start time" },
          { status: 400 }
        );
      }

      effectiveSlotIds = overlappingSlots.map((slot) => slot.id);
      effectiveBookingWindowId = buildManualBookingWindowId({
        teamId: teamIds[0],
        selectedDate,
        startTime: getIstTimeInputValue(customStartAt),
        endTime: getIstTimeInputValue(customEndAt),
      });
      bookingWindowLabel = formatBookingWindowLabel(customStartAt, customEndAt);
    }

    const result = await createBookingWithBusinessRules(adminPrisma, {
      name,
      phone,
      city,
      serviceName,
      selectedDate,
      bookingWindowId: effectiveBookingWindowId,
      slotIds: effectiveSlotIds,
      pets,
      paymentMethod,
      couponCode,
      adminNote: adminNote?.trim() || null,
      bookingSource: source,
      overrideFinalAmount:
        typeof customAmount === "number" && Number.isFinite(customAmount)
          ? customAmount
          : null,
      serviceAddress: serviceAddress?.trim() || null,
      serviceLandmark: serviceLandmark?.trim() || null,
      servicePincode: servicePincode?.trim() || null,
      serviceLocationUrl: serviceLocationUrl?.trim() || null,
    });

    if (!bookingWindowLabel) {
      const effectiveSlots = await adminPrisma.slot.findMany({
        where: { id: { in: effectiveSlotIds } },
        orderBy: { startTime: "asc" },
      });
      const firstSlot = effectiveSlots[0];
      const lastSlot = effectiveSlots[effectiveSlots.length - 1];
      bookingWindowLabel =
        firstSlot && lastSlot
          ? formatBookingWindowLabel(firstSlot.startTime, lastSlot.endTime)
          : "TBD";
    }

    let paymentOrder: { orderId: string; amount: number; currency: string } | null =
      null;

    if (result.booking.paymentMethod === "pay_now" && result.booking.finalAmount > 0) {
      if (!adminRazorpay) {
        return NextResponse.json(
          { error: "Razorpay is not configured." },
          { status: 500 }
        );
      }

      const order = await adminRazorpay.orders.create({
        amount: Math.round(result.booking.finalAmount * 100),
        currency: "INR",
        receipt: result.booking.id.slice(0, 40),
        notes: {
          bookingId: result.booking.id,
          source: "admin_manual_booking",
        },
      });

      await adminPrisma.booking.update({
        where: { id: result.booking.id },
        data: { razorpayOrderId: order.id },
      });

      paymentOrder = {
        orderId: order.id,
        amount: Number(order.amount),
        currency: String(order.currency),
      };
    }

    const accessToken = createBookingAccessToken(result.booking.id, result.user.phone);

    if (result.booking.status === "confirmed") {
      await prepareCustomerMessageForBooking(adminPrisma, result.booking.id, "booking_confirmation", {
        skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
        deliveryStatus: "queued",
      });
      await processQueuedCustomerMessages(adminPrisma, { limit: 10 });
    }

    if (selectedDate === getTodayInIst()) {
      try {
        const dispatchResult = await sendBookingDispatchAlert({
          prisma: adminPrisma,
          bookingId: result.booking.id,
          alertType: "same_day_new_booking",
          baseUrl: getPublicAppUrl(request),
        });

        await logAdminBookingEvent({
          bookingId: result.booking.id,
          type: "dispatch_alert_sent",
          summary: dispatchResult.success
            ? `Dispatch alert sent to ${dispatchResult.team.name}`
            : `Dispatch alert failed for ${dispatchResult.team.name}`,
          metadata: {
            teamId: dispatchResult.team.id,
            alertType: "same_day_new_booking",
            success: dispatchResult.success,
            errorMsg: dispatchResult.errorMsg ?? null,
            source: "admin_booking_create",
          },
        });
      } catch (dispatchError) {
        console.error("POST /api/admin/bookings/create dispatch alert failed", dispatchError);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: result.booking.id,
      accessToken,
      selectedDate,
      bookingWindowId: effectiveBookingWindowId,
      bookingWindowLabel: bookingWindowLabel ?? "TBD",
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

    console.error("POST /api/admin/bookings/create failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}
