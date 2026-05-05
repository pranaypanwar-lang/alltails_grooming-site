import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../../_lib/assertAdmin";
import { normalizeLatitude, normalizeLongitude, normalizeOptionalText } from "../../../../../../../lib/booking/addressCapture";

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
    const baseSalary = Number(body.baseSalary ?? 0);
    const salaryEffectiveFromMonth =
      typeof body.salaryEffectiveFromMonth === "string" && /^\d{4}-\d{2}$/.test(body.salaryEffectiveFromMonth.trim())
        ? body.salaryEffectiveFromMonth.trim()
        : null;
    const homeAddress = normalizeOptionalText(body.homeAddress);
    const homeLat = body.homeLat === null || body.homeLat === "" ? null : normalizeLatitude(body.homeLat);
    const homeLng = body.homeLng === null || body.homeLng === "" ? null : normalizeLongitude(body.homeLng);
    const bikeAverageKmPerLitre = Number(body.bikeAverageKmPerLitre ?? 35);
    const fuelRatePerLitre = Number(body.fuelRatePerLitre ?? 95);

    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      return NextResponse.json({ error: "Base salary must be a non-negative number" }, { status: 400 });
    }
    if (!Number.isFinite(bikeAverageKmPerLitre) || bikeAverageKmPerLitre <= 0) {
      return NextResponse.json({ error: "Bike average must be greater than zero" }, { status: 400 });
    }
    if (!Number.isFinite(fuelRatePerLitre) || fuelRatePerLitre < 0) {
      return NextResponse.json({ error: "Fuel rate must be valid" }, { status: 400 });
    }

    const updated = await prisma.teamMember.update({
      where: { id },
      data: {
        baseSalary: Math.round(baseSalary),
        salaryEffectiveFromMonth,
        homeAddress,
        homeLat,
        homeLng,
        bikeAverageKmPerLitre,
        fuelRatePerLitre,
      },
      select: {
        id: true,
        name: true,
        baseSalary: true,
        salaryEffectiveFromMonth: true,
        homeAddress: true,
        homeLat: true,
        homeLng: true,
        bikeAverageKmPerLitre: true,
        fuelRatePerLitre: true,
      },
    });

    return NextResponse.json({ success: true, groomer: updated });
  } catch (error) {
    console.error("PATCH /api/admin/finance/groomers/:id/settings failed", error);
    return NextResponse.json({ error: "Failed to update groomer finance settings" }, { status: 500 });
  }
}
