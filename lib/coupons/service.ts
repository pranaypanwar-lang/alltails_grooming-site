import { Prisma, PrismaClient } from "../generated/prisma";

type PrismaDb = PrismaClient | Prisma.TransactionClient;

export type CouponDiscountType = "percent" | "flat" | "per_extra_pet_percent";

export type CouponCatalogItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  stackable: boolean;
  firstBookingOnly: boolean;
  applicableServiceNames: string[];
  applicableCities: string[];
  paymentMethods: string[];
};

export type CouponEvaluationContext = {
  rawCouponCode?: string | null;
  serviceName: string;
  city: string;
  petCount: number;
  paymentMethod: "pay_now" | "pay_after_service";
  baseAmount: number;
  userId?: string | null;
  phone?: string | null;
};

export type CouponApplication = {
  couponId: string;
  code: string;
  title: string;
  discountAmount: number;
  description: string | null;
};

export type CouponEvaluationResult =
  | {
      ok: true;
      normalizedCouponCodes: string[];
      serializedCouponCodes: string | null;
      totalDiscount: number;
      finalAmount: number;
      appliedCoupons: CouponApplication[];
      invalidCodes: [];
    }
  | {
      ok: false;
      normalizedCouponCodes: string[];
      serializedCouponCodes: string | null;
      totalDiscount: 0;
      finalAmount: number;
      appliedCoupons: [];
      invalidCodes: string[];
      error: string;
    };

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function uniq<T>(values: T[]) {
  return [...new Set(values)];
}

export function normalizeCouponCodes(rawCouponCode?: string | null) {
  if (!rawCouponCode) return [];
  return uniq(
    rawCouponCode
      .split(/[\s,]+/)
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
  );
}

export function serializeCouponCodes(codes: string[]) {
  return codes.length ? codes.join(", ") : null;
}

function couponMatchesService(coupon: CouponCatalogItem, serviceName: string) {
  if (!coupon.applicableServiceNames.length) return true;
  const serviceKey = normalizeKey(serviceName);
  return coupon.applicableServiceNames.some((name) => normalizeKey(name) === serviceKey);
}

function couponMatchesCity(coupon: CouponCatalogItem, city: string) {
  if (!coupon.applicableCities.length) return true;
  const cityKey = normalizeKey(city);
  return coupon.applicableCities.some((name) => normalizeKey(name) === cityKey);
}

function couponMatchesPaymentMethod(
  coupon: CouponCatalogItem,
  paymentMethod: CouponEvaluationContext["paymentMethod"]
) {
  if (!coupon.paymentMethods.length) return true;
  return coupon.paymentMethods.includes(paymentMethod);
}

function computeCouponDiscountAmount(
  coupon: CouponCatalogItem,
  baseAmount: number,
  petCount: number
) {
  let amount = 0;

  if (coupon.discountType === "flat") {
    amount = coupon.discountValue;
  } else if (coupon.discountType === "percent") {
    amount = Math.round((baseAmount * coupon.discountValue) / 100);
  } else if (coupon.discountType === "per_extra_pet_percent") {
    amount = Math.round((baseAmount * coupon.discountValue * petCount) / 100);
  }

  if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
    amount = Math.min(amount, coupon.maxDiscountAmount);
  }

  return Math.max(0, amount);
}

