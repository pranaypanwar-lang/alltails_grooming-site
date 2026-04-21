import { Prisma, PrismaClient } from "../generated/prisma";
import { validateAndLockSlots } from "../slots/validateAndLockSlots";

const LOYALTY_ELIGIBLE_SERVICES = new Set([
  "Complete Pampering",
  "Signature Care",
  "Essential Care",
]);

const LOYALTY_CYCLE = 5;
const PAYMENT_HOLD_MINUTES = 15;

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const isLoyaltyEligibleService = (serviceName: string) =>
  LOYALTY_ELIGIBLE_SERVICES.has(serviceName);

const getPaymentExpiry = () =>
  new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60 * 1000);

export type BookingCreateAssetInput = {
  storageKey: string;
  publicUrl: string;
  originalName: string;
};

export type BookingCreatePetInput = {
  sourcePetId?: string;
  isSavedProfile?: boolean;
  name?: string;
  breed: string;
  stylingNotes?: string;
  groomingNotes?: string;
  stylingAssets?: BookingCreateAssetInput[];
  concernAssets?: BookingCreateAssetInput[];
};

export type CreateBookingInput = {
  name: string;
  phone: string;
  city: string;
  serviceName: string;
  selectedDate: string;
  bookingWindowId: string;
  slotIds: string[];
  pets: BookingCreatePetInput[];
  paymentMethod: "pay_now" | "pay_after_service";
  couponCode?: string;
  adminNote?: string | null;
  bookingSource?: string;
};

function applyCoupon(
  servicePrice: number,
  couponCode?: string
): { finalAmount: number; normalizedCouponCode: string | null } {
  const normalized = couponCode?.trim().toUpperCase() || "";

  if (!normalized) {
    return { finalAmount: servicePrice, normalizedCouponCode: null };
  }

  if (normalized === "WELCOME10") {
    return {
      finalAmount: Math.max(0, Math.round(servicePrice * 0.9)),
      normalizedCouponCode: normalized,
    };
  }

  if (normalized === "FLAT200") {
    return {
      finalAmount: Math.max(0, servicePrice - 200),
      normalizedCouponCode: normalized,
    };
  }

  return { finalAmount: servicePrice, normalizedCouponCode: normalized };
}

