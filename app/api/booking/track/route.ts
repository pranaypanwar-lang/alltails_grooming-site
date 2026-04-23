import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { createBookingAccessToken } from "../../../../lib/auth/bookingAccess";
import { getBookingWindowDisplay } from "../../../../lib/booking/window";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

type DerivedBookingStatus =
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "payment_expired";

type DerivedPaymentStatus =
  | "unpaid"
  | "paid"
  | "pending_cash_collection"
  | "covered_by_loyalty"
  | "expired";

function getDerivedStatus(
  booking: {
    status: string;
    paymentMethod: string | null;
    paymentStatus: string;
    paymentExpiresAt?: Date | null;
  },
  now: Date
): DerivedBookingStatus {
  if (
    booking.paymentMethod === "pay_now" &&
    booking.paymentStatus !== "paid" &&
    booking.paymentExpiresAt &&
    booking.paymentExpiresAt <= now
  ) {
    return "payment_expired";
  }
  if (booking.status === "confirmed") return "confirmed";
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "payment_expired") return "payment_expired";
  return "pending_payment";
}

function getStatusLabel(status: DerivedBookingStatus) {
  switch (status) {
    case "pending_payment": return "Pending payment";
    case "confirmed": return "Confirmed";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    case "payment_expired": return "Payment expired";
  }
}

function getStatusCategory(status: DerivedBookingStatus): "upcoming" | "past" {
  return status === "confirmed" || status === "pending_payment" ? "upcoming" : "past";
}

function getSupportingText(status: DerivedBookingStatus, paymentMethod: string | null) {
  if (status === "pending_payment") return "Complete payment to lock your booking.";
  if (status === "confirmed" && paymentMethod === "pay_after_service")
    return "Your session is scheduled. Payment will be collected after the visit.";
  if (status === "confirmed") return "Your session is scheduled.";
  if (status === "completed") return "This grooming session was completed.";
  if (status === "cancelled") return "This booking was cancelled.";
  return "This payment window expired. Book again to reserve a new slot.";
}

function getDerivedPaymentStatus(
  paymentStatus: string,
  derivedStatus: DerivedBookingStatus
): DerivedPaymentStatus {
  if (derivedStatus === "payment_expired") return "expired";
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "pending_cash_collection") return "pending_cash_collection";
  if (paymentStatus === "covered_by_loyalty") return "covered_by_loyalty";
  return "unpaid";
}

function getPaymentStatusLabel(paymentStatus: DerivedPaymentStatus) {
  switch (paymentStatus) {
    case "unpaid": return "Pending payment";
    case "paid": return "Paid";
    case "pending_cash_collection": return "Pay after service";
    case "covered_by_loyalty": return "Covered by loyalty";
    case "expired": return "Expired";
  }
}

function getPaymentMethodLabel(paymentMethod: string | null) {
  if (paymentMethod === "pay_now") return "Pay now";
  if (paymentMethod === "pay_after_service") return "Pay after service";
  return null;
}

function getBookingActions(params: {
  status: DerivedBookingStatus;
  paymentHoldActive: boolean;
  finalAmount: number;
}) {
  const { status, paymentHoldActive, finalAmount } = params;
  if (status === "pending_payment") {
    return {
      canCancel: true,
      canReschedule: false,
      canCompletePayment: paymentHoldActive && finalAmount > 0,
      canRebook: false,
      retryPaymentAllowed: paymentHoldActive && finalAmount > 0,
    };
  }
  if (status === "payment_expired") {
    return { canCancel: false, canReschedule: false, canCompletePayment: false, canRebook: true, retryPaymentAllowed: false };
  }
  if (status === "confirmed") {
    return { canCancel: true, canReschedule: true, canCompletePayment: false, canRebook: false, retryPaymentAllowed: false };
  }
  // completed or cancelled
  return { canCancel: false, canReschedule: false, canCompletePayment: false, canRebook: true, retryPaymentAllowed: false };
}

