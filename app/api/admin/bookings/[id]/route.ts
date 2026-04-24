import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { ensureBookingSopSteps } from "../../_lib/bookingAdmin";
import { BOOKING_SOP_STEPS } from "../../../../../lib/booking/sop";
import { getAddressReadinessSummary } from "../../../../../lib/booking/addressCapture";
import { getGamificationSnapshot } from "../../../../../lib/groomerRewards";
import { getLatestQaReview } from "../../../../../lib/booking/qaReview";
import { getBookingWindowDisplay } from "../../../../../lib/booking/window";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
};

type DerivedBookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "payment_expired";
type DerivedPaymentStatus = "unpaid" | "paid" | "pending_cash_collection" | "covered_by_loyalty" | "expired";

function getDerivedStatus(booking: { status: string; paymentMethod: string | null; paymentStatus: string; paymentExpiresAt?: Date | null }, now: Date): DerivedBookingStatus {
  if (booking.paymentMethod === "pay_now" && booking.paymentStatus !== "paid" && booking.paymentExpiresAt && booking.paymentExpiresAt <= now) return "payment_expired";
  if (booking.status === "confirmed") return "confirmed";
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "payment_expired") return "payment_expired";
  return "pending_payment";
}

function getDerivedPaymentStatus(paymentStatus: string, derivedStatus: DerivedBookingStatus): DerivedPaymentStatus {
  if (derivedStatus === "payment_expired") return "expired";
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "pending_cash_collection") return "pending_cash_collection";
  if (paymentStatus === "covered_by_loyalty") return "covered_by_loyalty";
  return "unpaid";
}

