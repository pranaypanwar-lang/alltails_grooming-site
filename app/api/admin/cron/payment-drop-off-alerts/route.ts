import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminPrisma } from "../../_lib/bookingAdmin";
import { sendAdminTelegramMessage } from "../../../../../lib/telegram/send";

export const runtime = "nodejs";

// Slot holds about to expire with no Razorpay order created = drop-off
// Stuck payment = paid but booking still pending > 5 min
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  // Alert A: slot held, no Razorpay order, about to expire (< 5 min left)
  const dropOffBookings = await adminPrisma.booking.findMany({
    where: {
      status: "pending_payment",
      razorpayOrderId: null,
      slots: {
        some: {
          slot: {
            isHeld: true,
            holdExpiresAt: { gte: now, lte: new Date(now.getTime() + 5 * 60 * 1000) },
          },
        },
      },
    },
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

  // Alert B: payment captured but booking still pending > 5 min (settlement failure)
  const stuckPayments = await adminPrisma.booking.findMany({
    where: {
      status: "pending_payment",
      paymentStatus: "paid",
      updatedAt: { lte: fiveMinAgo },
    },
    include: {
      user: true,
      service: true,
    },
  });

  // De-duplicate: only send each alert once per booking
  const alreadyAlertedDropOff = await adminPrisma.paymentAlertSent.findMany({
    where: {
      bookingId: { in: dropOffBookings.map((b) => b.id) },
      alertType: "drop_off",
    },
    select: { bookingId: true },
  });
  const alreadyAlertedSettlement = await adminPrisma.paymentAlertSent.findMany({
    where: {
      bookingId: { in: stuckPayments.map((b) => b.id) },
      alertType: "settlement_failure",
    },
    select: { bookingId: true },
  });

  const alertedDropOffIds = new Set(alreadyAlertedDropOff.map((a) => a.bookingId));
  const alertedSettlementIds = new Set(alreadyAlertedSettlement.map((a) => a.bookingId));

  let dropOffSent = 0;
  let settlementSent = 0;

  for (const booking of dropOffBookings) {
    if (alertedDropOffIds.has(booking.id)) continue;

    const pet = booking.pets[0]?.pet;
    const slot = booking.slots[0]?.slot;
    const holdExpiry = slot?.holdExpiresAt;
    const minsLeft = holdExpiry
      ? Math.round((new Date(holdExpiry).getTime() - now.getTime()) / 60000)
      : null;

    const lines = [
      "Booking Abandoned — Slot Expiring",
      "",
      `Customer: ${booking.user.name} · ${booking.user.phone}`,
      `Pet: ${pet ? `${pet.name ?? "Unnamed"} (${pet.breed})` : "No pet listed"}`,
      `Service: ${booking.service.name} · INR ${booking.finalAmount}`,
      `Slot: ${booking.selectedDate ?? "TBD"}${slot?.team ? ` · ${slot.team.name}` : ""}`,
      `No payment started. Slot expires in ~${minsLeft ?? "< 5"} min.`,
      "",
      `Call to recover: ${appUrl}/admin/customers/${booking.userId}`,
    ];

    const result = await sendAdminTelegramMessage(lines.join("\n"), { parseMode: null }).catch(() => null);
    if (result?.sent) {
      await adminPrisma.paymentAlertSent.create({
        data: { bookingId: booking.id, alertType: "drop_off" },
      });
      dropOffSent++;
    }
  }

  for (const booking of stuckPayments) {
    if (alertedSettlementIds.has(booking.id)) continue;

    const lines = [
      "Settlement Failure — Manual action needed",
      "",
      `Customer: ${booking.user.name} · ${booking.user.phone}`,
      `Service: ${booking.service.name} · INR ${booking.finalAmount}`,
      `Razorpay order: ${booking.razorpayOrderId ?? "unknown"}`,
      `Booking paid but not confirmed (5+ min) — run reconcile or check webhook`,
      "",
      `Admin: ${appUrl}/admin/bookings`,
    ];

    const result = await sendAdminTelegramMessage(lines.join("\n"), { parseMode: null }).catch(() => null);
    if (result?.sent) {
      await adminPrisma.paymentAlertSent.create({
        data: { bookingId: booking.id, alertType: "settlement_failure" },
      });
      settlementSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    dropOffChecked: dropOffBookings.length,
    dropOffSent,
    settlementChecked: stuckPayments.length,
    settlementSent,
  });
}
