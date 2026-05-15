import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { adminPrisma, logAdminBookingEvent } from "../../_lib/bookingAdmin";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../../lib/customerMessaging/provider";
import { settleRazorpayBookingPayment } from "../../../../../lib/payment/settleRazorpayBooking";
import { sendNewBookingAdminAlert } from "../../../../../lib/telegram/newBookingAlerts";

export const runtime = "nodejs";

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

async function sendSettlementMessages(bookingId: string) {
  await supersedeQueuedBookingLifecycleMessages(adminPrisma, bookingId, {
    keepMessageTypes: ["booking_confirmation"],
  });
  const prepared = await prepareCustomerMessageForBooking(
    adminPrisma,
    bookingId,
    "booking_confirmation",
    {
      skipIfPreparedAfter: new Date(Date.now() - 5 * 60 * 1000),
      deliveryStatus: "queued",
    }
  );
  await processQueuedCustomerMessages(adminPrisma, {
    limit: 10,
    messageIds: [prepared.message.id],
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!razorpay) {
    return NextResponse.json({ error: "Razorpay is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const lookbackDays = Math.min(Math.max(Number(url.searchParams.get("days") ?? 7), 1), 30);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  try {
    const candidates = await adminPrisma.booking.findMany({
      where: {
        createdAt: { gte: since },
        paymentMethod: { in: ["pay_now", "pay_after_service"] },
        paymentStatus: "unpaid",
        razorpayOrderId: { not: null },
        status: { in: ["pending_payment", "payment_expired"] },
      },
      select: {
        id: true,
        razorpayOrderId: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const results: Array<{
      bookingId: string;
      razorpayOrderId: string | null;
      action: "settled" | "already_settled" | "no_captured_payment" | "error";
      razorpayPaymentId?: string;
      error?: string;
      conflictedSlotIds?: string[];
    }> = [];

    for (const booking of candidates) {
      try {
        const payments = await razorpay.orders.fetchPayments(booking.razorpayOrderId!);
        const capturedPayment = (payments.items ?? []).find(
          (payment: any) => payment.status === "captured" || payment.captured === true
        );

        if (!capturedPayment?.id) {
          results.push({
            bookingId: booking.id,
            razorpayOrderId: booking.razorpayOrderId,
            action: "no_captured_payment",
          });
          continue;
        }

        const settlement = await adminPrisma.$transaction((tx) =>
          settleRazorpayBookingPayment(tx, {
            bookingId: booking.id,
            razorpayOrderId: booking.razorpayOrderId!,
            razorpayPaymentId: String(capturedPayment.id),
            source: "reconcile",
          })
        );

        if (!settlement.alreadySettled) {
          await sendSettlementMessages(settlement.booking.id);
          await logAdminBookingEvent({
            bookingId: settlement.booking.id,
            type: "payment_reconciled",
            summary: "Razorpay reconciliation confirmed captured payment",
            metadata: {
              source: "razorpay_reconcile_cron",
              razorpayOrderId: booking.razorpayOrderId,
              razorpayPaymentId: capturedPayment.id,
              restoredSlotIds: settlement.restoredSlotIds,
              conflictedSlotIds: settlement.conflictedSlotIds,
            },
          });
          await sendNewBookingAdminAlert({
            prisma: adminPrisma,
            bookingId: settlement.booking.id,
            sourceLabel: settlement.conflictedSlotIds.length
              ? "razorpay reconciliation - slot conflict"
              : "razorpay reconciliation",
          });
        }

        results.push({
          bookingId: booking.id,
          razorpayOrderId: booking.razorpayOrderId,
          action: settlement.alreadySettled ? "already_settled" : "settled",
          razorpayPaymentId: String(capturedPayment.id),
          conflictedSlotIds: settlement.conflictedSlotIds,
        });
      } catch (error) {
        results.push({
          bookingId: booking.id,
          razorpayOrderId: booking.razorpayOrderId,
          action: "error",
          error: error instanceof Error ? error.message : "Unknown reconciliation error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      checkedCount: candidates.length,
      settledCount: results.filter((result) => result.action === "settled").length,
      noCapturedPaymentCount: results.filter((result) => result.action === "no_captured_payment").length,
      errorCount: results.filter((result) => result.action === "error").length,
      results,
    });
  } catch (error) {
    console.error("Razorpay reconciliation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reconcile Razorpay payments" },
      { status: 500 }
    );
  }
}
