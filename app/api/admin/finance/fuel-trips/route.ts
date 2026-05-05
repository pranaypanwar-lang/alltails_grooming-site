import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const [fuelTrips, missingHomeGroomers] = await Promise.all([
      prisma.groomerFuelTrip.findMany({
        orderBy: { calculatedAt: "desc" },
        take: 100,
        include: {
          groomerMember: {
            select: {
              id: true,
              name: true,
              phone: true,
              team: { select: { id: true, name: true } },
            },
          },
          booking: {
            select: {
              id: true,
              selectedDate: true,
              serviceAddress: true,
              servicePincode: true,
            },
          },
        },
      }),
      prisma.teamMember.findMany({
        where: {
          isActive: true,
          OR: [{ homeLat: null }, { homeLng: null }],
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          phone: true,
          team: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        tripCount: fuelTrips.length,
        estimatedFuelCost: fuelTrips.reduce((sum, trip) => sum + trip.fuelCost, 0),
        missingHomeLocationCount: missingHomeGroomers.length,
      },
      missingHomeGroomers,
      fuelTrips: fuelTrips.map((trip) => ({
        id: trip.id,
        bookingId: trip.bookingId,
        fromType: trip.fromType,
        fromBookingId: trip.fromBookingId,
        distanceKm: trip.distanceKm,
        litres: trip.litres,
        ratePerLitre: trip.ratePerLitre,
        fuelCost: trip.fuelCost,
        isEstimate: trip.isEstimate,
        isManuallyAdjusted: trip.isManuallyAdjusted,
        adjustmentReason: trip.adjustmentReason,
        calculatedAt: trip.calculatedAt.toISOString(),
        groomer: trip.groomerMember,
        booking: trip.booking,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/finance/fuel-trips failed", error);
    return NextResponse.json({ error: "Failed to load fuel trips" }, { status: 500 });
  }
}
