import type { Prisma } from "../generated/prisma";
import { getIstMonthBucket } from "./groomerLedger";

const EARTH_RADIUS_KM = 6371;
const ROAD_MULTIPLIER = 1.3;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function roundDistance(value: number) {
  return Math.round(value * 100) / 100;
}

function roundLitres(value: number) {
  return Math.round(value * 1000) / 1000;
}

export async function syncEstimatedFuelTripForBooking(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: {
      groomerMember: {
        select: {
          id: true,
          homeLat: true,
          homeLng: true,
          bikeAverageKmPerLitre: true,
          fuelRatePerLitre: true,
        },
      },
      slots: {
        include: { slot: true },
      },
    },
  });

  if (!booking || booking.status !== "completed" || !booking.groomerMemberId) return null;
  if (typeof booking.serviceLat !== "number" || typeof booking.serviceLng !== "number") return null;

  const firstSlot = [...booking.slots].sort(
    (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
  )[0]?.slot ?? null;
  const serviceDate = booking.selectedDate;
  if (!serviceDate) return null;

  const sameDayCompletedBookings = await tx.booking.findMany({
    where: {
      groomerMemberId: booking.groomerMemberId,
      selectedDate: serviceDate,
      status: "completed",
      serviceLat: { not: null },
      serviceLng: { not: null },
    },
    include: {
      slots: { include: { slot: true } },
    },
  });

  const sortedBookings = sameDayCompletedBookings
    .map((item) => {
      const startTime = [...item.slots].sort(
        (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
      )[0]?.slot.startTime ?? null;
      return { booking: item, startTime };
    })
    .sort((a, b) => {
      const aTime = a.startTime?.getTime() ?? 0;
      const bTime = b.startTime?.getTime() ?? 0;
      return aTime - bTime || a.booking.createdAt.getTime() - b.booking.createdAt.getTime();
    });

  const currentIndex = sortedBookings.findIndex((item) => item.booking.id === booking.id);
  const previous = currentIndex > 0 ? sortedBookings[currentIndex - 1]?.booking : null;
  const member = booking.groomerMember;

  const origin =
    previous && typeof previous.serviceLat === "number" && typeof previous.serviceLng === "number"
      ? {
          fromType: "previous_booking",
          fromBookingId: previous.id,
          fromLat: previous.serviceLat,
          fromLng: previous.serviceLng,
        }
      : typeof member?.homeLat === "number" && typeof member.homeLng === "number"
        ? {
            fromType: "home",
            fromBookingId: null,
            fromLat: member.homeLat,
            fromLng: member.homeLng,
          }
        : null;

  if (!origin) return null;

  const distanceKm = roundDistance(haversineKm(origin.fromLat, origin.fromLng, booking.serviceLat, booking.serviceLng) * ROAD_MULTIPLIER);
  const bikeAverage = Math.max(1, member?.bikeAverageKmPerLitre ?? 35);
  const ratePerLitre = Math.max(0, member?.fuelRatePerLitre ?? 95);
  const litres = roundLitres(distanceKm / bikeAverage);
  const fuelCost = Math.round(litres * ratePerLitre);
  const calculatedAt = new Date();

  const trip = await tx.groomerFuelTrip.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      groomerMemberId: booking.groomerMemberId,
      fromType: origin.fromType,
      fromBookingId: origin.fromBookingId,
      fromLat: origin.fromLat,
      fromLng: origin.fromLng,
      toLat: booking.serviceLat,
      toLng: booking.serviceLng,
      distanceKm,
      roadMultiplier: ROAD_MULTIPLIER,
      litres,
      ratePerLitre,
      fuelCost,
      calculatedAt,
    },
    update: {
      groomerMemberId: booking.groomerMemberId,
      fromType: origin.fromType,
      fromBookingId: origin.fromBookingId,
      fromLat: origin.fromLat,
      fromLng: origin.fromLng,
      toLat: booking.serviceLat,
      toLng: booking.serviceLng,
      distanceKm,
      roadMultiplier: ROAD_MULTIPLIER,
      litres,
      ratePerLitre,
      fuelCost,
      calculatedAt,
    },
  });

  await tx.groomerLedgerEntry.upsert({
    where: {
      sourceType_sourceId_type: {
        sourceType: "GroomerFuelTrip",
        sourceId: trip.id,
        type: "reimbursement_fuel",
      },
    },
    create: {
      groomerMemberId: booking.groomerMemberId,
      monthBucket: getIstMonthBucket(calculatedAt),
      type: "reimbursement_fuel",
      direction: "credit",
      amount: trip.fuelCost,
      sourceType: "GroomerFuelTrip",
      sourceId: trip.id,
      description: `Estimated fuel for booking ${booking.id}`,
      createdBy: "system",
      occurredAt: calculatedAt,
      metadataJson: JSON.stringify({
        bookingId: booking.id,
        fromType: trip.fromType,
        fromBookingId: trip.fromBookingId,
        distanceKm: trip.distanceKm,
        litres: trip.litres,
        ratePerLitre: trip.ratePerLitre,
        isEstimate: true,
        firstSlotStartTime: firstSlot?.startTime.toISOString() ?? null,
      }),
    },
    update: {
      groomerMemberId: booking.groomerMemberId,
      monthBucket: getIstMonthBucket(calculatedAt),
      amount: trip.fuelCost,
      description: `Estimated fuel for booking ${booking.id}`,
      occurredAt: calculatedAt,
      metadataJson: JSON.stringify({
        bookingId: booking.id,
        fromType: trip.fromType,
        fromBookingId: trip.fromBookingId,
        distanceKm: trip.distanceKm,
        litres: trip.litres,
        ratePerLitre: trip.ratePerLitre,
        isEstimate: true,
        firstSlotStartTime: firstSlot?.startTime.toISOString() ?? null,
      }),
    },
  });

  return trip;
}
