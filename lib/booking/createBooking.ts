import { Prisma, PrismaClient } from "../generated/prisma";
import { validateAndLockSlots } from "../slots/validateAndLockSlots";
import { evaluateCoupons } from "../coupons/service";

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

function getRolePriority(role: string) {
  if (role === "groomer") return 0;
  if (role === "team_lead") return 1;
  return 2;
}

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
  overrideFinalAmount?: number | null;
  serviceAddress?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  serviceLocationUrl?: string | null;
  serviceLat?: number | null;
  serviceLng?: number | null;
  serviceLocationSource?: string | null;
};

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

async function resolveAutoAssignedGroomer(
  tx: Prisma.TransactionClient,
  teamId: string,
  selectedDate: string
) {
  const candidates = await tx.teamMember.findMany({
    where: {
      teamId,
      isActive: true,
      role: { in: ["groomer", "team_lead"] },
    },
    include: {
      bookings: {
        where: {
          selectedDate,
          status: { in: ["pending_payment", "confirmed"] },
        },
        select: { id: true },
      },
    },
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const loadDiff = a.bookings.length - b.bookings.length;
    if (loadDiff !== 0) return loadDiff;

    const roleDiff = getRolePriority(a.role) - getRolePriority(b.role);
    if (roleDiff !== 0) return roleDiff;

    const joinedDiff = a.joinedAt.getTime() - b.joinedAt.getTime();
    if (joinedDiff !== 0) return joinedDiff;

    return a.name.localeCompare(b.name);
  });

  return candidates[0];
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

  const result = await prisma.$transaction(async (tx) => {
    const resolvedUser = await resolveCanonicalUser(tx, input);
    let user = resolvedUser.user;
    const { normalizedPhone } = resolvedUser;
    const bookingBaseAmount = service.price * input.pets.length;

    const couponEvaluation = await evaluateCoupons(tx, {
      rawCouponCode:
        input.paymentMethod === "pay_now" && typeof input.overrideFinalAmount !== "number"
          ? input.couponCode
          : null,
      serviceName: service.name,
      city: input.city,
      petCount: input.pets.length,
      paymentMethod: input.paymentMethod,
      baseAmount: bookingBaseAmount,
      userId: user.id,
      phone: normalizedPhone,
    });

    if (!couponEvaluation.ok) {
      throw Object.assign(new Error(couponEvaluation.error), {
        httpStatus: 400,
      });
    }

    const normalizedCouponCode =
      typeof input.overrideFinalAmount === "number"
        ? null
        : couponEvaluation.serializedCouponCodes;

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

    let finalAmount =
      typeof input.overrideFinalAmount === "number"
        ? Math.max(0, Math.round(input.overrideFinalAmount))
        : couponEvaluation.finalAmount;
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

    if (!loyaltyRewardApplied && input.paymentMethod === "pay_now" && finalAmount <= 0) {
      paymentStatus = "paid";
      bookingStatus = "confirmed";
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

    const autoAssignedGroomer = await resolveAutoAssignedGroomer(
      tx,
      lockResult.teamId,
      input.selectedDate
    );

    const booking = await tx.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        status: bookingStatus,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        couponCode: normalizedCouponCode,
        originalAmount: bookingBaseAmount,
        finalAmount,
        selectedDate: input.selectedDate,
        bookingWindowId: input.bookingWindowId,
        bookingSource: input.bookingSource?.trim() || "website",
        serviceAddress: input.serviceAddress?.trim() || null,
        serviceLandmark: input.serviceLandmark?.trim() || null,
        servicePincode: input.servicePincode?.trim() || null,
        serviceLocationUrl: input.serviceLocationUrl?.trim() || null,
        serviceLat: typeof input.serviceLat === "number" ? input.serviceLat : null,
        serviceLng: typeof input.serviceLng === "number" ? input.serviceLng : null,
        serviceLocationSource: input.serviceLocationSource?.trim() || null,
        assignedTeamId: lockResult.teamId,
        groomerMemberId: autoAssignedGroomer?.id ?? null,
        dispatchState: "assigned",
        addressUpdatedAt:
          input.serviceAddress?.trim() ||
          input.serviceLandmark?.trim() ||
          input.servicePincode?.trim() ||
          input.serviceLocationUrl?.trim() ||
          (typeof input.serviceLat === "number" && typeof input.serviceLng === "number")
            ? new Date()
            : null,
        loyaltyEligible,
        loyaltyCompletedCountBefore: completedCountBefore,
        loyaltyRewardApplied,
        loyaltyRewardLabel,
        paymentExpiresAt,
        adminNote: input.adminNote?.trim() || null,
      },
    });

    if (couponEvaluation.appliedCoupons.length > 0) {
      await tx.couponRedemption.createMany({
        data: couponEvaluation.appliedCoupons.map((coupon) => ({
          couponId: coupon.couponId,
          bookingId: booking.id,
          userId: user.id,
          codeSnapshot: coupon.code,
          titleSnapshot: coupon.title,
          discountAmount: coupon.discountAmount,
        })),
      });
    }

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

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: "team_assigned",
        actor: "system",
        summary: `Team auto-assigned to ${lockResult.teamName}`,
        metadataJson: JSON.stringify({
          teamId: lockResult.teamId,
          teamName: lockResult.teamName,
          source: "booking_creation_auto_assignment",
        }),
      },
    });

    if (autoAssignedGroomer) {
      await tx.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: "groomer_assigned",
          actor: "system",
          summary: `Groomer auto-assigned to ${autoAssignedGroomer.name}`,
          metadataJson: JSON.stringify({
            teamMemberId: autoAssignedGroomer.id,
            teamId: autoAssignedGroomer.teamId,
            role: autoAssignedGroomer.role,
            source: "booking_creation_auto_assignment",
          }),
        },
      });
    }

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
      appliedCoupons: couponEvaluation.appliedCoupons,
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
