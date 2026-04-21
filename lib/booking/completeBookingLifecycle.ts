import type { Prisma, PrismaClient } from "../generated/prisma";
import { BOOKING_SOP_STEPS, getMissingRequiredSopLabels } from "./sop";

type DbClient = PrismaClient | Prisma.TransactionClient;

const LOYALTY_CYCLE = 5;

async function ensureBookingSopSteps(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  await tx.bookingSopStep.createMany({
    data: BOOKING_SOP_STEPS.map((step) => ({
      bookingId,
      stepKey: step.key,
    })),
    skipDuplicates: true,
  });
}

export async function completeBookingLifecycle(
  prisma: DbClient,
  bookingId: string
) {
  return prisma.$transaction(async (tx) => {
    await ensureBookingSopSteps(tx, bookingId);

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, service: true, slots: true, sopSteps: true },
    });

    if (!booking) throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
    if (booking.status === "cancelled") {
      throw Object.assign(new Error("Cancelled bookings cannot be completed"), { httpStatus: 400 });
    }
    if (booking.status === "completed") {
      return {
        alreadyCompleted: true,
        success: true,
        bookingId: booking.id,
        status: booking.status,
        loyalty: {
          counted: !!booking.loyaltyCountedAt,
          completedCountBefore: booking.loyaltyCompletedCountBefore ?? booking.user.loyaltyCompletedCount,
          completedCountAfter: booking.loyaltyCompletedCountAfter ?? booking.user.loyaltyCompletedCount,
          freeUnlockedAfter: booking.user.loyaltyFreeUnlocked,
        },
      };
    }
    if (booking.status !== "confirmed") {
      throw Object.assign(new Error("Only confirmed bookings can be marked completed"), { httpStatus: 400 });
    }

    const missingSopSteps = getMissingRequiredSopLabels(
      booking.sopSteps.filter((step) => step.status === "completed").map((step) => step.stepKey)
    );
    if (missingSopSteps.length > 0) {
      throw Object.assign(
        new Error(`Complete required SOP steps first: ${missingSopSteps.join(", ")}`),
        { httpStatus: 409 }
      );
    }

    if (booking.paymentMethod === "pay_after_service") {
      const paymentCollection = await tx.bookingPaymentCollection.findUnique({
        where: { bookingId },
        select: { id: true },
      });
      if (!paymentCollection) {
        throw Object.assign(
          new Error("Record payment proof before completing pay-after-service bookings"),
          { httpStatus: 409 }
        );
      }
    }

    let completedCountAfter = booking.user.loyaltyCompletedCount;
    let freeUnlockedAfter = booking.user.loyaltyFreeUnlocked;
    let loyaltyCountedAt: Date | null = booking.loyaltyCountedAt;

    const shouldCountLoyalty =
      booking.loyaltyEligible && !booking.loyaltyRewardApplied && !booking.loyaltyCountedAt;

    if (shouldCountLoyalty) {
      completedCountAfter = booking.user.loyaltyCompletedCount + 1;
      freeUnlockedAfter = completedCountAfter % LOYALTY_CYCLE === 0;
      loyaltyCountedAt = new Date();
      await tx.user.update({
        where: { id: booking.userId },
        data: {
          loyaltyCompletedCount: completedCountAfter,
          loyaltyFreeUnlocked: freeUnlockedAfter,
          loyaltyUnlockedAt: freeUnlockedAfter ? loyaltyCountedAt : booking.user.loyaltyUnlockedAt,
        },
      });
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "completed",
        dispatchState: "completed",
        loyaltyCompletedCountAfter: shouldCountLoyalty
          ? completedCountAfter
          : (booking.loyaltyCompletedCountAfter ?? booking.loyaltyCompletedCountBefore),
        loyaltyCountedAt: shouldCountLoyalty ? loyaltyCountedAt : booking.loyaltyCountedAt,
      },
    });

    return {
      alreadyCompleted: false,
      success: true,
      bookingId: booking.id,
      status: "completed",
      loyalty: {
        counted: shouldCountLoyalty,
        completedCountBefore: booking.loyaltyCompletedCountBefore ?? booking.user.loyaltyCompletedCount,
        completedCountAfter,
        freeUnlockedAfter,
      },
    };
  });
}
