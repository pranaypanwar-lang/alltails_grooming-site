import { NextResponse } from "next/server";
import { assertAdminSession } from "../_lib/assertAdmin";
import { adminPrisma } from "../_lib/bookingAdmin";

export const runtime = "nodejs";

function sanitizeStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const coupons = await adminPrisma.coupon.findMany({
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return NextResponse.json({
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description ?? null,
        isActive: coupon.isActive,
        discountType: coupon.discountType as "percent" | "flat" | "per_extra_pet_percent",
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        stackable: coupon.stackable,
        firstBookingOnly: coupon.firstBookingOnly,
        applicableServiceNames: coupon.applicableServiceNames,
        applicableCities: coupon.applicableCities,
        paymentMethods: coupon.paymentMethods as Array<"pay_now" | "pay_after_service">,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
        usageCount: coupon._count.redemptions,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/coupons failed", error);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const isActive = Boolean(body.isActive);
    const discountType = String(body.discountType ?? "").trim();
    const discountValue = Number(body.discountValue);
    const maxDiscountAmount =
      body.maxDiscountAmount === null || body.maxDiscountAmount === undefined || body.maxDiscountAmount === ""
        ? null
        : Number(body.maxDiscountAmount);
    const stackable = Boolean(body.stackable);
    const firstBookingOnly = Boolean(body.firstBookingOnly);
    const applicableServiceNames = sanitizeStringArray(body.applicableServiceNames);
    const applicableCities = sanitizeStringArray(body.applicableCities);
    const paymentMethods = sanitizeStringArray(body.paymentMethods).filter((method) =>
      ["pay_now", "pay_after_service"].includes(method)
    );

    if (!code || !title) {
      return NextResponse.json({ error: "Coupon code and title are required." }, { status: 400 });
    }

    if (!["percent", "flat", "per_extra_pet_percent"].includes(discountType)) {
      return NextResponse.json({ error: "Invalid discount type." }, { status: 400 });
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0." }, { status: 400 });
    }

    if (maxDiscountAmount !== null && (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount <= 0)) {
      return NextResponse.json({ error: "Max discount amount must be greater than 0." }, { status: 400 });
    }

    const coupon = await adminPrisma.coupon.create({
      data: {
        code,
        title,
        description: description || null,
        isActive,
        discountType,
        discountValue: Math.round(discountValue),
        maxDiscountAmount: maxDiscountAmount === null ? null : Math.round(maxDiscountAmount),
        stackable,
        firstBookingOnly,
        applicableServiceNames,
        applicableCities,
        paymentMethods,
      },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description ?? null,
        isActive: coupon.isActive,
        discountType: coupon.discountType as "percent" | "flat" | "per_extra_pet_percent",
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        stackable: coupon.stackable,
        firstBookingOnly: coupon.firstBookingOnly,
        applicableServiceNames: coupon.applicableServiceNames,
        applicableCities: coupon.applicableCities,
        paymentMethods: coupon.paymentMethods as Array<"pay_now" | "pay_after_service">,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
        usageCount: coupon._count.redemptions,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/coupons failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create coupon" },
      { status: 500 }
    );
  }
}
