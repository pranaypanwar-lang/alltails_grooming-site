import { NextResponse } from "next/server";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";

export const runtime = "nodejs";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim() ?? "";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? PAGE_SIZE) || PAGE_SIZE, 200);

    let calculatedAtFilter: { gte: Date; lt: Date } | undefined;
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [yearStr, monthStr] = month.split("-");
      const year = Number(yearStr);
      const monthIdx = Number(monthStr) - 1;
      // IST month bounds — IST is UTC+5:30, so month start in IST = previous day 18:30 UTC
      const startUtc = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0) - 330 * 60_000);
      const endUtc = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0) - 330 * 60_000);
      calculatedAtFilter = { gte: startUtc, lt: endUtc };
    }

    const trips = await adminPrisma.groomerFuelTrip.findMany({
      where: {
        groomerMemberId: member.id,
        ...(calculatedAtFilter ? { calculatedAt: calculatedAtFilter } : {}),
      },
      orderBy: { calculatedAt: "desc" },
      take: limit,
      include: {
        booking: {
          select: {
            id: true,
            selectedDate: true,
            serviceAddress: true,
            servicePincode: true,
            user: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      trips: trips.map((trip) => ({
        id: trip.id,
        bookingId: trip.bookingId,
        bookingDate: trip.booking.selectedDate,
        bookingService: trip.booking.service?.name ?? null,
        customerName: trip.booking.user?.name ?? null,
        serviceAddress: trip.booking.serviceAddress,
        servicePincode: trip.booking.servicePincode,
        fromType: trip.fromType,
        distanceKm: trip.distanceKm,
        litres: trip.litres,
        ratePerLitre: trip.ratePerLitre,
        fuelCost: trip.fuelCost,
        isManuallyAdjusted: trip.isManuallyAdjusted,
        originalDistanceKm: trip.originalDistanceKm,
        originalFuelCost: trip.originalFuelCost,
        adjustmentReason: trip.adjustmentReason,
        adjustmentRequestStatus: trip.adjustmentRequestStatus,
        requestedDistanceKm: trip.requestedDistanceKm,
        requestedReason: trip.requestedReason,
        requestedAt: trip.requestedAt?.toISOString() ?? null,
        adjustmentReviewedAt: trip.adjustmentReviewedAt?.toISOString() ?? null,
        adjustmentReviewNote: trip.adjustmentReviewNote,
        calculatedAt: trip.calculatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/groomer/me/fuel-trips failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load fuel trips" },
      { status: 500 }
    );
  }
}
