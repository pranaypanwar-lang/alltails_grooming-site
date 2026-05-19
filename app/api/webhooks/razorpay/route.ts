import crypto from "crypto";
import { NextResponse } from "next/server";
import { adminPrisma, logAdminBookingEvent } from "../../admin/_lib/bookingAdmin";
import {
  prepareCustomerMessageForBooking,
  supersedeQueuedBookingLifecycleMessages,
} from "../../../../lib/customerMessaging/service";
import { processQueuedCustomerMessages } from "../../../../lib/customerMessaging/provider";
import { settleRazorpayBookingPayment } from "../../../../lib/payment/settleRazorpayBooking";
import { sendNewBookingAdminAlert } from "../../../../lib/telegram/newBookingAlerts";
import { sendAdminTelegramMessage } from "../../../../lib/telegram/send";

export const runtime = "nodejs";

function getWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
}

function hasValidWebhookSignature(body: string, signature: string | null) {
  const secret = getWebhookSecret();
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

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

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!getWebhookSecret()) {
    return NextResponse.json({ error: "Razorpay webhook secret is not configured" }, { status: 503 });
  }

  if (!hasValidWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid Razorpay webhook signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    const payment = event?.payload?.payment?.entity;

    if (!payment?.id || !payment?.order_id) {
      return NextResponse.json({ success: true, ignored: "missing_payment_entity" });
    }

    // Handle payment failure — alert ops on Telegram for recovery
    if (payment.status === "failed") {
      const failedBooking = await adminPrisma.booking.findFirst({
        where: { razorpayOrderId: String(payment.order_id) },
        include: {
          user: true,
          service: true,
          pets: { include: { pet: true } },
          slots: {
            take: 1,
            orderBy: { slot: { startTime: "asc" } },
            include: { slot: { include: { team: true } } },
          },
        },
      });

      if (failedBooking) {
        const pet = failedBooking.pets[0]?.pet;
        const slot = failedBooking.slots[0]?.slot;
        const errorDesc = (payment.error_description ?? payment.error_code ?? "unknown reason").replace(/_/g, " ");
        const lines = [
          "Payment Failed",
          "",
          `Customer: ${failedBooking.user.name} · ${failedBooking.user.phone}`,
          `Pet: ${pet ? `${pet.name ?? "Unnamed"} (${pet.breed})` : "No pet listed"}`,
          `Service: ${failedBooking.service.name} · INR ${failedBooking.finalAmount}`,
          `Slot: ${slot ? `${failedBooking.selectedDate ?? "TBD"} · ${slot.team?.name ?? "No team"}` : "TBD"}`,
          `Reason: ${errorDesc}`,
          `Razorpay ref: ${payment.id}`,
          "",
          `Call to recover? Admin: ${process.env.NEXT_PUBLIC_APP_URL?.trim() ?? ""}/admin/customers/${failedBooking.userId}`,
        ];
        await sendAdminTelegramMessage(lines.join("\n"), { parseMode: null }).catch(() => null);
      }

      return NextResponse.json({ success: true, handled: "payment_failed_alert" });
    }

    if (payment.status !== "captured" && payment.captured !== true) {
      return NextResponse.json({ success: true, ignored: `payment_${payment.status ?? "not_captured"}` });
    }

    const settlement = await adminPrisma.$transaction((tx) =>
      settleRazorpayBookingPayment(tx, {
        razorpayOrderId: String(payment.order_id),
        razorpayPaymentId: String(payment.id),
        source: "webhook",
      })
    );

    if (!settlement.alreadySettled) {
      await sendSettlementMessages(settlement.booking.id);
      await logAdminBookingEvent({
        bookingId: settlement.booking.id,
        type: "payment_reconciled",
        summary: "Razorpay webhook confirmed captured payment",
        metadata: {
          source: "razorpay_webhook",
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
          restoredSlotIds: settlement.restoredSlotIds,
          conflictedSlotIds: settlement.conflictedSlotIds,
        },
      });
      await sendNewBookingAdminAlert({
        prisma: adminPrisma,
        bookingId: settlement.booking.id,
        sourceLabel: settlement.conflictedSlotIds.length
          ? "razorpay webhook payment - slot conflict"
          : "razorpay webhook payment",
      });
    }

    return NextResponse.json({
      success: true,
      bookingId: settlement.booking.id,
      alreadySettled: settlement.alreadySettled,
      restoredSlotIds: settlement.restoredSlotIds,
      conflictedSlotIds: settlement.conflictedSlotIds,
    });
  } catch (error) {
    console.error("Razorpay webhook handling failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Razorpay webhook" },
      { status: error instanceof Error && "httpStatus" in error ? (error as Error & { httpStatus: number }).httpStatus : 500 }
    );
  }
}