async function resolveExistingUserId(
  db: PrismaDb,
  userId?: string | null,
  phone?: string | null
) {
  if (userId) return userId;
  if (!phone?.trim()) return null;

  const existingUser = await db.user.findFirst({
    where: {
      phone: {
        endsWith: normalizePhone(phone),
      },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return existingUser?.id ?? null;
}

async function isFirstBookingEligible(
  db: PrismaDb,
  userId?: string | null,
  phone?: string | null
) {
  const resolvedUserId = await resolveExistingUserId(db, userId, phone);
  if (!resolvedUserId) return true;

  const existingBookingsCount = await db.booking.count({
    where: { userId: resolvedUserId },
  });

  return existingBookingsCount === 0;
}

function getCouponCodeErrorLabel(coupon: CouponCatalogItem) {
  return coupon.code;
}

export async function listPublicCoupons(
  db: PrismaDb,
  context: Pick<CouponEvaluationContext, "serviceName" | "city" | "petCount" | "paymentMethod">
) {
  const coupons = await db.coupon.findMany({
    where: { isActive: true },
    orderBy: [{ stackable: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      stackable: true,
      firstBookingOnly: true,
      applicableServiceNames: true,
      applicableCities: true,
      paymentMethods: true,
      maxDiscountAmount: true,
    },
  });

  return coupons
    .filter((coupon) => {
      const typedCoupon = coupon as CouponCatalogItem & { maxDiscountAmount?: number | null };
      if (!couponMatchesPaymentMethod(typedCoupon, context.paymentMethod)) return false;
      if (!couponMatchesService(typedCoupon, context.serviceName)) return false;
      if (!couponMatchesCity(typedCoupon, context.city)) return false;
      if (typedCoupon.discountType === "per_extra_pet_percent" && context.petCount < 2) return false;
      return true;
    })
    .map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: coupon.discountValue,
      stackable: coupon.stackable,
      firstBookingOnly: coupon.firstBookingOnly,
      applicableServiceNames: coupon.applicableServiceNames,
      applicableCities: coupon.applicableCities,
      paymentMethods: coupon.paymentMethods,
    }));
}

export async function evaluateCoupons(
  db: PrismaDb,
  context: CouponEvaluationContext
): Promise<CouponEvaluationResult> {
  const normalizedCouponCodes = normalizeCouponCodes(context.rawCouponCode);
  const serializedCouponCodes = serializeCouponCodes(normalizedCouponCodes);

  if (context.paymentMethod !== "pay_now" || normalizedCouponCodes.length === 0) {
    return {
      ok: true,
      normalizedCouponCodes: [],
      serializedCouponCodes: null,
      totalDiscount: 0,
      finalAmount: context.baseAmount,
      appliedCoupons: [],
      invalidCodes: [],
    };
  }

  const foundCoupons = await db.coupon.findMany({
    where: {
      isActive: true,
      code: { in: normalizedCouponCodes },
    },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      discountType: true,
      discountValue: true,
      maxDiscountAmount: true,
      stackable: true,
      firstBookingOnly: true,
      applicableServiceNames: true,
      applicableCities: true,
      paymentMethods: true,
    },
  });

  const couponMap = new Map(
    foundCoupons.map((coupon) => [
      coupon.code,
      {
        ...coupon,
        discountType: coupon.discountType as CouponDiscountType,
      },
    ])
  );

  const invalidCodes = normalizedCouponCodes.filter((code) => !couponMap.has(code));
  if (invalidCodes.length > 0) {
    return {
      ok: false,
      normalizedCouponCodes,
      serializedCouponCodes,
      totalDiscount: 0,
      finalAmount: context.baseAmount,
      appliedCoupons: [],
      invalidCodes,
      error: `Invalid or inactive coupon code: ${invalidCodes.join(", ")}`,
    };
  }

  const orderedCoupons = normalizedCouponCodes.map((code) => couponMap.get(code)!);

  if (orderedCoupons.length > 1 && orderedCoupons.some((coupon) => !coupon.stackable)) {
    const nonStackableCodes = orderedCoupons
      .filter((coupon) => !coupon.stackable)
      .map(getCouponCodeErrorLabel);
    return {
      ok: false,
      normalizedCouponCodes,
      serializedCouponCodes,
      totalDiscount: 0,
      finalAmount: context.baseAmount,
      appliedCoupons: [],
      invalidCodes: [],
      error:
        nonStackableCodes.length === 1
          ? `${nonStackableCodes[0]} cannot be clubbed with another coupon.`
          : `${nonStackableCodes.join(", ")} cannot be clubbed with another coupon.`,
    };
  }

  const firstBookingEligible = await isFirstBookingEligible(db, context.userId, context.phone);
  const appliedCoupons: CouponApplication[] = [];

  for (const coupon of orderedCoupons) {
    if (!couponMatchesPaymentMethod(coupon, context.paymentMethod)) {
      return {
        ok: false,
        normalizedCouponCodes,
        serializedCouponCodes,
        totalDiscount: 0,
        finalAmount: context.baseAmount,
        appliedCoupons: [],
        invalidCodes: [],
        error: `${coupon.code} is not available for this payment method.`,
      };
    }

    if (!couponMatchesService(coupon, context.serviceName)) {
      return {
        ok: false,
        normalizedCouponCodes,
        serializedCouponCodes,
        totalDiscount: 0,
        finalAmount: context.baseAmount,
        appliedCoupons: [],
        invalidCodes: [],
        error: `${coupon.code} is not valid for ${context.serviceName}.`,
      };
    }

    if (!couponMatchesCity(coupon, context.city)) {
      return {
        ok: false,
        normalizedCouponCodes,
        serializedCouponCodes,
        totalDiscount: 0,
        finalAmount: context.baseAmount,
        appliedCoupons: [],
        invalidCodes: [],
        error: `${coupon.code} is not valid in ${context.city}.`,
      };
    }

    if (coupon.firstBookingOnly && !firstBookingEligible) {
      return {
        ok: false,
        normalizedCouponCodes,
        serializedCouponCodes,
        totalDiscount: 0,
        finalAmount: context.baseAmount,
        appliedCoupons: [],
        invalidCodes: [],
        error: `${coupon.code} is only valid for a first booking.`,
      };
    }

    if (coupon.discountType === "per_extra_pet_percent" && context.petCount < 2) {
      return {
        ok: false,
        normalizedCouponCodes,
        serializedCouponCodes,
        totalDiscount: 0,
        finalAmount: context.baseAmount,
        appliedCoupons: [],
        invalidCodes: [],
        error: `${coupon.code} needs at least 2 pets in the booking.`,
      };
    }

    const discountAmount = computeCouponDiscountAmount(coupon, context.baseAmount, context.petCount);
    if (discountAmount <= 0) {
      continue;
    }

    appliedCoupons.push({
      couponId: coupon.id,
      code: coupon.code,
      title: coupon.title,
      discountAmount,
      description: coupon.description,
    });
  }

  const totalDiscount = Math.min(
    context.baseAmount,
    appliedCoupons.reduce((sum, coupon) => sum + coupon.discountAmount, 0)
  );

  return {
    ok: true,
    normalizedCouponCodes,
    serializedCouponCodes,
    totalDiscount,
    finalAmount: Math.max(0, context.baseAmount - totalDiscount),
    appliedCoupons,
    invalidCodes: [],
  };
}
