import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getIstMonthBucket } from "../../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const distanceKm = Number(body.distanceKm);
    const fuelCost = Number(body.fuelCost);
    const adjustmentReason = typeof body.adjustmentReason === "string" ? body.adjustmentReason.trim() : "";

    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      return NextResponse.json({ error: "Distance must be greater than zero" }, { status: 400 });
    }
    if (!Number.isFinite(fuelCost) || fuelCost < 0) {
      return NextResponse.json({ error: "Fuel cost must be valid" }, { status: 400 });
    }
    if (!adjustmentReason) {
      return NextResponse.json({ error: "Adjustment reason is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.groomerFuelTrip.findUnique({
        where: { id },
      });
      if (!existing) {
        throw Object.assign(new Error("Fuel trip not found"), { httpStatus: 404 });
      }

      const litres = existing.ratePerLitre > 0 ? Math.round((fuelCost / existing.ratePerLitre) * 1000) / 1000 : existing.litres;
      const updated = await tx.groomerFuelTrip.update({
        where: { id },
        data: {
          distanceKm,
          fuelCost: Math.round(fuelCost),
          litres,
          isManuallyAdjusted: true,
          originalDistanceKm: existing.originalDistanceKm ?? existing.distanceKm,
          originalFuelCost: existing.originalFuelCost ?? existing.fuelCost,
          adjustmentReason,
        },
      });

      const ledgerEntry = await tx.groomerLedgerEntry.updateMany({
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
            adjustmentReason,
          }),
        },
      });

      return { updated, ledgerEntry };
    });

    return NextResponse.json({
      success: true,
      fuelTrip: {
        id: result.updated.id,
        distanceKm: result.updated.distanceKm,
        litres: result.updated.litres,
        fuelCost: result.updated.fuelCost,
        isManuallyAdjusted: result.updated.isManuallyAdjusted,
        adjustmentReason: result.updated.adjustmentReason,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    console.error("PATCH /api/admin/finance/fuel-trips/:id failed", error);
    return NextResponse.json({ error: "Failed to adjust fuel trip" }, { status: 500 });
  }
}
