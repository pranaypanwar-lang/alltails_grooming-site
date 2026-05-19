import { NextResponse } from "next/server";
import { adminPrisma } from "../_lib/bookingAdmin";
import { assertAdminSession } from "../_lib/assertAdmin";
import { calculateCashHeld } from "../../../../lib/finance/groomerLedger";
import type { DashboardSignal, DashboardResponse } from "../../../admin/types/dashboard";

export const runtime = "nodejs";

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    todayBookings,
    unassignedUrgent,
    stuckMessages,
    expiringHolds,
    issueBookings,
    incompleteSopBookings,
    groomersWithCash,
  ] = await Promise.all([
    // Today's bookings for pulse + timeline
    adminPrisma.booking.findMany({
      where: { selectedDate: todayStr },
      select: {
        id: true,
        status: true,
        dispatchState: true,
        paymentStatus: true,
        slots: {
          take: 1,
          select: { slot: { select: { startTime: true } } },
        },
      },
    }),

    // Confirmed bookings with no groomer, starting soon
    adminPrisma.booking.findMany({
      where: {
        status: "confirmed",
        groomerMemberId: null,
        slots: {
          some: {
            slot: { startTime: { lte: fourHoursFromNow, gte: now } },
          },
        },
      },
      select: { id: true, slots: { take: 1, select: { slot: { select: { startTime: true } } } } },
      take: 10,
    }),

    // Messages stuck in queued for > 2 hours
    adminPrisma.bookingCustomerMessage.findMany({
      where: { status: "queued", preparedAt: { lte: twoHoursAgo } },
      select: { id: true, bookingId: true, messageType: true },
      take: 10,
    }),

    // Slot holds expiring within 30 mins
    adminPrisma.slot.findMany({
      where: {
        isHeld: true,
        holdExpiresAt: { gte: now, lte: thirtyMinsFromNow },
      },
      select: { id: true, holdExpiresAt: true },
      take: 10,
    }),

    // Bookings stuck in issue state > 1 hour
    adminPrisma.booking.findMany({
      where: {
        status: "confirmed",
        dispatchState: "issue",
        updatedAt: { lte: oneHourAgo },
      },
      select: { id: true, updatedAt: true },
      take: 10,
    }),

    // Completed bookings with unfinished SOP steps
    adminPrisma.booking.findMany({
      where: {
        status: "completed",
        selectedDate: todayStr,
        sopSteps: { some: { status: { not: "completed" } } },
      },
      select: { id: true },
      take: 10,
    }),

    // Groomers with cash held + deposit history
    adminPrisma.teamMember.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        team: { select: { name: true } },
        cashDeposits: {
          orderBy: { depositedAt: "desc" },
          take: 1,
          select: { depositedAt: true },
        },
        ledgerEntries: {
          where: { type: { in: ["cash_collected", "cash_deposited"] } },
          select: { direction: true, amount: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Pulse stats
  const pulse = {
    confirmed: todayBookings.filter(
      (b) => b.status === "confirmed" && b.dispatchState === "unassigned"
    ).length,
    enRoute: todayBookings.filter((b) => b.dispatchState === "en_route").length,
    started: todayBookings.filter((b) => b.dispatchState === "started").length,
    completed: todayBookings.filter((b) => b.status === "completed").length,
    issues: todayBookings.filter((b) => b.dispatchState === "issue").length,
    pendingPayment: todayBookings.filter((b) => b.paymentStatus === "unpaid").length,
  };

  // Today's timeline: group bookings by start hour
  const hourCounts: Record<number, number> = {};
  for (const b of todayBookings) {
    const slot = b.slots[0]?.slot;
    if (slot) {
      const hour = new Date(slot.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    }
  }
  const todayTimeline = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourCounts[h] ?? 0,
  })).filter((_, h) => h >= 6 && h <= 22);

  // Build signals
  const signals: DashboardSignal[] = [];

  for (const b of unassignedUrgent) {
    const startTime = b.slots[0]?.slot?.startTime;
    const minsLeft = startTime
      ? Math.round((new Date(startTime).getTime() - now.getTime()) / 60000)
      : null;
    signals.push({
      id: `unassigned-${b.id}`,
      tone: "danger",
      title: "Booking has no groomer assigned",
      description: `Booking #${b.id.slice(-6).toUpperCase()} starts in ${minsLeft ? `${minsLeft} min` : "< 4 hours"} — assign now`,
      href: `/admin/dispatch?bookingId=${b.id}`,
    });
  }

  for (const m of stuckMessages) {
    signals.push({
      id: `msg-${m.id}`,
      tone: "warning",
      title: "Message stuck in queue",
      description: `${m.messageType.replace(/_/g, " ")} message queued for > 2 hours`,
      href: `/admin/messages`,
    });
  }

  if (expiringHolds.length > 0) {
    const earliest = expiringHolds[0];
    const minsLeft = earliest.holdExpiresAt
      ? Math.round((new Date(earliest.holdExpiresAt).getTime() - now.getTime()) / 60000)
      : null;
    signals.push({
      id: "expiring-holds",
      tone: "warning",
      title: `${expiringHolds.length} slot hold${expiringHolds.length > 1 ? "s" : ""} expiring soon`,
      description: `Earliest expires in ${minsLeft ?? "< 30"} min — confirm or release`,
      href: `/admin/slots`,
    });
  }

  for (const b of issueBookings) {
    signals.push({
      id: `issue-${b.id}`,
      tone: "danger",
      title: "Booking flagged as issue",
      description: `Booking #${b.id.slice(-6).toUpperCase()} has been in issue state for > 1 hour`,
      href: `/admin/dispatch?bookingId=${b.id}`,
    });
  }

  if (incompleteSopBookings.length > 0) {
    signals.push({
      id: "incomplete-sop",
      tone: "default",
      title: `${incompleteSopBookings.length} completed booking${incompleteSopBookings.length > 1 ? "s" : ""} with incomplete SOP`,
      description: "SOP checklist not fully ticked off for today's completed bookings",
      href: `/admin/qa`,
    });
  }

  // Cash position
  const cashPosition = groomersWithCash
    .map((m) => {
      const cashHeld = calculateCashHeld(m.ledgerEntries);
      if (cashHeld <= 0) return null;
      const lastDeposit = m.cashDeposits[0]?.depositedAt ?? null;
      const daysSince = lastDeposit
        ? Math.floor((now.getTime() - new Date(lastDeposit).getTime()) / (24 * 60 * 60 * 1000))
        : null;

      if (daysSince !== null && daysSince > 3) {
        signals.push({
          id: `cash-${m.id}`,
          tone: "warning",
          title: `₹${cashHeld.toLocaleString("en-IN")} cash held by ${m.name}`,
          description: `Last deposit was ${daysSince} days ago — follow up`,
          href: `/admin/finance`,
        });
      }

      return {
        id: m.id,
        name: m.name,
        team: m.team.name,
        cashHeld,
        lastDepositAt: lastDeposit ? lastDeposit.toISOString() : null,
        daysSinceLastDeposit: daysSince,
      };
    })
    .filter(Boolean) as DashboardResponse["cashPosition"];

  // Sort signals: danger first, then warning, then default
  const TONE_ORDER = { danger: 0, warning: 1, default: 2 };
  signals.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);

  return NextResponse.json({
    pulse,
    signals,
    cashPosition,
    todayTimeline,
  } satisfies DashboardResponse);
}
