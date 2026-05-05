import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getIstMonthBucket } from "../../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type Decision = "approve" | "reject";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const decision = body.decision as Decision;
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json({ error: "decision must be approve | reject" }, { status: 400 });
    }
    if (decision === "reject" && !reviewNote) {
      return NextResponse.json({ error: "Rejection note is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.groomerFuelTrip.findUnique({ where: { id } });
      if (!trip) {
        throw Object.assign(new Error("Fuel trip not found"), { httpStatus: 404 });
      }
      if (trip.adjustmentRequestStatus !== "pending") {
        throw Object.assign(
          new Error("This adjustment is not pending review"),
          { httpStatus: 409 }
        );
      }

      if (decision === "reject") {
        const updated = await tx.groomerFuelTrip.update({
          where: { id },
          data: {
            adjustmentRequestStatus: "rejected",
            adjustmentReviewedBy: "admin",
            adjustmentReviewedAt: new Date(),
            adjustmentReviewNote: reviewNote,
          },
        });
        return { trip: updated, ledgerUpdated: false };
      }

      // Approve: apply the requested distance, recompute litres + cost, update ledger
      const requestedDistanceKm = trip.requestedDistanceKm ?? trip.distanceKm;
      const ratePerLitre = trip.ratePerLitre;
      const bikeAverage = trip.litres > 0 && trip.distanceKm > 0
        ? trip.distanceKm / trip.litres
        : 35;
      const newLitres = Math.round((requestedDistanceKm / Math.max(1, bikeAverage)) * 1000) / 1000;
      const newFuelCost = Math.round(newLitres * ratePerLitre);

      const updated = await tx.groomerFuelTrip.update({
        where: { id },
        data: {
          distanceKm: requestedDistanceKm,
          litres: newLitres,
          fuelCost: newFuelCost,
          isManuallyAdjusted: true,
          originalDistanceKm: trip.originalDistanceKm ?? trip.distanceKm,
          originalFuelCost: trip.originalFuelCost ?? trip.fuelCost,
          adjustmentReason: trip.requestedReason,
          adjustmentRequestStatus: "approved",
          adjustmentReviewedBy: "admin",
          adjustmentReviewedAt: new Date(),
          adjustmentReviewNote: reviewNote || null,
        },
      });

      await tx.groomerLedgerEntry.updateMany({
        where: {
          sourceType: "GroomerFuelTrip",
          sourceId: updated.id,
          type: "reimbursement_fuel",
        },
        data: {
          amount: updated.fuelCost,
          monthBucket: getIstMonthBucket(updated.calculatedAt),
          description: `Adjusted fuel for booking ${updated.bookingId}`,
          metadataJson: JSON.stringify({
            bookingId: updated.bookingId,
            distanceKm: updated.distanceKm,
            litres: updated.litres,
            ratePerLitre: updated.ratePerLitre,
            isEstimate: true,
            isManuallyAdjusted: true,
            adjustmentReason: updated.adjustmentReason,
            approvedFromGroomerRequest: true,
          }),
        },
      });

      return { trip: updated, ledgerUpdated: true };
    });

    return NextResponse.json({
      success: true,
      decision,
      trip: {
        id: result.trip.id,
        adjustmentRequestStatus: result.trip.adjustmentRequestStatus,
        distanceKm: result.trip.distanceKm,
        fuelCost: result.trip.fuelCost,
        litres: result.trip.litres,
        adjustmentReviewedAt: result.trip.adjustmentReviewedAt?.toISOString() ?? null,
        adjustmentReviewNote: result.trip.adjustmentReviewNote,
      },
      ledgerUpdated: result.ledgerUpdated,
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    console.error("PATCH /api/admin/finance/fuel-adjustments/:id failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to review adjustment" },
      { status: 500 }
    );
  }
}
