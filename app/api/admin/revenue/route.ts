import { NextRequest, NextResponse } from "next/server";
import { assertAdminSession } from "../_lib/assertAdmin";
import { adminPrisma } from "../_lib/bookingAdmin";
import { SLOT_BLOCK_DEPOSIT_AMOUNT } from "../../../../lib/booking/constants";
import { calculateCashHeld } from "../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

type RevenueSnapshot = {
  total: number;
  online: number;
  cash: number;
  bookingCount: number;
};

async function getRevenueForRange(from: string, to: string): Promise<RevenueSnapshot> {
  const bookings = await adminPrisma.booking.findMany({
    where: {
      status: "completed",
      selectedDate: { gte: from, lte: to },
    },
    select: {
      finalAmount: true,
      paymentStatus: true,
      paymentMethod: true,
      paymentCollection: {
        select: { collectionMode: true, collectedAmount: true },
      },
    },
  });

  let total = 0;
  let cash = 0;

  for (const b of bookings) {
    const amount = b.finalAmount ?? 0;
    total += amount;

    if (b.paymentCollection) {
      if (b.paymentCollection.collectionMode === "cash") {
        cash += b.paymentCollection.collectedAmount;
      }
      // If deposit_paid scenario: ₹250 is online, rest may be cash
      // collectedAmount already captures only what was collected at door
    } else if (b.paymentStatus === "deposit_paid") {
      // Deposit paid online, remainder wasn't collected on record — count deposit as online only
      // cash += 0 already
    }
    // paid / covered_by_loyalty: fully online, cash += 0
  }

  const online = total - cash;

  return { total, online, cash, bookingCount: bookings.length };
}

function shiftWeek(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  const { searchParams } = request.nextUrl;
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? from;

  // Corresponding range 7 days prior
  const lastWeekFrom = shiftWeek(from, -7);
  const lastWeekTo = shiftWeek(to, -7);

  const [current, lastWeek, groomersRaw] = await Promise.all([
    getRevenueForRange(from, to),
    getRevenueForRange(lastWeekFrom, lastWeekTo),
    adminPrisma.teamMember.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        team: { select: { name: true } },
        ledgerEntries: {
          where: { type: { in: ["cash_collected", "cash_deposited"] } },
          select: { direction: true, amount: true },
        },
        cashDeposits: {
          orderBy: { depositedAt: "desc" },
          take: 1,
          select: { depositedAt: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();
  const cashHeld = groomersRaw
    .map((m) => {
      const held = calculateCashHeld(m.ledgerEntries);
      const lastDeposit = m.cashDeposits[0]?.depositedAt ?? null;
      const daysSince = lastDeposit
        ? Math.floor((now.getTime() - new Date(lastDeposit).getTime()) / 86400000)
        : null;
      return { id: m.id, name: m.name, team: m.team?.name ?? null, held, daysSince };
    })
    .filter((g) => g.held > 0);

  return NextResponse.json({
    from,
    to,
    lastWeekFrom,
    lastWeekTo,
    current,
    lastWeek,
    cashHeld,
    depositConstant: SLOT_BLOCK_DEPOSIT_AMOUNT,
  });
}
