import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export async function GET(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const statusParam = (url.searchParams.get("status") ?? "pending") as StatusFilter;
    const status: StatusFilter = ["pending", "approved", "rejected", "all"].includes(statusParam)
      ? statusParam
      : "pending";

    const trips = await prisma.groomerFuelTrip.findMany({
      where:
        status === "all"
          ? { adjustmentRequestStatus: { not: null } }
          : { adjustmentRequestStatus: status },
      orderBy: [{ adjustmentRequestStatus: "asc" }, { requestedAt: "desc" }],
      take: 200,
      include: {
        booking: {
          select: {
            id: true,
            selectedDate: true,
            serviceAddress: true,
            servicePincode: true,
            user: { select: { name: true, phone: true } },
            service: { select: { name: true } },
          },
        },
        groomerMember: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({
      success: true,
      adjustments: trips.map((trip) => ({
        id: trip.id,
        bookingId: trip.bookingId,
        bookingDate: trip.booking.selectedDate,
        bookingService: trip.booking.service?.name ?? null,
        customerName: trip.booking.user?.name ?? null,
        customerPhone: trip.booking.user?.phone ?? null,
        serviceAddress: trip.booking.serviceAddress,
        servicePincode: trip.booking.servicePincode,
        groomer: trip.groomerMember
          ? { id: trip.groomerMember.id, name: trip.groomerMember.name, phone: trip.groomerMember.phone }
          : null,
        currentDistanceKm: trip.distanceKm,
        currentFuelCost: trip.fuelCost,
        ratePerLitre: trip.ratePerLitre,
        litres: trip.litres,
        isManuallyAdjusted: trip.isManuallyAdjusted,
        originalDistanceKm: trip.originalDistanceKm,
        adjustmentRequestStatus: trip.adjustmentRequestStatus,
        requestedDistanceKm: trip.requestedDistanceKm,
        requestedReason: trip.requestedReason,
        requestedAt: trip.requestedAt?.toISOString() ?? null,
        adjustmentReviewedBy: trip.adjustmentReviewedBy,
        adjustmentReviewedAt: trip.adjustmentReviewedAt?.toISOString() ?? null,
        adjustmentReviewNote: trip.adjustmentReviewNote,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/finance/fuel-adjustments failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load fuel adjustments" },
      { status: 500 }
    );
  }
}
