import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { evaluateCoupons } from "../../../../../lib/coupons/service";

export const runtime = "nodejs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const serviceName = String(body.serviceName ?? "").trim();
    const city = String(body.city ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const paymentMethod =
      body.paymentMethod === "pay_after_service" ? "pay_after_service" : "pay_now";
    const petCount = Math.max(1, Number(body.petCount || "1"));
    const originalAmount = Math.max(0, Math.round(Number(body.originalAmount || 0)));
    const rawCouponCode = String(body.couponCode ?? "").trim();

    if (!serviceName || !city || !originalAmount) {
      return NextResponse.json(
        { error: "Service, city, and original amount are required." },
        { status: 400 }
      );
    }

    const evaluation = await evaluateCoupons(prisma, {
      rawCouponCode,
      serviceName,
      city,
      petCount,
      paymentMethod,
      baseAmount: originalAmount,
      phone: phone || null,
    });

    if (!evaluation.ok) {
      return NextResponse.json({
        valid: false,
        originalAmount,
        finalAmount: originalAmount,
        totalDiscount: 0,
        appliedCoupons: [],
        normalizedCouponCode: evaluation.serializedCouponCodes,
        error: evaluation.error,
      });
    }

    return NextResponse.json({
      valid: true,
      originalAmount,
      finalAmount: evaluation.finalAmount,
      totalDiscount: evaluation.totalDiscount,
      appliedCoupons: evaluation.appliedCoupons,
      normalizedCouponCode: evaluation.serializedCouponCodes,
      error: null,
    });
  } catch (error) {
    console.error("POST /api/booking/coupons/preview failed", error);
    return NextResponse.json({ error: "Failed to preview coupons" }, { status: 500 });
  }
}