async function resolveCanonicalUser(
  tx: Prisma.TransactionClient,
  input: CreateBookingInput
) {
  const normalizedPhone = normalizePhone(input.phone);
  const firstSavedPetId =
    input.pets.find((pet) => !!pet.sourcePetId)?.sourcePetId || null;

  if (firstSavedPetId) {
    const savedPetOwner = await tx.pet.findFirst({
      where: {
        id: firstSavedPetId,
        user: {
          phone: {
            endsWith: normalizedPhone,
          },
        },
      },
      include: {
        user: true,
      },
    });

    if (!savedPetOwner) {
      throw new Error("Saved pet not found for this user");
    }

    const user = await tx.user.update({
      where: { id: savedPetOwner.user.id },
      data: {
        name: input.name,
        city: input.city,
        phone: normalizedPhone,
      },
    });

    return { user, normalizedPhone };
  }

  const existingUser = await tx.user.findFirst({
    where: {
      phone: {
        endsWith: normalizedPhone,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existingUser) {
    const user = await tx.user.update({
      where: { id: existingUser.id },
      data: {
        name: input.name,
        city: input.city,
        phone: normalizedPhone,
      },
    });

    return { user, normalizedPhone };
  }

  const user = await tx.user.create({
    data: {
      name: input.name,
      phone: normalizedPhone,
      city: input.city,
    },
  });

  return { user, normalizedPhone };
}

export async function createBookingWithBusinessRules(
  prisma: PrismaClient,
  input: CreateBookingInput
) {
  const service = await prisma.service.findFirst({
    where: { name: input.serviceName },
  });

  if (!service) {
    throw Object.assign(new Error("Selected service not found"), {
      httpStatus: 404,
    });
  }

  const couponEligibleCode =
    input.paymentMethod === "pay_now" ? input.couponCode : undefined;
  const { finalAmount: couponFinalAmount, normalizedCouponCode } = applyCoupon(
    service.price,
    couponEligibleCode
  );

  const result = await prisma.$transaction(async (tx) => {
    const resolvedUser = await resolveCanonicalUser(tx, input);
    let user = resolvedUser.user;
    const { normalizedPhone } = resolvedUser;

    const loyaltyEligible = isLoyaltyEligibleService(service.name);
    const completedCountBefore = user.loyaltyCompletedCount;
    const sessionsInCurrentCycleBefore = completedCountBefore % LOYALTY_CYCLE;
    const remainingToFreeBeforeBooking = user.loyaltyFreeUnlocked
      ? 0
      : LOYALTY_CYCLE - sessionsInCurrentCycleBefore;

    const loyaltyRewardApplied =
      loyaltyEligible &&
      user.loyaltyFreeUnlocked &&
      input.paymentMethod === "pay_now";

    const completedCountAfter = completedCountBefore;
    const sessionsInCurrentCycleAfter = completedCountAfter % LOYALTY_CYCLE;
    const freeUnlockedAfterBooking = loyaltyRewardApplied
      ? false
      : user.loyaltyFreeUnlocked;
    const remainingToFreeAfterBooking = freeUnlockedAfterBooking
      ? 0
      : LOYALTY_CYCLE - sessionsInCurrentCycleAfter;

    let finalAmount = couponFinalAmount;
    let paymentStatus =
      input.paymentMethod === "pay_now" ? "unpaid" : "pending_cash_collection";
    let bookingStatus =
      input.paymentMethod === "pay_now" ? "pending_payment" : "confirmed";
    let loyaltyRewardLabel: string | null = null;

    if (loyaltyRewardApplied) {
      finalAmount = 0;
      paymentStatus = "covered_by_loyalty";
      bookingStatus = "confirmed";
      loyaltyRewardLabel = "Free session — loyalty reward";
    }

    const isPrepaidHold = input.paymentMethod === "pay_now" && finalAmount > 0;
    const paymentExpiresAt = isPrepaidHold ? getPaymentExpiry() : null;

    const lockResult = await validateAndLockSlots(tx, input.slotIds, {
      mode: isPrepaidHold ? "held" : "booked",
      holdExpiresAt: isPrepaidHold ? paymentExpiresAt : null,
    });
    if (!lockResult.ok) {
      const statusMap: Record<string, number> = {
        SLOTS_NOT_FOUND: 404,
        MIXED_TEAMS: 400,
        NOT_CONSECUTIVE: 400,
        SLOTS_UNAVAILABLE: 409,
      };
      throw Object.assign(new Error(lockResult.error.message), {
        httpStatus: statusMap[lockResult.error.code] ?? 400,
      });
    }

    const booking = await tx.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        status: bookingStatus,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        couponCode: normalizedCouponCode,
        originalAmount: service.price,
        finalAmount,
        selectedDate: input.selectedDate,
        bookingWindowId: input.bookingWindowId,
        bookingSource: input.bookingSource?.trim() || "website",
        loyaltyEligible,
        loyaltyCompletedCountBefore: completedCountBefore,
        loyaltyRewardApplied,
        loyaltyRewardLabel,
        paymentExpiresAt,
        adminNote: input.adminNote?.trim() || null,
      },
    });

    for (const petInput of input.pets) {
      let petRecord;

      if (petInput.sourcePetId) {
        const existingPet = await tx.pet.findFirst({
          where: {
            id: petInput.sourcePetId,
            user: {
              phone: {
                endsWith: normalizedPhone,
              },
            },
          },
        });

        if (!existingPet) {
          throw new Error("Saved pet not found for this user");
        }

        if (existingPet.userId !== user.id) {
          user = await tx.user.update({
            where: { id: existingPet.userId },
            data: {
              name: input.name,
              city: input.city,
              phone: normalizedPhone,
            },
          });
        }

        petRecord = await tx.pet.update({
          where: { id: existingPet.id },
          data: {
            name: petInput.name?.trim() || null,
            breed: petInput.breed.trim(),
          },
        });
      } else {
        petRecord = await tx.pet.create({
          data: {
            name: petInput.name?.trim() || null,
            breed: petInput.breed.trim(),
            userId: user.id,
          },
        });
      }

      const bookingPet = await tx.bookingPet.create({
        data: {
          bookingId: booking.id,
          petId: petRecord.id,
          sourcePetId: petInput.sourcePetId || null,
          isSavedProfile: !!petInput.sourcePetId,
          stylingNotes: petInput.stylingNotes?.trim() || null,
          groomingNotes: petInput.groomingNotes?.trim() || null,
        },
      });

      for (const asset of petInput.stylingAssets || []) {
        await tx.bookingPetAsset.create({
          data: {
            bookingPetId: bookingPet.id,
            kind: "styling_reference",
            storageKey: asset.storageKey,
            publicUrl: asset.publicUrl,
            originalName: asset.originalName,
          },
        });
      }

      for (const asset of petInput.concernAssets || []) {
        await tx.bookingPetAsset.create({
          data: {
            bookingPetId: bookingPet.id,
            kind: "concern_photo",
            storageKey: asset.storageKey,
            publicUrl: asset.publicUrl,
            originalName: asset.originalName,
          },
        });
      }
    }

    for (const slotId of input.slotIds) {
      await tx.bookingSlot.create({
        data: {
          bookingId: booking.id,
          slotId,
          status: isPrepaidHold ? "hold" : "confirmed",
        },
      });
    }

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: "booking_created",
        actor: input.bookingSource?.trim() === "website" ? "customer" : "admin",
        summary:
          input.bookingSource?.trim() === "website"
            ? "Booking created on website"
            : `Manual booking created from ${input.bookingSource?.trim() || "admin"}`,
        metadataJson: JSON.stringify({
          bookingSource: input.bookingSource?.trim() || "website",
          paymentMethod: input.paymentMethod,
          selectedDate: input.selectedDate,
        }),
      },
    });

    if (loyaltyRewardApplied) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          loyaltyFreeUnlocked: false,
          loyaltyLastRedeemedAt: new Date(),
        },
      });
    }

    return {
      booking,
      user,
      service,
      normalizedCouponCode,
      loyalty: {
        eligible: loyaltyEligible,
        completedCountBefore,
        completedCountAfter,
        sessionsInCurrentCycleBefore,
        sessionsInCurrentCycleAfter,
        remainingToFreeBeforeBooking,
        remainingToFreeAfterBooking,
        rewardApplied: loyaltyRewardApplied,
        rewardLabel: loyaltyRewardLabel,
        freeUnlockedBeforeBooking: user.loyaltyFreeUnlocked,
        freeUnlockedAfterBooking,
      },
    };
  });

  return result;
}
