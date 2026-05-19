import { NextResponse } from "next/server";
import { adminPrisma } from "../_lib/bookingAdmin";
import { assertAdminSession } from "../_lib/assertAdmin";
import type {
  AnalyticsAction,
  AnalyticsBreakdownRow,
  AnalyticsPerformanceRow,
  AnalyticsResponse,
} from "../../../admin/types/analytics";
import { getPlatformRoiSummary } from "../../../../lib/analytics/platformRoi";

export const runtime = "nodejs";

function startOf(date: Date, unit: "day" | "week" | "month"): Date {
  const d = new Date(date);
  if (unit === "week") {
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
  } else if (unit === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

const ACTIVE_STATUSES = ["confirmed", "completed"];
const LOST_PAYMENT_STATUSES = ["expired", "payment_expired"];
const PAID_STATUSES = ["paid", "deposit_paid", "covered_by_loyalty", "pending_cash_collection"];

function safeRate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function parseAttribution(adminNote?: string | null) {
  const line = adminNote
    ?.split("\n")
    .find((entry) => entry.trim().startsWith("[attribution]"));
  if (!line) return {};

  const payload = line.replace("[attribution]", "").trim();
  return Object.fromEntries(
    payload
      .split(" · ")
      .map((part) => {
        const [key, ...rest] = part.split("=");
        return [key?.trim(), rest.join("=").trim()] as const;
      })
      .filter(([key, value]) => key && value)
  ) as Record<string, string>;
}

function resolveSource(bookingSource: string | null | undefined, attribution: Record<string, string>) {
  const source = attribution.utm_source?.toLowerCase();
  const medium = attribution.utm_medium?.toLowerCase();
  if (attribution.gclid) return "google_ads";
  if (source?.includes("google")) return "google";
  if (source?.includes("facebook") || source?.includes("meta") || source?.includes("instagram")) return "meta";
  if (medium === "cpc" || medium === "paid") return source || "paid";
  return bookingSource || "direct_unknown";
}

function bumpBreakdown(
  map: Map<string, AnalyticsBreakdownRow>,
  label: string,
  value: number,
  paid: boolean
) {
  const key = label || "Unknown";
  const row = map.get(key) ?? { label: key, count: 0, revenue: 0 };
  row.count += 1;
  if (paid) row.revenue += value;
  map.set(key, row);
}

function topRows(map: Map<string, AnalyticsBreakdownRow>, take = 6) {
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, take);
}

type PerformanceAccumulator = {
  bookings: number;
  paidBookings: number;
  confirmedBookings: number;
  revenue: number;
  issues: number;
};

function bumpPerformance(
  map: Map<string, PerformanceAccumulator>,
  label: string,
  value: number,
  paid: boolean,
  confirmed: boolean,
  issue: boolean
) {
  const key = label || "Unknown";
  const row =
    map.get(key) ??
    ({ bookings: 0, paidBookings: 0, confirmedBookings: 0, revenue: 0, issues: 0 } satisfies PerformanceAccumulator);
  row.bookings += 1;
  if (paid) {
    row.paidBookings += 1;
    row.revenue += value;
  }
  if (confirmed) row.confirmedBookings += 1;
  if (issue) row.issues += 1;
  map.set(key, row);
}

function toPerformanceRows(map: Map<string, PerformanceAccumulator>, take = 8): AnalyticsPerformanceRow[] {
  return Array.from(map.entries())
    .map(([label, row]) => ({
      label,
      bookings: row.bookings,
      paidBookings: row.paidBookings,
      confirmedBookings: row.confirmedBookings,
      revenue: row.revenue,
      avgOrderValue: row.paidBookings > 0 ? row.revenue / row.paidBookings : 0,
      conversionRate: safeRate(row.confirmedBookings, row.bookings),
      issueRate: safeRate(row.issues, row.confirmedBookings),
    }))
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, take);
}

