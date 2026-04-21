import { NextResponse } from "next/server";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { adminPrisma } from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const [services, serviceAreas] = await Promise.all([
      adminPrisma.service.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true },
      }),
      adminPrisma.serviceArea.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, isActive: true },
      }),
    ]);

    return NextResponse.json({ services, serviceAreas });
  } catch (error) {
    console.error("GET /api/admin/bookings/create/meta failed", error);
    return NextResponse.json(
      { error: "Failed to load booking creation options" },
      { status: 500 }
    );
  }
}
