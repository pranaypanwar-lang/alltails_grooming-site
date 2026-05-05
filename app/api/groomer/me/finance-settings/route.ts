import { NextResponse } from "next/server";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { normalizeLatitude, normalizeLongitude, normalizeOptionalText } from "../../../../../lib/booking/addressCapture";

export const runtime = "nodejs";

export async function GET() {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    return NextResponse.json({
      success: true,
      settings: {
        homeAddress: member.homeAddress ?? "",
        homeLat: member.homeLat,
        homeLng: member.homeLng,
        bikeAverageKmPerLitre: member.bikeAverageKmPerLitre,
        fuelRatePerLitre: member.fuelRatePerLitre,
      },
    });
  } catch (error) {
    console.error("GET /api/groomer/me/finance-settings failed", error);
    return NextResponse.json({ error: "Failed to load finance settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const homeAddress = normalizeOptionalText(body.homeAddress);
    const homeLat = normalizeLatitude(body.homeLat);
    const homeLng = normalizeLongitude(body.homeLng);
    const bikeAverageKmPerLitre = Number(body.bikeAverageKmPerLitre ?? member.bikeAverageKmPerLitre);
    const fuelRatePerLitre = Number(body.fuelRatePerLitre ?? member.fuelRatePerLitre);

    if (homeLat === null || homeLng === null) {
      return NextResponse.json({ error: "Home latitude and longitude are required" }, { status: 400 });
    }
    if (!Number.isFinite(bikeAverageKmPerLitre) || bikeAverageKmPerLitre <= 0) {
      return NextResponse.json({ error: "Bike average must be greater than zero" }, { status: 400 });
    }
    if (!Number.isFinite(fuelRatePerLitre) || fuelRatePerLitre < 0) {
      return NextResponse.json({ error: "Fuel rate must be valid" }, { status: 400 });
    }

    const updated = await adminPrisma.teamMember.update({
      where: { id: member.id },
      data: {
        homeAddress,
        homeLat,
        homeLng,
        bikeAverageKmPerLitre,
        fuelRatePerLitre,
      },
      select: {
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        bikeAverageKmPerLitre: true,
        fuelRatePerLitre: true,
      },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("PATCH /api/groomer/me/finance-settings failed", error);
    return NextResponse.json({ error: "Failed to save finance settings" }, { status: 500 });
  }
}