function buildActionQueue(input: {
  attributionCoverage: number;
  dropOffRate: number;
  failedValue: number;
  atRiskCount: number;
  dispatchIssueRate: number;
  sopCompletionRate: number;
  unassignedUpcoming: number;
  missingAddress: number;
  topCity?: AnalyticsPerformanceRow;
  weakCity?: AnalyticsPerformanceRow;
}): AnalyticsAction[] {
  const actions: AnalyticsAction[] = [];

  if (input.failedValue > 0 || input.dropOffRate > 0.18) {
    actions.push({
      id: "payment-recovery",
      priority: input.failedValue > 10000 || input.dropOffRate > 0.25 ? "high" : "medium",
      area: "conversion",
      title: "Recover payment drop-offs",
      finding: `${money(input.failedValue)} is sitting in failed or expired payment attempts.`,
      recommendedAction: "Call or WhatsApp these customers first, then push retry links before changing paid-campaign spend.",
      impact: "Fastest route to recovered revenue because intent already exists.",
      confidence: "high",
      href: "/admin/bookings",
    });
  }

  if (input.attributionCoverage < 0.65) {
    actions.push({
      id: "attribution-coverage",
      priority: "medium",
      area: "marketing",
      title: "Improve campaign visibility",
      finding: `${Math.round(input.attributionCoverage * 100)}% of recent bookings carry campaign attribution.`,
      recommendedAction: "Audit ad links for UTM/gclid continuity and compare unknown bookings against call/WhatsApp sources.",
      impact: "Cleaner source quality before scaling Meta or Google budgets.",
      confidence: "medium",
      href: "/admin/analytics",
    });
  }

  if (input.topCity && input.topCity.revenue > 0) {
    actions.push({
      id: "city-scale",
      priority: "medium",
      area: "marketing",
      title: `Scale ${input.topCity.label}`,
      finding: `${input.topCity.label} produced ${money(input.topCity.revenue)} with ${Math.round(input.topCity.conversionRate * 100)}% confirmed conversion.`,
      recommendedAction: "Use this city as the benchmark creative and package mix for this week's paid campaigns.",
      impact: "Shift spend toward proven demand instead of generic city-level targeting.",
      confidence: input.topCity.bookings >= 10 ? "high" : "medium",
      href: "/admin/bookings",
    });
  }

  if (input.weakCity && input.weakCity.bookings >= 3 && input.weakCity.conversionRate < 0.5) {
    actions.push({
      id: "weak-city",
      priority: "medium",
      area: "conversion",
      title: `Fix ${input.weakCity.label} conversion`,
      finding: `${input.weakCity.label} has ${input.weakCity.bookings} starts but only ${Math.round(input.weakCity.conversionRate * 100)}% confirmed conversion.`,
      recommendedAction: "Check slot availability, payment failures, and address friction for this city before buying more traffic.",
      impact: "Stops wasted demand from turning into silent leakage.",
      confidence: "medium",
      href: "/admin/bookings",
    });
  }

  if (input.atRiskCount > 0) {
    actions.push({
      id: "retention-rebooking",
      priority: input.atRiskCount > 25 ? "high" : "medium",
      area: "retention",
      title: "Pull rebooking demand forward",
      finding: `${input.atRiskCount} completed customers are 45+ days silent.`,
      recommendedAction: "Run a same-day rebooking campaign and prioritize high-value repeat customers.",
      impact: "Retention revenue without new CAC.",
      confidence: "high",
      href: "/admin/customers",
    });
  }

  if (input.dispatchIssueRate > 0.05 || input.unassignedUpcoming > 0 || input.missingAddress > 0) {
    actions.push({
      id: "ops-risk",
      priority: input.dispatchIssueRate > 0.1 || input.unassignedUpcoming > 5 ? "high" : "medium",
      area: "operations",
      title: "Clear operational risk",
      finding: `${input.unassignedUpcoming} upcoming bookings are unassigned and ${input.missingAddress} active bookings need address completion.`,
      recommendedAction: "Assign teams and fix missing addresses before the next booking wave starts.",
      impact: "Protects completion rate and customer experience.",
      confidence: "high",
      href: "/admin/dispatch",
    });
  }

  if (input.sopCompletionRate < 0.9) {
    actions.push({
      id: "sop-compliance",
      priority: "medium",
      area: "operations",
      title: "Tighten SOP completion",
      finding: `SOP completion is ${Math.round(input.sopCompletionRate * 100)}%.`,
      recommendedAction: "Review incomplete groomer SOPs and follow up before payroll/reward calculations.",
      impact: "Improves service proof, dispute handling, and quality control.",
      confidence: "high",
      href: "/admin/bookings",
    });
  }

  return actions
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0))
    .slice(0, 6);
}

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  const now = new Date();
  const weekStart = startOf(now, "week");
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
  const lastWeekEnd = weekStart;
  const monthStart = startOf(now, "month");
  const todayStr = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86400000);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 86400000);

  const [
    latestReport,
    newUsersThisWeek,
    newUsersLastWeek,
    bookingsThisWeek,
    bookingsLastWeek,
    bookingsToday,
    conversionRaw,
    recentBookings,
    revenueThisWeek,
    revenueLastWeek,
    revenueThisMonth,
    couponBookings,
    allCompletedCustomers,
    atRiskUsers,
    completedLast35Days,
    dispatchStats,
    sopStats,
  ] = await Promise.all([
    // Latest AI analysis report
    adminPrisma.analysisReport.findFirst({
      orderBy: { generatedAt: "desc" },
      select: { id: true, type: true, periodStart: true, periodEnd: true, markdown: true, generatedAt: true },
    }),

    // Acquisition
    adminPrisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    adminPrisma.user.count({ where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } } }),
    adminPrisma.booking.count({ where: { createdAt: { gte: weekStart }, status: { not: "expired" } } }),
    adminPrisma.booking.count({ where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd }, status: { not: "expired" } } }),
    adminPrisma.booking.count({ where: { selectedDate: todayStr, status: { not: "expired" } } }),

    // Conversion funnel (trailing 30 days)
    adminPrisma.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, paymentStatus: true, razorpayOrderId: true },
    }),
    adminPrisma.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        finalAmount: true,
        originalAmount: true,
        couponCode: true,
        razorpayOrderId: true,
        paymentFailedAt: true,
        paymentExpiredAt: true,
        selectedDate: true,
        bookingSource: true,
        serviceAddress: true,
        serviceLandmark: true,
        dispatchState: true,
        adminNote: true,
        user: { select: { city: true } },
        service: { select: { name: true } },
      },
    }),

    // Revenue
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: weekStart }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
    }),
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
    }),
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: monthStart }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
      _avg: { finalAmount: true },
      _count: { id: true },
    }),
    adminPrisma.booking.findMany({
      where: { createdAt: { gte: monthStart }, status: "confirmed", couponCode: { not: null } },
      select: { originalAmount: true, finalAmount: true },
    }),

    // Retention: customers with 2+ completed bookings
    adminPrisma.user.findMany({
      where: { bookings: { some: { status: "completed" } } },
      select: { _count: { select: { bookings: { where: { status: "completed" } } } } },
    }),
    adminPrisma.user.count({
      where: {
        bookings: {
          none: { createdAt: { gte: fortyFiveDaysAgo } },
          some: { status: "completed" },
        },
      },
    }),
    adminPrisma.booking.findMany({
      where: { status: "completed", createdAt: { gte: thirtyFiveDaysAgo } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    // Operations
    adminPrisma.booking.findMany({
      where: { status: "completed", selectedDate: { gte: todayStr.slice(0, 7) } },
      select: { dispatchState: true },
    }),
    adminPrisma.bookingSopStep.groupBy({
      by: ["status"],
      where: { booking: { status: "completed", selectedDate: { gte: monthStart.toISOString().slice(0, 10) } } },
      _count: { id: true },
    }),
  ]);

  // Conversion funnel
  const totalLeads = conversionRaw.length;
  const ordersCreated = conversionRaw.filter((b) => b.razorpayOrderId !== null).length;
  const paymentCaptured = conversionRaw.filter((b) => b.paymentStatus === "paid").length;
  const bookingsConfirmed = conversionRaw.filter((b) => b.status === "confirmed").length;

  const sourceMap = new Map<string, AnalyticsBreakdownRow>();
  const campaignMap = new Map<string, AnalyticsBreakdownRow>();
  const issueCityMap = new Map<string, AnalyticsBreakdownRow>();
  const cityMap = new Map<string, PerformanceAccumulator>();
  const serviceMap = new Map<string, PerformanceAccumulator>();
  let bookingsWithAttribution = 0;
  let googleAttributedBookings = 0;
  let metaAttributedBookings = 0;
  let directOrUnknownBookings = 0;
  let failedOrExpiredCount = 0;
  let failedOrExpiredValue = 0;
  let retryableCount = 0;
  let paidAfterFailureCount = 0;
  let bookingsMissingAddress = 0;
  let unassignedUpcoming = 0;
  let issueBookings = 0;

  for (const booking of recentBookings) {
    const attribution = parseAttribution(booking.adminNote);
    const source = resolveSource(booking.bookingSource, attribution);
    const hasAttribution = Object.keys(attribution).length > 0;
    const paid = PAID_STATUSES.includes(booking.paymentStatus);
    const active = ACTIVE_STATUSES.includes(booking.status);
    const issue = booking.dispatchState === "issue";
    const city = booking.user.city || "Unknown city";
    const service = booking.service.name || "Unknown service";

    if (hasAttribution) bookingsWithAttribution += 1;
    if (source === "google_ads" || source === "google") googleAttributedBookings += 1;
    else if (source === "meta") metaAttributedBookings += 1;
    else if (source === "direct_unknown" || !source) directOrUnknownBookings += 1;

    bumpBreakdown(sourceMap, source, booking.finalAmount, paid);
    if (attribution.utm_campaign) bumpBreakdown(campaignMap, attribution.utm_campaign, booking.finalAmount, paid);
    if (issue) bumpBreakdown(issueCityMap, city, booking.finalAmount, false);
    bumpPerformance(cityMap, city, booking.finalAmount, paid, active, issue);
    bumpPerformance(serviceMap, service, booking.finalAmount, paid, active, issue);

    const paymentLost =
      LOST_PAYMENT_STATUSES.includes(booking.paymentStatus) ||
      booking.status === "payment_expired" ||
      booking.status === "expired" ||
      Boolean(booking.paymentFailedAt || booking.paymentExpiredAt);
    if (paymentLost && !paid) {
      failedOrExpiredCount += 1;
      failedOrExpiredValue += booking.finalAmount;
    }
    if (!paid && booking.razorpayOrderId) retryableCount += 1;
    if (paid && booking.paymentFailedAt) paidAfterFailureCount += 1;
    if (active && (!booking.serviceAddress || !booking.serviceLandmark)) bookingsMissingAddress += 1;
    if (
      active &&
      booking.selectedDate &&
      booking.selectedDate >= todayStr &&
      booking.dispatchState === "unassigned"
    ) {
      unassignedUpcoming += 1;
    }
    if (issue) issueBookings += 1;
  }

  const sourceBreakdown = topRows(sourceMap, 6).map((row) => ({
    source: row.label,
    count: row.count,
  }));
  const cityPerformance = toPerformanceRows(cityMap, 8);
  const servicePerformance = toPerformanceRows(serviceMap, 8);
  const attributionCoverage = safeRate(bookingsWithAttribution, recentBookings.length);
  const dropOffRate = safeRate(failedOrExpiredCount, recentBookings.length);
  const internalRevenueByCampaign = new Map<string, number>();
  for (const row of campaignMap.values()) {
    internalRevenueByCampaign.set(row.label.trim().toLowerCase(), row.revenue);
  }
  const platformRoi = await getPlatformRoiSummary(internalRevenueByCampaign);

  // Revenue
  const paidBookingsMonth = await adminPrisma.booking.findMany({
    where: { createdAt: { gte: monthStart }, status: "confirmed", paymentStatus: "paid" },
    select: { paymentMethod: true },
  });
  const paidCount = paidBookingsMonth.filter((b) => b.paymentMethod === "pay_now").length;
  const codCount = paidBookingsMonth.filter((b) => b.paymentMethod === "pay_after_service").length;
  const cashCount = paidBookingsMonth.filter((b) => b.paymentMethod === "cash").length;

  const totalMonthBookings = revenueThisMonth._count.id;
  const couponUsageRate = totalMonthBookings > 0 ? couponBookings.length / totalMonthBookings : 0;
  const avgDiscount =
    couponBookings.length > 0
      ? couponBookings.reduce((sum, b) => sum + (b.originalAmount - b.finalAmount), 0) / couponBookings.length
      : 0;

  // Retention
  const repeatCustomers = allCompletedCustomers.filter((u) => u._count.bookings >= 2).length;
  const totalWithCompleted = allCompletedCustomers.length;
  const repeatBookingRate = totalWithCompleted > 0 ? repeatCustomers / totalWithCompleted : 0;

  // Rebooked within 35 days: customers who had 2 completed bookings within 35-day windows
  const userToBookings = new Map<string, Date[]>();
  for (const b of completedLast35Days) {
    const list = userToBookings.get(b.userId) ?? [];
    list.push(new Date(b.createdAt));
    userToBookings.set(b.userId, list);
  }
  let rebookedWithin35 = 0;
  for (const dates of userToBookings.values()) {
    if (dates.length >= 2) rebookedWithin35++;
  }

  // Operations
  const issueCount = dispatchStats.filter((b) => b.dispatchState === "issue").length;
  const dispatchIssueRate = dispatchStats.length > 0 ? issueCount / dispatchStats.length : 0;

  const sopTotal = sopStats.reduce((sum, r) => sum + r._count.id, 0);
  const sopDone = sopStats.find((r) => r.status === "completed")?._count.id ?? 0;
  const sopCompletionRate = sopTotal > 0 ? sopDone / sopTotal : 0;

  const weakCity = cityPerformance
    .filter((row) => row.bookings >= 3)
    .sort((a, b) => a.conversionRate - b.conversionRate || b.bookings - a.bookings)[0];
  const topCity = cityPerformance[0];
  const actionQueue = buildActionQueue({
    attributionCoverage,
    dropOffRate,
    failedValue: failedOrExpiredValue,
    atRiskCount: atRiskUsers,
    dispatchIssueRate,
    sopCompletionRate,
    unassignedUpcoming,
    missingAddress: bookingsMissingAddress,
    topCity,
    weakCity,
  });
  const highPriorityCount = actionQueue.filter((action) => action.priority === "high").length;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          dropOffRate * 28 -
          dispatchIssueRate * 22 -
          (1 - sopCompletionRate) * 18 -
          safeRate(atRiskUsers, Math.max(totalWithCompleted, 1)) * 14 -
          (1 - attributionCoverage) * 10
      )
    )
  );
  const dataQualityNotes = [
    attributionCoverage < 0.65
      ? "Attribution coverage is low; campaign URLs need tighter UTM/gclid hygiene."
      : "Attribution coverage is usable for directional source decisions.",
    campaignMap.size === 0
      ? "No UTM campaign names found in recent booking notes."
      : `${campaignMap.size} campaign label(s) found in recent bookings.`,
    platformRoi.spend > 0
      ? "Platform spend is connected and is being compared with internal paid booking revenue where campaign names match."
      : "Meta/Google spend is not connected yet; configure platform API credentials to unlock CPC, CPM, ROAS, and match quality.",
  ];

  const result: AnalyticsResponse = {
    latestReport: latestReport
      ? {
          ...latestReport,
          periodStart: latestReport.periodStart.toISOString(),
          periodEnd: latestReport.periodEnd.toISOString(),
          generatedAt: latestReport.generatedAt.toISOString(),
        }
      : null,
    acquisition: {
      newCustomersThisWeek: newUsersThisWeek,
      newCustomersLastWeek: newUsersLastWeek,
      bookingsThisWeek: bookingsThisWeek,
      bookingsLastWeek: bookingsLastWeek,
      bookingsToday,
      sourceBreakdown,
    },
    conversionFunnel: {
      slotsHeld: totalLeads,
      ordersCreated,
      paymentCaptured,
      bookingsConfirmed,
    },
    revenue: {
      gmvThisWeek: revenueThisWeek._sum.finalAmount ?? 0,
      gmvLastWeek: revenueLastWeek._sum.finalAmount ?? 0,
      gmvThisMonth: revenueThisMonth._sum.finalAmount ?? 0,
      avgBookingValue: revenueThisMonth._avg.finalAmount ?? 0,
      paidCount,
      codCount,
      cashCount,
      couponUsageRate,
      avgDiscount,
    },
    retention: {
      repeatBookingRate,
      atRiskCount: atRiskUsers,
      rebookedWithin35Days: rebookedWithin35,
      totalCompletedLast35Days: completedLast35Days.length,
    },
    operations: {
      dispatchIssueRate,
      sopCompletionRate,
      avgTimeConfirmedToAssigned: null,
    },
    command: {
      healthScore,
      priorityCount: highPriorityCount,
      headline:
        highPriorityCount > 0
          ? `${highPriorityCount} high-priority issue${highPriorityCount === 1 ? "" : "s"} need attention before scaling.`
          : actionQueue.length > 0
            ? "Analytics is healthy enough to optimize; focus on the ranked actions."
            : "No urgent action detected from recent operating data.",
      actionQueue,
    },
    marketing: {
      attributionCoverage,
      googleAttributedBookings,
      metaAttributedBookings,
      directOrUnknownBookings,
      topSources: topRows(sourceMap, 6),
      topCampaigns: topRows(campaignMap, 6),
      dataQualityNotes,
      platformRoi,
    },
    cityPerformance,
    servicePerformance,
    paymentRecovery: {
      failedOrExpiredCount,
      failedOrExpiredValue,
      retryableCount,
      paidAfterFailureCount,
      dropOffRate,
    },
    operationsDeepDive: {
      bookingsMissingAddress,
      unassignedUpcoming,
      issueBookings,
      topIssueCities: topRows(issueCityMap, 5),
    },
  };

  return NextResponse.json(result);
}
