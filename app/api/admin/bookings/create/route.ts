import { NextResponse } from "next/server";
import { createBookingAccessToken } from "../../../../../lib/auth/bookingAccess";
import {
  createBookingWithBusinessRules,
  type BookingCreatePetInput,
} from "../../../../../lib/booking/createBooking";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { adminPrisma, adminRazorpay, getPublicAppUrl, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import { sendBookingDispatchAlert } from "../../../../../lib/telegram/dispatchAlerts";

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

    const result = await createBookingWithBusinessRules(adminPrisma, {
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
      adminNote: adminNote?.trim() || null,
      bookingSource: source,
    });

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

    console.error("POST /api/admin/bookings/create failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create booking" },
      { status: 500 }
    );
  }
}
