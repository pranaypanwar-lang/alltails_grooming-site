import { NextRequest, NextResponse } from "next/server";
import { adminPrisma } from "../../../../admin/_lib/bookingAdmin";
import { assertGroomerAccess } from "../../../_lib/assertGroomerAccess";
import { calculateRoadDistanceKm, calculateFuelCost } from "../../../../../../lib/groomer/geoDistance";

export const runtime = "nodejs";

const KM_PER_LITRE = 35;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const token = request.nextUrl.searchParams.get("token");
    const access = await assertGroomerAccess(bookingId, token);
    if (access.error) return access.error;

    const body = await request.json().catch(() => ({}));
    const {
      arrivedLat,
      arrivedLng,
      approvedDistanceKm,
    }: {
      arrivedLat?: number;
      arrivedLng?: number;
      approvedDistanceKm?: number;
    } = body;

    if (
      typeof arrivedLat !== "number" ||
      typeof arrivedLng !== "number" ||
      typeof approvedDistanceKm !== "number" ||
      approvedDistanceKm < 0
    ) {
      return NextResponse.json(
        { error: "arrivedLat, arrivedLng and approvedDistanceKm are required" },
        { status: 400 }
      );
    }

    const booking = await adminPrisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        groomerMember: true,
        groomerFuelTrips: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!booking.groomerMemberId || !booking.groomerMember) {
      return NextResponse.json(
        { error: "No groomer assigned to this booking" },
        { status: 400 }
      );
    }

    // Use the groomer member's configured fuel rate (defaults to 95 if not set)
    const ratePerLitre = booking.groomerMember.fuelRatePerLitre ?? 95;

    // fromLat/Lng: prefer server-stored enRoute coords; fall back to arrived coords
    const fromLat = booking.enRouteLat ?? arrivedLat;
    const fromLng = booking.enRouteLng ?? arrivedLng;

    // Get Maps API distance for audit record (best-effort, non-blocking)
    let mapsDistanceKm: number | null = null;
    let distanceSource = "manual";
    try {
      if (booking.enRouteLat && booking.enRouteLng) {
        const result = await calculateRoadDistanceKm(
          booking.enRouteLat,
          booking.enRouteLng,
          arrivedLat,
          arrivedLng
        );
        mapsDistanceKm = result.distanceKm;
        distanceSource = result.source;
      }
    } catch {
      // non-fatal
    }

    const { litres, fuelCost } = calculateFuelCost(
      approvedDistanceKm,
      ratePerLitre,
      KM_PER_LITRE
    );

    // Upsert — one fuel trip per booking (unique constraint in schema)
    const existingTrip = booking.groomerFuelTrips?.[0];

    const fuelTrip = existingTrip
      ? await adminPrisma.groomerFuelTrip.update({
          where: { id: existingTrip.id },
          data: {
            fromLat,
            fromLng,
            toLat: arrivedLat,
            toLng: arrivedLng,
            distanceKm: approvedDistanceKm,
            originalDistanceKm: mapsDistanceKm ?? approvedDistanceKm,
            litres,
            ratePerLitre,
            fuelCost,
            isEstimate: distanceSource !== "maps_api",
            isManuallyAdjusted: mapsDistanceKm !== null && Math.abs(approvedDistanceKm - mapsDistanceKm) > 0.5,
          },
        })
      : await adminPrisma.groomerFuelTrip.create({
          data: {
            bookingId,
            groomerMemberId: booking.groomerMemberId,
            fromType: "booking_departure",
            fromBookingId: bookingId,
            fromLat,
            fromLng,
            toLat: arrivedLat,
            toLng: arrivedLng,
            distanceKm: approvedDistanceKm,
            originalDistanceKm: mapsDistanceKm ?? approvedDistanceKm,
            roadMultiplier: 1.3,
            litres,
            ratePerLitre,
            fuelCost,
            isEstimate: distanceSource !== "maps_api",
            isManuallyAdjusted: mapsDistanceKm !== null && Math.abs(approvedDistanceKm - mapsDistanceKm) > 0.5,
          },
        });

    // Save arrived GPS to booking
    await adminPrisma.booking.update({
      where: { id: bookingId },
      data: { dispatchState: "started" },
    });

    return NextResponse.json({
      success: true,
      fuelTripId: fuelTrip.id,
      distanceKm: approvedDistanceKm,
      mapsDistanceKm,
      distanceSource,
      fuelCost,
      litres,
      ratePerLitre,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save fuel trip" },
      { status: 500 }
    );
  }
}
