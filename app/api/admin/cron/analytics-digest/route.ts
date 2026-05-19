import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminPrisma } from "../../_lib/bookingAdmin";
import { sendAdminTelegramMessage } from "../../../../../lib/telegram/send";

export const runtime = "nodejs";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
function inr(n: number) {
  return `INR ${Math.round(n).toLocaleString("en-IN")}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  // Gather all metrics in parallel
  const [
    newUsersThisWeek,
    newUsersLastWeek,
    bookingsThisWeek,
    bookingsLastWeek,
    revenueWeek,
    revenueLastWeek,
    revenueMonth,
    confirmedTotal,
    issueCount,
    sopStats,
    atRiskCount,
    conversionRaw,
  ] = await Promise.all([
    adminPrisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    adminPrisma.user.count({ where: { createdAt: { gte: lastWeekStart, lt: weekStart } } }),
    adminPrisma.booking.count({ where: { createdAt: { gte: weekStart }, status: { not: "expired" } } }),
    adminPrisma.booking.count({ where: { createdAt: { gte: lastWeekStart, lt: weekStart }, status: { not: "expired" } } }),
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: weekStart }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
    }),
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: lastWeekStart, lt: weekStart }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
    }),
    adminPrisma.booking.aggregate({
      where: { createdAt: { gte: monthStart }, status: "confirmed", paymentStatus: "paid" },
      _sum: { finalAmount: true },
      _avg: { finalAmount: true },
    }),
    adminPrisma.booking.count({ where: { status: "confirmed", selectedDate: { gte: todayStr.slice(0, 7) } } }),
    adminPrisma.booking.count({ where: { status: "confirmed", dispatchState: "issue", selectedDate: { gte: todayStr.slice(0, 7) } } }),
    adminPrisma.bookingSopStep.groupBy({
      by: ["status"],
      where: { booking: { status: "completed", createdAt: { gte: monthStart } } },
      _count: { id: true },
    }),
    adminPrisma.user.count({
      where: {
        bookings: {
          none: { createdAt: { gte: new Date(now.getTime() - 45 * 86400000) } },
          some: { status: "completed" },
        },
      },
    }),
    adminPrisma.booking.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { status: true, paymentStatus: true, razorpayOrderId: true },
    }),
  ]);

  const gmvWeek = revenueWeek._sum.finalAmount ?? 0;
  const gmvLastWeek = revenueLastWeek._sum.finalAmount ?? 0;
  const gmvMonth = revenueMonth._sum.finalAmount ?? 0;
  const avgOrderValue = revenueMonth._avg.finalAmount ?? 0;
  const dispatchIssueRate = confirmedTotal > 0 ? issueCount / confirmedTotal : 0;
  const sopTotal = sopStats.reduce((s, r) => s + r._count.id, 0);
  const sopDone = sopStats.find((r) => r.status === "completed")?._count.id ?? 0;
  const sopRate = sopTotal > 0 ? sopDone / sopTotal : 0;

  const ordersCreated = conversionRaw.filter((b) => b.razorpayOrderId !== null).length;
  const paymentCaptured = conversionRaw.filter((b) => b.paymentStatus === "paid").length;
  const conversionRate = conversionRaw.length > 0 ? paymentCaptured / conversionRaw.length : 0;

  const prompt = `You are an operations analyst for All Tails, a premium pet grooming service in India.

Here are this week's metrics (period: ${weekStart.toDateString()} to ${now.toDateString()}):

ACQUISITION
- New customers this week: ${newUsersThisWeek} (last week: ${newUsersLastWeek}, ${newUsersLastWeek > 0 ? ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek * 100).toFixed(1) : "N/A"}% change)
- Bookings this week: ${bookingsThisWeek} (last week: ${bookingsLastWeek})

REVENUE
- GMV this week: ${inr(gmvWeek)} (last week: ${inr(gmvLastWeek)})
- GMV this month: ${inr(gmvMonth)}
- Avg booking value: ${inr(avgOrderValue)}

CONVERSION (trailing 30 days)
- Bookings initiated: ${conversionRaw.length}
- Razorpay orders created: ${ordersCreated}
- Payments captured: ${paymentCaptured}
- Overall conversion rate: ${pct(conversionRate)}

RETENTION
- At-risk customers (45d+ silent): ${atRiskCount}

OPERATIONS
- Dispatch issue rate: ${pct(dispatchIssueRate)}
- SOP completion rate: ${pct(sopRate)}

Write a concise weekly operations digest in markdown. Use bullet points. Structure:
1. **What's going well** (2-3 bullets, specific numbers)
2. **What needs attention** (2-3 bullets, specific problems)
3. **One recommended action this week** (single concrete thing to do)

Be specific and direct. No padding. No generic advice. Ground every insight in the numbers above.`;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const markdown =
    response.content[0]?.type === "text" ? response.content[0].text : "Analysis unavailable.";

  // Save to DB
  const report = await adminPrisma.analysisReport.create({
    data: {
      type: "weekly",
      periodStart: weekStart,
      periodEnd: now,
      markdown,
    },
  });

  // Send condensed version to Telegram (first 5 lines + link)
  const lines = markdown.split("\n").filter((l) => l.trim()).slice(0, 6);
  const telegramText = [
    `Weekly digest · ${weekStart.toDateString()}`,
    "",
    ...lines,
    "",
    `Full report: ${process.env.NEXT_PUBLIC_APP_URL?.trim() ?? ""}/admin/analytics`,
  ].join("\n");

  const telegramResult = await sendAdminTelegramMessage(telegramText, { parseMode: null }).catch(() => null);

  if (telegramResult?.sent) {
    await adminPrisma.analysisReport.update({
      where: { id: report.id },
      data: { sentToTelegram: true },
    });
  }

  return NextResponse.json({ ok: true, reportId: report.id, sentToTelegram: telegramResult?.sent ?? false });
}
