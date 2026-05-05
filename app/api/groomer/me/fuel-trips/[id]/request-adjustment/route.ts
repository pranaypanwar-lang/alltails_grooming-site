import { NextResponse } from "next/server";
import { getGroomerSessionMember } from "../../../../../../../lib/auth/groomerSession";
import { adminPrisma } from "../../../../../admin/_lib/bookingAdmin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const requestedDistanceKm = Number(body.requestedDistanceKm);
    const requestedReason = typeof body.requestedReason === "string" ? body.requestedReason.trim() : "";

    if (!Number.isFinite(requestedDistanceKm) || requestedDistanceKm <= 0) {
      return NextResponse.json({ error: "Distance must be greater than zero" }, { status: 400 });
    }
    if (requestedReason.length < 5) {
      return NextResponse.json({ error: "Please provide a short reason (5+ characters)" }, { status: 400 });
    }
    if (requestedDistanceKm > 500) {
      return NextResponse.json({ error: "Distance looks unreasonable. Contact admin if it's actually correct." }, { status: 400 });
    }

    const trip = await adminPrisma.groomerFuelTrip.findUnique({ where: { id } });
    if (!trip) return NextResponse.json({ error: "Fuel trip not found" }, { status: 404 });
    if (trip.groomerMemberId !== member.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (trip.adjustmentRequestStatus === "pending") {
      return NextResponse.json(
        { error: "An adjustment request is already pending review for this trip." },
        { status: 409 }
      );
    }

    const updated = await adminPrisma.groomerFuelTrip.update({
      where: { id },
      data: {
        adjustmentRequestStatus: "pending",
        requestedDistanceKm,
        requestedReason,
        requestedAt: new Date(),
        // Clear any previous review fields so the queue shows a fresh request
        adjustmentReviewedBy: null,
        adjustmentReviewedAt: null,
        adjustmentReviewNote: null,
      },
    });

    return NextResponse.json({
      success: true,
      trip: {
        id: updated.id,
        adjustmentRequestStatus: updated.adjustmentRequestStatus,
        requestedDistanceKm: updated.requestedDistanceKm,
        requestedReason: updated.requestedReason,
        requestedAt: updated.requestedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("POST /api/groomer/me/fuel-trips/:id/request-adjustment failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit adjustment request" },
      { status: 500 }
    );
  }
}