function buildTimeline(params: {
  createdAt: Date;
  paymentFailedAt?: Date | null;
  paymentExpiredAt?: Date | null;
  status: DerivedBookingStatus;
  paymentStatus: DerivedPaymentStatus;
}) {
  const { createdAt, paymentFailedAt, paymentExpiredAt, status, paymentStatus } = params;

  const timeline: Array<{
    type: "booking_created" | "payment_pending" | "payment_completed" | "booking_confirmed" | "booking_rescheduled" | "booking_cancelled" | "booking_completed" | "payment_expired";
    label: string;
    at: string | null;
  }> = [{ type: "booking_created", label: "Booking created", at: createdAt.toISOString() }];

  if (paymentStatus === "unpaid") {
    timeline.push({ type: "payment_pending", label: "Payment pending", at: paymentFailedAt?.toISOString() ?? null });
  }
  if (paymentStatus === "paid") {
    timeline.push({ type: "payment_completed", label: "Payment completed", at: null });
  }
  if (paymentStatus === "covered_by_loyalty") {
    timeline.push({ type: "payment_completed", label: "Covered by loyalty reward", at: null });
  }
  if (status === "confirmed") {
    timeline.push({ type: "booking_confirmed", label: "Booking confirmed", at: null });
  }
  if (status === "cancelled") {
    timeline.push({ type: "booking_cancelled", label: "Booking cancelled", at: null });
  }
  if (status === "completed") {
    timeline.push({ type: "booking_completed", label: "Booking completed", at: null });
  }
  if (status === "payment_expired") {
    timeline.push({ type: "payment_expired", label: "Payment expired", at: paymentExpiredAt?.toISOString() ?? null });
  }

  return timeline;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, bookingId }: { phone?: string; bookingId?: string } = body;

    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: {
        user: { phone: { endsWith: normalizedPhone } },
        ...(bookingId?.trim() ? { id: bookingId.trim() } : {}),
      },
      include: {
        user: true,
        service: true,
        pets: { include: { pet: true, assets: true } },
        slots: { include: { slot: { include: { team: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const responseBookings = bookings.map((booking) => {
      const sortedSlots = booking.slots
        .map((bs) => bs.slot)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      const firstSlot = sortedSlots[0] ?? null;

      const derivedStatus = getDerivedStatus(booking, now);
      const derivedPaymentStatus = getDerivedPaymentStatus(booking.paymentStatus, derivedStatus);

      const paymentHoldActive =
        booking.paymentMethod === "pay_now" &&
        booking.paymentStatus !== "paid" &&
        !!booking.paymentExpiresAt &&
        booking.paymentExpiresAt > now;

      const paymentExpired =
        booking.paymentMethod === "pay_now" &&
        booking.paymentStatus !== "paid" &&
        !!booking.paymentExpiresAt &&
        booking.paymentExpiresAt <= now;

      const actions = getBookingActions({
        status: derivedStatus,
        paymentHoldActive,
        finalAmount: booking.finalAmount,
      });

      const loyaltyCompletedBefore = booking.loyaltyCompletedCountBefore ?? 0;

      const bookingWindowDisplay = getBookingWindowDisplay({
        bookingWindowId: booking.bookingWindowId,
        selectedDate: booking.selectedDate,
        slots: sortedSlots,
      });

      const timeline = buildTimeline({
        createdAt: booking.createdAt,
        paymentFailedAt: booking.paymentFailedAt,
        paymentExpiredAt: booking.paymentExpiredAt,
        status: derivedStatus,
        paymentStatus: derivedPaymentStatus,
      });

      return {
        id: booking.id,
        accessToken: createBookingAccessToken(booking.id, booking.user.phone),

        status: derivedStatus,
        statusLabel: getStatusLabel(derivedStatus),
        statusCategory: getStatusCategory(derivedStatus),
        supportingText: getSupportingText(derivedStatus, booking.paymentMethod),

        paymentStatus: derivedPaymentStatus,
        paymentStatusLabel: getPaymentStatusLabel(derivedPaymentStatus),
        paymentMethod: booking.paymentMethod as "pay_now" | "pay_after_service" | null,
        paymentMethodLabel: getPaymentMethodLabel(booking.paymentMethod),

        originalAmount: booking.originalAmount,
        finalAmount: booking.finalAmount,
        currency: "INR" as const,
        discountAmount: Math.max(0, booking.originalAmount - booking.finalAmount),
        couponCode: booking.couponCode ?? null,

        service: { id: booking.service.id, name: booking.service.name },
        user: { city: booking.user.city },

        selectedDate: booking.selectedDate ?? null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: null,

        bookingWindow:
          bookingWindowDisplay
            ? {
                bookingWindowId: booking.bookingWindowId ?? null,
                startTime: bookingWindowDisplay.startTime,
                endTime: bookingWindowDisplay.endTime,
                displayLabel: bookingWindowDisplay.displayLabel,
                teamName: firstSlot?.team.name ?? null,
              }
            : null,

        pets: booking.pets.map((bp) => ({
          id: bp.pet.id,
          name: bp.pet.name,
          breed: bp.pet.breed,
          groomingNotes: bp.groomingNotes ?? null,
          stylingNotes: bp.stylingNotes ?? null,
          concernImageUrls: bp.assets
            .filter((a) => a.kind === "concern_photo")
            .map((a) => a.publicUrl),
          stylingImageUrls: bp.assets
            .filter((a) => a.kind === "styling_reference")
            .map((a) => a.publicUrl),
        })),

        loyalty: {
          eligible: !!booking.loyaltyEligible,
          rewardApplied: !!booking.loyaltyRewardApplied,
          rewardLabel: booking.loyaltyRewardLabel ?? null,
          sessionsInCurrentCycle: loyaltyCompletedBefore % 5,
          remainingToFree: Math.max(0, 4 - (loyaltyCompletedBefore % 5)),
        },

        actions,

        paymentWindow: {
          holdActive: paymentHoldActive,
          expired: paymentExpired,
          expiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
        },

        timeline,
      };
    });

    return NextResponse.json({ phone: normalizedPhone, bookings: responseBookings });
  } catch (error) {
    console.error("Track booking API error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
