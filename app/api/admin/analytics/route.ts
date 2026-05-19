import { NextResponse } from "next/server";
import { adminPrisma } from "../_lib/bookingAdmin";
import { assertAdminSession } from "../_lib/assertAdmin";
import type { AnalyticsResponse } from "../../../admin/types/analytics";

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

export async function GET() {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  const now = new Date();
  const weekStart = startOf(now, "week");
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
  const lastWeekEnd = weekStart;
  const monthStart = startOf(now, "month");
  const todayStr = now.toISOString().slice(0, 10);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86400000);
  const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 86400000);

  const [
    latestReport,
    newUsersThisWeek,
    newUsersLastWeek,
    bookingsThisWeek,
    bookingsLastWeek,
    bookingsToday,
    sourceBreakdownRaw,
    conversionRaw,
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
    adminPrisma.booking.groupBy({
      by: ["bookingSource"],
      where: { createdAt: { gte: monthStart }, status: { not: "expired" } },
      _count: { id: true },
    }),

    // Conversion funnel (trailing 30 days)
    adminPrisma.booking.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
      select: { status: true, paymentStatus: true, razorpayOrderId: true },
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

  // Source breakdown
  const sourceBreakdown = sourceBreakdownRaw.map((row) => ({
    source: row.bookingSource,
    count: row._count.id,
  }));

  // Conversion funnel
  const totalLeads = conversionRaw.length;
  const ordersCreated = conversionRaw.filter((b) => b.razorpayOrderId !== null).length;
  const paymentCaptured = conversionRaw.filter((b) => b.paymentStatus === "paid").length;
  const bookingsConfirmed = conversionRaw.filter((b) => b.status === "confirmed").length;

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
  };

  return NextResponse.json(result);
}
