import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { listPublicCoupons } from "../../../../lib/coupons/service";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceName = searchParams.get("serviceName")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const paymentMethod =
      searchParams.get("paymentMethod") === "pay_after_service"
        ? "pay_after_service"
        : "pay_now";
    const petCount = Math.max(1, Number(searchParams.get("petCount") || "1"));

    const coupons = await listPublicCoupons(prisma, {
      serviceName,
      city,
      paymentMethod,
      petCount,
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("GET /api/booking/coupons failed", error);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}
