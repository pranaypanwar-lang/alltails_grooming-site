import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { makeIstDayBounds } from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type DigestHistoryGroup = {
  digestDate: string;
  sentAt: string;
  team: { id: string; name: string };
  bookingCount: number;
  success: boolean;
  error: string | null;
  telegramMessageId: string | null;
};

function getMinuteBucket(value: Date) {
  const copy = new Date(value);
  copy.setSeconds(0, 0);
  return copy.toISOString();
}

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = request.nextUrl.searchParams;
    const date = q.get("date")?.trim() || "";
    const limitRaw = Number(q.get("limit") ?? "12");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 12;

    const where: {
      alertType: string;
      sentAt?: { gte: Date; lte: Date };
    } = { alertType: "daily_digest" };

    if (date) {
      const { startOfDay, endOfDay } = makeIstDayBounds(date);
      where.sentAt = { gte: startOfDay, lte: endOfDay };
    }

    const alerts = await prisma.dispatchAlert.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        booking: { select: { selectedDate: true } },
      },
      orderBy: { sentAt: "desc" },
      take: date ? 200 : 400,
    });

    const grouped = new Map<string, DigestHistoryGroup>();

    for (const alert of alerts) {
      const digestDate = alert.booking.selectedDate ?? "";
      if (!digestDate) continue;

      const key = [
        digestDate,
        alert.teamId,
        getMinuteBucket(alert.sentAt),
        alert.telegramMessageId ?? "no-message-id",
        alert.success ? "success" : "failed",
        alert.errorMsg ?? "",
      ].join("|");

      const existing = grouped.get(key);
      if (existing) {
        existing.bookingCount += 1;
        continue;
      }

      grouped.set(key, {
        digestDate,
        sentAt: alert.sentAt.toISOString(),
        team: { id: alert.team.id, name: alert.team.name },
        bookingCount: 1,
        success: alert.success,
        error: alert.errorMsg ?? null,
        telegramMessageId: alert.telegramMessageId ?? null,
      });
    }

    const entries = [...grouped.values()]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ entries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load digest history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
