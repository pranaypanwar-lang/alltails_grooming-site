import { PrismaClient } from "../generated/prisma";

const LOYALTY_CYCLE = 5;

/**
 * Mark a booking as completed and update the user's loyalty counters.
 * Call this from your booking-complete webhook / admin action.
 */
export async function completeBookingWithLoyalty(
  prisma: PrismaClient,
  bookingId: string
): Promise<{ loyaltyFreeUnlocked: boolean; completedCount: number }> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        loyaltyEligible: true,
        loyaltyRewardApplied: true,
        loyaltyCountedAt: true,
        userId: true,
      },
    });

    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    if (booking.status === "completed") {
      throw new Error(`Booking ${bookingId} is already completed`);
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "completed",
        loyaltyCountedAt: new Date(),
      },
    });

    // Only count toward loyalty if eligible and not a free-reward booking
    if (!booking.loyaltyEligible || booking.loyaltyRewardApplied) {
      return { loyaltyFreeUnlocked: false, completedCount: 0 };
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: booking.userId },
      select: { loyaltyCompletedCount: true, loyaltyFreeUnlocked: true },
    });

    const newCount = user.loyaltyCompletedCount + 1;
    const cyclePosition = newCount % LOYALTY_CYCLE;
    const shouldUnlock = cyclePosition === 0 && !user.loyaltyFreeUnlocked;

    const updatedUser = await tx.user.update({
      where: { id: booking.userId },
      data: {
        loyaltyCompletedCount: newCount,
        ...(shouldUnlock
          ? { loyaltyFreeUnlocked: true, loyaltyUnlockedAt: new Date() }
          : {}),
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { loyaltyCompletedCountAfter: newCount },
    });

    return {
      loyaltyFreeUnlocked: shouldUnlock,
      completedCount: updatedUser.loyaltyCompletedCount,
    };
  });
}

/**
 * Restore loyaltyFreeUnlocked if a free-reward booking is cancelled.
 */
export async function cancelBookingWithLoyaltyRollback(
  prisma: PrismaClient,
  bookingId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        loyaltyRewardApplied: true,
        loyaltyRewardRestored: true,
        userId: true,
      },
    });

    if (!booking) throw new Error(`Booking ${bookingId} not found`);
    if (booking.status === "cancelled") return;

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        ...(booking.loyaltyRewardApplied && !booking.loyaltyRewardRestored
          ? { loyaltyRewardRestored: true }
          : {}),
      },
    });

    if (booking.loyaltyRewardApplied && !booking.loyaltyRewardRestored) {
      await tx.user.update({
        where: { id: booking.userId },
        data: { loyaltyFreeUnlocked: true },
      });
    }
  });
}
