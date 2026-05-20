import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminPrisma } from "../../_lib/bookingAdmin";
import { sendAdminTelegramMessage } from "../../../../../lib/telegram/send";

export const runtime = "nodejs";

function inr(n: number) {
  return `INR ${Math.round(n).toLocaleString("en-IN")}`;
}
function pct(n: number, d: number) {
  return d > 0 ? `${((n / d) * 100).toFixed(0)}%` : "—";
}
function pad(s: string, len: number) {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const weekLabel = `${sevenDaysAgo.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [
    funnelGroups,
    stuckPending,
    sourceGroups,
    completedThisWeek,
    cashCollections,
    deposits,
    mismatchesThisWeek,
    completedWithFuel,
    groomers,
    sopSteps,
    fuelTrips,
  ] = await Promise.all([
    // A1: booking status counts for the week
    adminPrisma.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
    // A2: stuck in pending_payment > 2hr (not expired)
    adminPrisma.booking.findMany({
      where: { status: "pending_payment", createdAt: { lte: twoHoursAgo, gte: sevenDaysAgo } },
      select: { finalAmount: true },
    }),
    // A3: source split
    adminPrisma.booking.groupBy({
      by: ["bookingSource"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // A4: users who completed a booking this week (for repeat calc)
    adminPrisma.booking.findMany({
      where: { status: "completed", updatedAt: { gte: sevenDaysAgo } },
      select: { userId: true },
    }),
    // B1: all cash collections ever (to compute held)
    adminPrisma.bookingPaymentCollection.findMany({
      where: { collectionMode: "cash" },
      select: {
        collectedAmount: true,
        booking: { select: { groomerMemberId: true } },
      },
    }),
    // B2: all deposits ever
    adminPrisma.groomerCashDeposit.findMany({
      select: { groomerMemberId: true, amount: true, depositedAt: true },
    }),
    // B3: mismatches this week
    adminPrisma.bookingPaymentCollection.findMany({
      where: { mismatchFlag: true, recordedAt: { gte: sevenDaysAgo } },
      select: {
        collectedAmount: true,
        expectedAmount: true,
        booking: { select: { id: true, groomerMemberId: true } },
      },
    }),
    // B4: completed bookings with fuel for unit economics
    adminPrisma.booking.findMany({
      where: { status: "completed", updatedAt: { gte: sevenDaysAgo } },
      select: {
        finalAmount: true,
        groomerFuelTrips: { select: { fuelCost: true } },
      },
    }),
    // C1: active groomers
    adminPrisma.teamMember.findMany({
      where: { isActive: true },
      select: { id: true, name: true, completedCount: true },
    }),
    // C2: SOP steps for bookings this week (per groomer)
    adminPrisma.bookingSopStep.findMany({
      where: { booking: { createdAt: { gte: sevenDaysAgo } } },
      select: { status: true, booking: { select: { groomerMemberId: true } } },
    }),
    // C3: fuel trips for completed bookings this week (per groomer)
    adminPrisma.groomerFuelTrip.findMany({
      where: { booking: { status: "completed", updatedAt: { gte: sevenDaysAgo } } },
      select: { groomerMemberId: true, fuelCost: true },
    }),
  ]);

  // ── Report A: Funnel ───────────────────────────────────────────────────────
  const byStatus = Object.fromEntries(funnelGroups.map((g) => [g.status, g._count.id]));
  const totalCreated = funnelGroups.reduce((s, g) => s + g._count.id, 0);
  const confirmed = byStatus["confirmed"] ?? 0;
  const completed = byStatus["completed"] ?? 0;
  const cancelled = byStatus["cancelled"] ?? 0;
  const stuckValue = stuckPending.reduce((s, b) => s + (b.finalAmount ?? 0), 0);

  // Repeat customers this week
  const userIds = [...new Set(completedThisWeek.map((b) => b.userId))];
  let repeatCount = 0;
  if (userIds.length > 0) {
    const repeatGroups = await adminPrisma.booking.groupBy({
      by: ["userId"],
      where: { status: "completed", userId: { in: userIds } },
      _count: { id: true },
      having: { userId: { _count: { gt: 1 } } },
    });
    repeatCount = repeatGroups.length;
  }

  const sourceLines = sourceGroups
    .map((g) => `  ${pad((g.bookingSource ?? "unknown"), 14)} ${g._count.id}`)
    .join("\n");

  const reportA = [
    `📊 FUNNEL REPORT — ${weekLabel}`,
    "",
    `Created:       ${totalCreated}`,
    `Confirmed:     ${confirmed}  (${pct(confirmed, totalCreated)} of created)`,
    `Completed:     ${completed}  (${pct(completed, confirmed)} of confirmed)`,
    `Cancelled:     ${cancelled}  (${pct(cancelled, totalCreated)})`,
    `Stuck payment: ${stuckPending.length}  (> 2 hr, no confirmation)`,
    ...(stuckPending.length > 0 ? [`  ⚠️  ${inr(stuckValue)} recoverable → /admin/bookings`] : []),
    "",
    `Repeat customers this week: ${repeatCount}`,
    "",
    "SOURCE SPLIT",
    sourceLines || "  No source data",
  ].join("\n");

  // ── Report B: Cash & Margin ────────────────────────────────────────────────
  // Cash held per groomer = sum(collections) - sum(deposits)
  const collectedByGroomer = new Map<string, number>();
  for (const c of cashCollections) {
    const gId = c.booking?.groomerMemberId;
    if (!gId) continue;
    collectedByGroomer.set(gId, (collectedByGroomer.get(gId) ?? 0) + c.collectedAmount);
  }
  const depositedByGroomer = new Map<string, number>();
  const lastDepositByGroomer = new Map<string, Date>();
  for (const d of deposits) {
    depositedByGroomer.set(d.groomerMemberId, (depositedByGroomer.get(d.groomerMemberId) ?? 0) + d.amount);
    const prev = lastDepositByGroomer.get(d.groomerMemberId);
    if (!prev || d.depositedAt > prev) lastDepositByGroomer.set(d.groomerMemberId, d.depositedAt);
  }

  const groomerMap = new Map(groomers.map((g) => [g.id, g]));
  const cashRows = groomers
    .map((g) => {
      const held = (collectedByGroomer.get(g.id) ?? 0) - (depositedByGroomer.get(g.id) ?? 0);
      const lastDeposit = lastDepositByGroomer.get(g.id);
      const daysSince = lastDeposit
        ? Math.floor((now.getTime() - lastDeposit.getTime()) / 86400000)
        : null;
      return { name: g.name, held, daysSince };
    })
    .filter((r) => r.held > 0)
    .sort((a, b) => b.held - a.held);

  const cashLines = cashRows.length > 0
    ? cashRows.map((r) => {
        const days = r.daysSince !== null ? `${r.daysSince}d` : "—";
        const warn = (r.held > 2000 && (r.daysSince ?? 0) >= 3) ? " ⚠️" : "";
        return `  ${pad(r.name, 14)} ${pad(inr(r.held), 14)} ${days}${warn}`;
      }).join("\n")
    : "  No cash currently held";

  const mismatchLines = mismatchesThisWeek.length > 0
    ? mismatchesThisWeek.map((m) => {
        const groomer = groomerMap.get(m.booking.groomerMemberId ?? "");
        return `  #${m.booking.id.slice(0, 8)}: collected ${inr(m.collectedAmount)} vs expected ${inr(m.expectedAmount)}${groomer ? ` (${groomer.name})` : ""}`;
      }).join("\n")
    : "  None this week";

  // Unit economics
  const economics = completedWithFuel.map((b) => ({
    revenue: b.finalAmount ?? 0,
    fuel: b.groomerFuelTrips.reduce((s: number, t: { fuelCost: number }) => s + t.fuelCost, 0),
  }));
  const avgRevenue = economics.length > 0 ? economics.reduce((s, e) => s + e.revenue, 0) / economics.length : 0;
  const avgFuel = economics.length > 0 ? economics.reduce((s, e) => s + e.fuel, 0) / economics.length : 0;

  const reportB = [
    `💰 CASH & MARGIN — ${weekLabel}`,
    "",
    `${pad("GROOMER", 14)} ${pad("HELD", 14)} DAYS SINCE DEPOSIT`,
    cashLines,
    "",
    `MISMATCHES THIS WEEK: ${mismatchesThisWeek.length}`,
    mismatchLines,
    "",
    `UNIT ECONOMICS (${economics.length} completed bookings)`,
    `  Avg revenue:  ${inr(avgRevenue)}`,
    `  Avg fuel:     ${inr(avgFuel)}`,
    `  Avg net:      ${inr(avgRevenue - avgFuel)}`,
  ].join("\n");

  // ── Report C: Groomer Scorecard ────────────────────────────────────────────
  // SOP compliance per groomer
  const sopByGroomer = new Map<string, { total: number; done: number }>();
  for (const step of sopSteps) {
    const gId = step.booking?.groomerMemberId;
    if (!gId) continue;
    const cur = sopByGroomer.get(gId) ?? { total: 0, done: 0 };
    cur.total++;
    if (step.status === "completed") cur.done++;
    sopByGroomer.set(gId, cur);
  }

  // Fuel cost per groomer this week
  const fuelByGroomer = new Map<string, { total: number; count: number }>();
  for (const trip of fuelTrips) {
    const cur = fuelByGroomer.get(trip.groomerMemberId) ?? { total: 0, count: 0 };
    cur.total += trip.fuelCost;
    cur.count++;
    fuelByGroomer.set(trip.groomerMemberId, cur);
  }

  // Completions this week per groomer
  const completionsThisWeek = new Map<string, number>();
  const weekCompletionGroups = await adminPrisma.booking.groupBy({
    by: ["groomerMemberId"],
    where: { status: "completed", updatedAt: { gte: sevenDaysAgo }, groomerMemberId: { not: null } },
    _count: { id: true },
  });
  for (const g of weekCompletionGroups) {
    if (g.groomerMemberId) completionsThisWeek.set(g.groomerMemberId, g._count.id);
  }

  const scorecardRows = groomers
    .map((g) => {
      const sop = sopByGroomer.get(g.id);
      const fuel = fuelByGroomer.get(g.id);
      const weekDone = completionsThisWeek.get(g.id) ?? 0;
      const sopPct = sop && sop.total > 0 ? `${Math.round((sop.done / sop.total) * 100)}%` : "—";
      const avgFuelStr = fuel && fuel.count > 0 ? inr(fuel.total / fuel.count) : "—";
      return { name: g.name, weekDone, sopPct, avgFuelStr, totalCompleted: g.completedCount };
    })
    .filter((r) => r.weekDone > 0 || r.totalCompleted > 0)
    .sort((a, b) => b.weekDone - a.weekDone);

  const scoreLines = scorecardRows.length > 0
    ? scorecardRows.map((r) =>
        `  ${pad(r.name, 16)} ${pad(String(r.weekDone), 5)} ${pad(r.sopPct, 6)} ${r.avgFuelStr}`
      ).join("\n")
    : "  No completions this week";

  const reportC = [
    `👷 GROOMER SCORECARD — ${weekLabel}`,
    "",
    `  ${pad("NAME", 16)} ${pad("DONE", 5)} ${pad("SOP%", 6)} AVG FUEL`,
    scoreLines,
    "",
    `Total all-time completions tracked: ${groomers.reduce((s, g) => s + g.completedCount, 0)}`,
  ].join("\n");

  // ── Send all three reports ─────────────────────────────────────────────────
  const results = await Promise.allSettled([
    sendAdminTelegramMessage(reportA, { parseMode: null }),
    sendAdminTelegramMessage(reportB, { parseMode: null }),
    sendAdminTelegramMessage(reportC, { parseMode: null }),
  ]);

  const sent = results.filter((r) => r.status === "fulfilled" && (r.value as { sent?: boolean })?.sent).length;

  return NextResponse.json({ ok: true, sent, total: 3, weekLabel });
}