function getStatusLabel(s: DerivedBookingStatus) {
  const m = { pending_payment: "Pending payment", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", payment_expired: "Payment expired" };
  return m[s];
}

function getPaymentStatusLabel(s: DerivedPaymentStatus) {
  const m = { unpaid: "Pending payment", paid: "Paid", pending_cash_collection: "Pay after service", covered_by_loyalty: "Covered by loyalty", expired: "Expired" };
  return m[s];
}

function getPaymentMethodLabel(m: string | null) {
  if (m === "pay_now") return "Pay now";
  if (m === "pay_after_service") return "Pay after service";
  return null;
}

function getSupportingText(status: DerivedBookingStatus, paymentMethod: string | null) {
  if (status === "pending_payment") return "Payment pending. Slot is held.";
  if (status === "confirmed" && paymentMethod === "pay_after_service") return "Confirmed. Payment collected after service.";
  if (status === "confirmed") return "Confirmed and paid.";
  if (status === "completed") return "Session completed.";
  if (status === "cancelled") return "Booking was cancelled.";
  return "Payment window expired.";
}

function parseEventMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function getRefundLabel(refundMode: string) {
  if (refundMode === "manual_refund") return "Manual refund";
  if (refundMode === "razorpay_refund") return "Razorpay refund";
  if (refundMode === "waived") return "Waived (no refund)";
  return refundMode.replace(/_/g, " ");
}

function buildTimeline(
  booking: {
    createdAt: Date;
    paymentFailedAt: Date | null;
    loyaltyCountedAt: Date | null;
    loyaltyRewardRestored: boolean;
    paymentExpiredAt: Date | null;
    events: Array<{ type: string; summary: string; actor: string | null; createdAt: Date }>;
  },
  derivedStatus: DerivedBookingStatus,
  derivedPaymentStatus: DerivedPaymentStatus
) {
  const items: Array<{ type: string; label: string; at: string | null; actor?: string | null }> = [
    { type: "booking_created", label: "Booking created", at: booking.createdAt.toISOString(), actor: "system" },
  ];

  if (derivedPaymentStatus === "unpaid") {
    items.push({ type: "payment_pending", label: "Payment pending", at: booking.paymentFailedAt?.toISOString() ?? null, actor: "system" });
  }
  if (derivedPaymentStatus === "paid") {
    items.push({ type: "payment_completed", label: "Payment completed", at: null, actor: "system" });
  }
  if (derivedPaymentStatus === "covered_by_loyalty") {
    items.push({ type: "payment_completed", label: "Covered by loyalty reward", at: booking.loyaltyCountedAt?.toISOString() ?? null, actor: "system" });
  }
  if (derivedStatus === "confirmed") {
    items.push({ type: "booking_confirmed", label: "Booking confirmed", at: null, actor: "system" });
  }
  if (derivedStatus === "completed") {
    items.push({ type: "booking_completed", label: "Session completed", at: booking.loyaltyCountedAt?.toISOString() ?? null, actor: "system" });
  }
  if (derivedStatus === "cancelled") {
    items.push({ type: "booking_cancelled", label: "Booking cancelled", at: null, actor: "system" });
    if (booking.loyaltyRewardRestored) {
      items.push({ type: "reward_restored", label: "Loyalty reward restored", at: null, actor: "system" });
    }
  }
  if (derivedStatus === "payment_expired") {
    items.push({ type: "payment_expired", label: "Payment expired", at: booking.paymentExpiredAt?.toISOString() ?? null, actor: "system" });
  }

  return [...items, ...booking.events.map((event) => ({
    type: event.type,
    label: event.summary,
    at: event.createdAt.toISOString(),
    actor: event.actor,
  }))].sort((a, b) => {
    const aTime = a.at ? new Date(a.at).getTime() : 0;
    const bTime = b.at ? new Date(b.at).getTime() : 0;
    return aTime - bTime;
  });
}

function getAvailableActions(
  status: DerivedBookingStatus,
  teamId: string | null,
  dispatchState: string,
  groomerMemberId: string | null
): string[] {
  const actions: string[] = [];
  if (status === "confirmed") {
    actions.push(
      "mark_completed",
      "mark_issue",
      "cancel",
      "reschedule",
      "relay_call",
      "send_same_day_alert",
      "send_customer_message",
      "edit_metadata"
    );
    if (teamId && dispatchState === "assigned") actions.push("mark_en_route");
    if (teamId && dispatchState === "en_route") actions.push("mark_started");
    actions.push(teamId ? "reassign_team" : "assign_team");
    if (teamId) actions.push(groomerMemberId ? "reassign_groomer" : "assign_groomer");
  }
  if (status === "pending_payment") {
    actions.push("cancel", "relay_call", "retry_payment_support", "send_payment_link", "edit_metadata");
    actions.push(teamId ? "reassign_team" : "assign_team");
    if (teamId) actions.push(groomerMemberId ? "reassign_groomer" : "assign_groomer");
  }
  return actions;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const now = new Date();

    await ensureBookingSopSteps(prisma, id);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        assignedTeam: true,
        groomerMember: true,
        service: true,
        pets: { include: { pet: true, assets: true } },
        slots: { include: { slot: { include: { team: true } } } },
        events: { orderBy: { createdAt: "asc" } },
        dispatchAlerts: {
          orderBy: { sentAt: "desc" },
          include: { team: { select: { id: true, name: true } } },
          take: 8,
        },
        customerMessages: {
          orderBy: { preparedAt: "desc" },
          take: 8,
        },
        paymentCollection: true,
        sopSteps: {
          orderBy: { createdAt: "asc" },
          include: {
            proofs: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const sortedBookingSlots = [...booking.slots].sort(
      (a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime()
    );
    const firstSlot = sortedBookingSlots[0] ?? null;
    const team = booking.assignedTeam ?? firstSlot?.slot.team ?? null;
    const bookingWindowDisplay = getBookingWindowDisplay({
      bookingWindowId: booking.bookingWindowId,
      selectedDate: booking.selectedDate,
      slots: sortedBookingSlots.map((item) => item.slot),
    });

    const derivedStatus = getDerivedStatus(booking, now);
    const derivedPaymentStatus = getDerivedPaymentStatus(booking.paymentStatus, derivedStatus);
    const addressInfo = getAddressReadinessSummary(booking);
    const groomerGamification = booking.groomerMember
      ? getGamificationSnapshot({
          role: booking.groomerMember.role,
          currentXp: booking.groomerMember.currentXp,
          rewardPoints: booking.groomerMember.rewardPoints,
          trustScore: booking.groomerMember.trustScore,
          performanceScore: booking.groomerMember.performanceScore,
          completedCount: booking.groomerMember.completedCount,
          onTimeCount: booking.groomerMember.onTimeCount,
          reviewCount: booking.groomerMember.reviewCount,
          salaryHikeStage: booking.groomerMember.salaryHikeStage,
          punctualityStreak: booking.groomerMember.punctualityStreak,
          reviewStreak: booking.groomerMember.reviewStreak,
          noLeaveStreakDays: booking.groomerMember.noLeaveStreakDays,
        })
      : null;
    const qaReview = getLatestQaReview(booking.events);

    const detail = {
      id: booking.id,
      status: derivedStatus,
      statusLabel: getStatusLabel(derivedStatus),
      statusCategory: derivedStatus === "confirmed" || derivedStatus === "pending_payment" ? "upcoming" : "past",
      supportingText: getSupportingText(derivedStatus, booking.paymentMethod),
      paymentStatus: derivedPaymentStatus,
      paymentStatusLabel: getPaymentStatusLabel(derivedPaymentStatus),
      paymentMethod: booking.paymentMethod as "pay_now" | "pay_after_service" | null,
      paymentMethodLabel: getPaymentMethodLabel(booking.paymentMethod),
      createdAt: booking.createdAt.toISOString(),
      selectedDate: booking.selectedDate ?? null,
      bookingSource: booking.bookingSource,
      dispatchState: booking.dispatchState as
        | "unassigned"
        | "assigned"
        | "en_route"
        | "started"
        | "completed"
        | "issue",

      customer: {
        id: booking.user.id,
        name: booking.user.name,
        phoneMasked: maskPhone(booking.user.phone),
        phoneFull: booking.user.phone,
        city: booking.user.city ?? null,
      },
      addressInfo: {
        ...addressInfo,
        serviceAddress: booking.serviceAddress ?? null,
        serviceLandmark: booking.serviceLandmark ?? null,
        servicePincode: booking.servicePincode ?? null,
        serviceLocationUrl: booking.serviceLocationUrl ?? null,
        addressUpdatedAt: booking.addressUpdatedAt?.toISOString() ?? null,
      },

      service: { id: booking.service.id, name: booking.service.name },
      groomerMember: booking.groomerMember
        ? {
            id: booking.groomerMember.id,
            name: booking.groomerMember.name,
            role: booking.groomerMember.role,
            currentRank: groomerGamification?.rank ?? booking.groomerMember.currentRank,
            currentXp: booking.groomerMember.currentXp,
            currentLevel: groomerGamification?.level ?? booking.groomerMember.currentLevel,
            rewardPoints: booking.groomerMember.rewardPoints,
          }
        : null,

      financials: {
        originalAmount: booking.originalAmount,
        finalAmount: booking.finalAmount,
        discountAmount: Math.max(0, booking.originalAmount - booking.finalAmount),
        couponCode: booking.couponCode ?? null,
        currency: "INR" as const,
      },

      bookingWindow: bookingWindowDisplay ? {
        bookingWindowId: booking.bookingWindowId ?? null,
        startTime: bookingWindowDisplay.startTime,
        endTime: bookingWindowDisplay.endTime,
        displayLabel: bookingWindowDisplay.displayLabel,
        team: team ? { id: team.id, name: team.name } : null,
        slots: sortedBookingSlots.map((bs) => ({
          bookingSlotId: bs.id,
          slotId: bs.slotId,
          startTime: bs.slot.startTime.toISOString(),
          endTime: bs.slot.endTime.toISOString(),
          bookingSlotStatus: bs.status as "hold" | "confirmed" | "released",
          slotState: {
            isBooked: bs.slot.isBooked,
            isHeld: bs.slot.isHeld,
            isBlocked: bs.slot.isBlocked,
            holdExpiresAt: bs.slot.holdExpiresAt?.toISOString() ?? null,
          },
        })),
      } : null,

      pets: booking.pets.map((bp) => ({
        bookingPetId: bp.id,
        petId: bp.petId,
        sourcePetId: bp.sourcePetId ?? null,
        isSavedProfile: bp.isSavedProfile,
        name: bp.pet.name ?? null,
        breed: bp.pet.breed,
        groomingNotes: bp.groomingNotes ?? null,
        stylingNotes: bp.stylingNotes ?? null,
        stylingReferenceUrls: bp.assets.filter((a) => a.kind === "styling_reference").map((a) => a.publicUrl),
        concernPhotoUrls: bp.assets.filter((a) => a.kind === "concern_photo").map((a) => a.publicUrl),
        stylingReferenceAssets: bp.assets
          .filter((a) => a.kind === "styling_reference")
          .map((a) => ({
            id: a.id,
            storageKey: a.storageKey,
            publicUrl: a.publicUrl,
            originalName: a.originalName,
          })),
        concernPhotoAssets: bp.assets
          .filter((a) => a.kind === "concern_photo")
          .map((a) => ({
            id: a.id,
            storageKey: a.storageKey,
            publicUrl: a.publicUrl,
            originalName: a.originalName,
          })),
      })),

      paymentAudit: {
        razorpayOrderId: booking.razorpayOrderId ?? null,
        razorpayPaymentId: booking.razorpayPaymentId ?? null,
        paymentPendingReason: booking.paymentPendingReason ?? null,
        paymentGatewayError: booking.paymentGatewayError ?? null,
        paymentExpiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
        paymentFailedAt: booking.paymentFailedAt?.toISOString() ?? null,
        paymentExpiredAt: booking.paymentExpiredAt?.toISOString() ?? null,
      },
      paymentCollection: booking.paymentCollection
        ? {
            collectionMode: booking.paymentCollection.collectionMode as "cash" | "online" | "waived",
            collectedAmount: booking.paymentCollection.collectedAmount,
            expectedAmount: booking.paymentCollection.expectedAmount,
            mismatchFlag: booking.paymentCollection.mismatchFlag,
            serviceAmountUpdated:
              !booking.paymentCollection.mismatchFlag &&
              booking.paymentCollection.collectedAmount !== booking.paymentCollection.expectedAmount,
            serviceAmountDirection:
              !booking.paymentCollection.mismatchFlag &&
              booking.paymentCollection.collectedAmount !== booking.paymentCollection.expectedAmount
                ? booking.paymentCollection.collectedAmount > booking.paymentCollection.expectedAmount
                  ? "upsell"
                  : "downgrade"
                : null,
            notes: booking.paymentCollection.notes ?? null,
            recordedAt: booking.paymentCollection.recordedAt.toISOString(),
            recordedBy: booking.paymentCollection.recordedBy ?? null,
          }
        : null,

      refundSummary: (() => {
        const refundEvent = [...booking.events]
          .reverse()
          .find((event) => event.type === "paid_booking_cancelled");

        if (!refundEvent) return null;

        const metadata = parseEventMetadata(refundEvent.metadataJson);
        const refundMode = typeof metadata?.refundMode === "string" ? metadata.refundMode : "manual_refund";

        return {
          refundMode: refundMode as "manual_refund" | "razorpay_refund" | "waived",
          refundLabel: getRefundLabel(refundMode),
          reason: typeof metadata?.reason === "string" ? metadata.reason : refundEvent.summary,
          refundNotes: typeof metadata?.refundNotes === "string" ? metadata.refundNotes : null,
          cancelledAt: refundEvent.createdAt.toISOString(),
          originalAmount: typeof metadata?.originalAmount === "number" ? metadata.originalAmount : null,
          finalAmount: typeof metadata?.finalAmount === "number" ? metadata.finalAmount : null,
          razorpayOrderId: typeof metadata?.razorpayOrderId === "string" ? metadata.razorpayOrderId : null,
          razorpayPaymentId: typeof metadata?.razorpayPaymentId === "string" ? metadata.razorpayPaymentId : null,
        };
      })(),

      loyalty: {
        eligible: !!booking.loyaltyEligible,
        rewardApplied: !!booking.loyaltyRewardApplied,
        rewardRestored: !!booking.loyaltyRewardRestored,
        rewardLabel: booking.loyaltyRewardLabel ?? null,
        completedCountBefore: booking.loyaltyCompletedCountBefore ?? null,
        completedCountAfter: booking.loyaltyCompletedCountAfter ?? null,
        countedAt: booking.loyaltyCountedAt?.toISOString() ?? null,
      },

      adminNote: booking.adminNote ?? null,
      dispatchAlerts: booking.dispatchAlerts.map((alert) => ({
        id: alert.id,
        alertType: alert.alertType,
        team: { id: alert.team.id, name: alert.team.name },
        sentAt: alert.sentAt.toISOString(),
        success: alert.success,
        error: alert.errorMsg ?? null,
        telegramMessageId: alert.telegramMessageId ?? null,
      })),
      customerMessages: booking.customerMessages.map((message) => ({
        id: message.id,
        channel: message.channel,
        messageType: message.messageType,
        language: message.language,
        status: message.status,
        recipient: message.recipient,
        content: message.content,
        actionUrl: message.actionUrl ?? null,
        error: message.errorMsg ?? null,
        preparedAt: message.preparedAt.toISOString(),
        sentAt: message.sentAt?.toISOString() ?? null,
      })),
      sopSteps: BOOKING_SOP_STEPS.map((definition) => {
        const step = booking.sopSteps.find((item) => item.stepKey === definition.key);

        return {
          id: step?.id ?? definition.key,
          key: definition.key,
          label: definition.label,
          proofType: definition.proofType,
          requiredForCompletion: definition.requiredForCompletion,
          status: step?.status === "completed" ? "completed" : "pending",
          notes: step?.notes ?? null,
          completedAt: step?.completedAt?.toISOString() ?? null,
          completedBy: step?.completedBy ?? null,
          proofs: (step?.proofs ?? []).map((proof) => ({
            id: proof.id,
            stepKey: proof.stepKey,
            proofType: proof.proofType,
            publicUrl: proof.publicUrl,
            originalName: proof.originalName,
            mimeType: proof.mimeType,
            sizeBytes: proof.sizeBytes,
            createdAt: proof.createdAt.toISOString(),
          })),
        };
      }),
      qaReview,
      timeline: buildTimeline(booking, derivedStatus, derivedPaymentStatus),
      availableActions: getAvailableActions(derivedStatus, team?.id ?? null, booking.dispatchState, booking.groomerMemberId ?? null),
    };

    return NextResponse.json({ booking: detail });
  } catch (error) {
    console.error("GET /api/admin/bookings/:id failed", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}
