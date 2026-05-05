import "dotenv/config";
import Razorpay from "razorpay";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../../lib/generated/prisma";
import { BOOKING_SOP_STEPS } from "../../../../lib/booking/sop";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const adminPrisma = new PrismaClient({ adapter });

export const adminRazorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

export function normalizeDateInput(value: string) {
  return value.trim();
}

export function makeIstDayBounds(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 330 * 60_000);
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 330 * 60_000);
  return { startOfDay, endOfDay };
}

export async function logAdminBookingEvent(input: {
  bookingId: string;
  type: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  return adminPrisma.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      actor: "admin",
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function logBookingEvent(input: {
  bookingId: string;
  type: string;
  summary: string;
  actor: string;
  metadata?: Record<string, unknown>;
}) {
  return adminPrisma.bookingEvent.create({
    data: {
      bookingId: input.bookingId,
      type: input.type,
      actor: input.actor,
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function ensureBookingSopSteps(
  tx: Prisma.TransactionClient,
  bookingId: string
) {
  await tx.bookingSopStep.createMany({
    data: BOOKING_SOP_STEPS.map((step) => ({
      bookingId,
      stepKey: step.key,
    })),
    skipDuplicates: true,
  });
}

export function getPublicAppUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export type RefundMode = "manual_refund" | "razorpay_refund" | "waived";

export type RefundOutcome = {
  refundStatus: "completed" | "failed" | "waived";
  refundMode: RefundMode;
  razorpayRefundId: string | null;
  refundAmount: number | null;
  refundedAt: Date | null;
  errorMessage: string | null;
};

/**
 * Processes a refund for a paid booking.
 *
 * razorpay_refund — calls Razorpay refund API. On failure returns refundStatus=failed
 *   so the caller can still cancel the booking and retry the refund later.
 * manual_refund — admin processes externally (UPI, bank transfer). Marked completed
 *   immediately because the admin is asserting they will/have done it.
 * waived — no refund issued (e.g. policy violation).
 */
export async function processBookingRefund(input: {
  refundMode: RefundMode;
  razorpayPaymentId: string | null;
  amount: number;
}): Promise<RefundOutcome> {
  if (input.refundMode === "waived") {
    return {
      refundStatus: "waived",
      refundMode: "waived",
      razorpayRefundId: null,
      refundAmount: 0,
      refundedAt: new Date(),
      errorMessage: null,
    };
  }

  if (input.refundMode === "manual_refund") {
    return {
      refundStatus: "completed",
      refundMode: "manual_refund",
      razorpayRefundId: null,
      refundAmount: input.amount,
      refundedAt: new Date(),
      errorMessage: null,
    };
  }

  // razorpay_refund
  if (!adminRazorpay) {
    return {
      refundStatus: "failed",
      refundMode: "razorpay_refund",
      razorpayRefundId: null,
      refundAmount: null,
      refundedAt: null,
      errorMessage: "Razorpay is not configured on this environment.",
    };
  }

  if (!input.razorpayPaymentId) {
    return {
      refundStatus: "failed",
      refundMode: "razorpay_refund",
      razorpayRefundId: null,
      refundAmount: null,
      refundedAt: null,
      errorMessage: "Booking has no Razorpay payment ID — cannot auto-refund.",
    };
  }

  try {
    const refund = await adminRazorpay.payments.refund(input.razorpayPaymentId, {
      amount: Math.round(input.amount * 100),
      speed: "normal",
    });

    return {
      refundStatus: "completed",
      refundMode: "razorpay_refund",
      razorpayRefundId: typeof refund.id === "string" ? refund.id : null,
      refundAmount: input.amount,
      refundedAt: new Date(),
      errorMessage: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "error" in error
          ? JSON.stringify((error as { error: unknown }).error)
          : "Razorpay refund failed";
    return {
      refundStatus: "failed",
      refundMode: "razorpay_refund",
      razorpayRefundId: null,
      refundAmount: null,
      refundedAt: null,
      errorMessage: message,
    };
  }
}
