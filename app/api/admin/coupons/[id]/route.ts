import { NextResponse } from "next/server";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { adminPrisma } from "../../_lib/bookingAdmin";

export const runtime = "nodejs";

function sanitizeStringArray(values: unknown) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await context.params;
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

    if (!id || !code || !title) {
      return NextResponse.json({ error: "Coupon id, code and title are required." }, { status: 400 });
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

    const coupon = await adminPrisma.coupon.update({
      where: { id },
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
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        stackable: coupon.stackable,
        firstBookingOnly: coupon.firstBookingOnly,
        applicableServiceNames: coupon.applicableServiceNames,
        applicableCities: coupon.applicableCities,
        paymentMethods: coupon.paymentMethods,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
        usageCount: coupon._count.redemptions,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/coupons/[id] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update coupon" },
      { status: 500 }
    );
  }
}
