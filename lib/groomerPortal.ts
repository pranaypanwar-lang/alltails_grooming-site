import type { Prisma, PrismaClient } from "./generated/prisma";
import { BOOKING_SOP_STEPS } from "./booking/sop";
import { getAddressReadinessSummary } from "./booking/addressCapture";
import { getBookingWindowDisplay } from "./booking/window";
import { getBookingRewardSummary, getGamificationSnapshot } from "./groomerRewards";
import { getServiceSlaSummary } from "./serviceSla";

type DbClient = PrismaClient | Prisma.TransactionClient;

type GroomerBookingRecord = Prisma.BookingGetPayload<{
  include: {
    user: true;
    groomerMember: true;
    service: true;
    assignedTeam: { include: { members: { where: { isActive: true }, orderBy: { name: "asc" } } } };
    pets: { include: { pet: { include: { assets: true } }, assets: true } };
    slots: { include: { slot: { include: { team: true } } } };
    sopSteps: { include: { proofs: true } };
    paymentCollection: true;
    customerMessages: true;
  };
}>;

export type GroomerBookingView = Awaited<ReturnType<typeof serializeGroomerBooking>>;

export async function serializeGroomerBooking(prisma: DbClient, booking: GroomerBookingRecord) {
  const sortedSlots = [...booking.slots].sort(
    (a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime()
  );
  const firstSlot = sortedSlots[0]?.slot ?? null;
  const bookingWindowDisplay = getBookingWindowDisplay({
    bookingWindowId: booking.bookingWindowId,
    selectedDate: booking.selectedDate,
    slots: sortedSlots.map((item) => item.slot),
  });
  const addressInfo = getAddressReadinessSummary(booking);
  const serviceSla = getServiceSlaSummary(booking.service.name);
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

  const rewardSummary = await getBookingRewardSummary(prisma, booking.id);

  return {
    id: booking.id,
    status: booking.status,
    dispatchState: booking.dispatchState,
    selectedDate: booking.selectedDate ?? null,
    opsNote: booking.adminNote ?? null,
    service: {
      id: booking.service.id,
      name: booking.service.name,
      sla: {
        durationMinutes: serviceSla.durationMinutes,
        label: serviceSla.label,
      },
    },
    customer: {
      name: booking.user.name,
      phone: booking.user.phone,
      city: booking.user.city ?? null,
    },
    team: booking.assignedTeam
      ? { id: booking.assignedTeam.id, name: booking.assignedTeam.name }
      : firstSlot?.team
        ? { id: firstSlot.team.id, name: firstSlot.team.name }
        : null,
    groomerMember: booking.groomerMember
      ? {
          id: booking.groomerMember.id,
          name: booking.groomerMember.name,
          role: booking.groomerMember.role,
          currentRank: groomerGamification?.rank ?? booking.groomerMember.currentRank,
          currentXp: booking.groomerMember.currentXp,
        }
      : null,
    availableTeamMembers: (booking.assignedTeam?.members ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      currentRank: member.currentRank,
      currentXp: member.currentXp,
    })),
    bookingWindow: bookingWindowDisplay
      ? {
          startTime: bookingWindowDisplay.startTime,
          endTime: bookingWindowDisplay.endTime,
          label: bookingWindowDisplay.displayLabel,
        }
      : null,
    addressInfo: {
      ...addressInfo,
      serviceAddress: booking.serviceAddress ?? null,
      serviceLandmark: booking.serviceLandmark ?? null,
      servicePincode: booking.servicePincode ?? null,
      serviceLocationUrl: booking.serviceLocationUrl ?? null,
    },
    pets: booking.pets.map((item) => ({
      id: item.pet.id,
      name: item.pet.name ?? null,
      breed: item.pet.breed,
      avatarUrl: item.pet.avatarUrl ?? null,
      groomingNotes: item.groomingNotes ?? item.pet.defaultGroomingNotes ?? null,
      stylingNotes: item.stylingNotes ?? item.pet.defaultStylingNotes ?? null,
      stylingReferenceUrls: (() => {
        const bookingRefs = item.assets
          .filter((asset) => asset.kind === "styling_reference")
          .map((asset) => asset.publicUrl);
        return bookingRefs.length
          ? bookingRefs
          : item.pet.assets
              .filter((asset) => asset.kind === "styling_reference")
              .map((asset) => asset.publicUrl);
      })(),
      concernPhotoUrls: item.assets
        .filter((asset) => asset.kind === "concern_photo")
        .map((asset) => asset.publicUrl),
    })),
    payment: {
      method: booking.paymentMethod,
      status: booking.paymentStatus,
      finalAmount: booking.finalAmount,
      collection: booking.paymentCollection
        ? {
            collectionMode: booking.paymentCollection.collectionMode,
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
          }
        : null,
    },
    sopSteps: BOOKING_SOP_STEPS.map((definition) => {
      const step = booking.sopSteps.find((item) => item.stepKey === definition.key);
      return {
        key: definition.key,
        label: definition.label,
        groomerLabel: definition.groomerLabel,
        groomerLabelHindi: definition.groomerLabelHindi,
        groomerHint: definition.groomerHint ?? null,
        groomerHintHindi: definition.groomerHintHindi ?? null,
        proofType: definition.proofType,
        requiredForCompletion: definition.requiredForCompletion,
        status: step?.status === "completed" ? "completed" : "pending",
        completedAt: step?.completedAt?.toISOString() ?? null,
        proofs: (step?.proofs ?? []).map((proof) => ({
          id: proof.id,
          publicUrl: proof.publicUrl,
          originalName: proof.originalName,
          proofType: proof.proofType,
          createdAt: proof.createdAt.toISOString(),
        })),
      };
    }),
    customerMessages: booking.customerMessages.slice(0, 6).map((message) => ({
      id: message.id,
      messageType: message.messageType,
      status: message.status,
      preparedAt: message.preparedAt.toISOString(),
      sentAt: message.sentAt?.toISOString() ?? null,
    })),
    rewardSummary,
  };
}

export async function fetchGroomerBooking(prisma: DbClient, bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      assignedTeam: { include: { members: { where: { isActive: true }, orderBy: { name: "asc" } } } },
      groomerMember: true,
      service: true,
      pets: { include: { pet: { include: { assets: true } }, assets: true } },
      slots: { include: { slot: { include: { team: true } } } },
      sopSteps: { include: { proofs: true }, orderBy: { createdAt: "asc" } },
      paymentCollection: true,
      customerMessages: { orderBy: { preparedAt: "desc" }, take: 6 },
    },
  });
}
