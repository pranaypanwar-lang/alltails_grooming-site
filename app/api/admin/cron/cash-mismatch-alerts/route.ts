import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminPrisma } from "../../_lib/bookingAdmin";
import { sendAdminTelegramMessage } from "../../../../../lib/telegram/send";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";

  // All collections with a mismatch flag
  const mismatches = await adminPrisma.bookingPaymentCollection.findMany({
    where: { mismatchFlag: true },
    include: {
      booking: {
        select: {
          id: true,
          groomerMemberId: true,
          selectedDate: true,
          user: { select: { name: true } },
          groomerMember: { select: { name: true } },
        },
      },
    },
  });

  if (mismatches.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 });
  }

  // De-duplicate: only alert once per collection (reuse PaymentAlertSent with type "cash_mismatch")
  const alreadyAlerted = await adminPrisma.paymentAlertSent.findMany({
    where: {
      bookingId: { in: mismatches.map((m) => m.bookingId) },
      alertType: "cash_mismatch",
    },
    select: { bookingId: true },
  });
  const alertedIds = new Set(alreadyAlerted.map((a) => a.bookingId));

  let sent = 0;
  for (const m of mismatches) {
    if (alertedIds.has(m.bookingId)) continue;

    const diff = m.collectedAmount - m.expectedAmount;
    const direction = diff > 0 ? `over by INR ${diff}` : `short by INR ${Math.abs(diff)}`;
    const groomerName = m.booking.groomerMember?.name ?? "Unknown groomer";
    const customerName = m.booking.user?.name ?? "Unknown customer";

    const lines = [
      "Cash Collection Mismatch",
      "",
      `Groomer:   ${groomerName}`,
      `Customer:  ${customerName}`,
      `Date:      ${m.booking.selectedDate ?? "—"}`,
      `Collected: INR ${m.collectedAmount}`,
      `Expected:  INR ${m.expectedAmount}`,
      `Diff:      ${direction}`,
      m.notes ? `Notes:     ${m.notes}` : "",
      "",
      `Review: ${appUrl}/admin/finance`,
    ].filter((l) => l !== "").join("\n");

    const result = await sendAdminTelegramMessage(lines, { parseMode: null }).catch(() => null);
    if (result?.sent) {
      await adminPrisma.paymentAlertSent.create({
        data: { bookingId: m.bookingId, alertType: "cash_mismatch" },
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, checked: mismatches.length, sent });
}
