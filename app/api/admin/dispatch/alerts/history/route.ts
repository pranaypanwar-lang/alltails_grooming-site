import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { makeIstDayBounds } from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = request.nextUrl.searchParams;
    const date = q.get("date")?.trim() || "";
    const alertType = q.get("alertType")?.trim() || "";
    const limitRaw = Number(q.get("limit") ?? "30");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    const where: {
      sentAt?: { gte: Date; lte: Date };
      alertType?: string;
    } = {};

    if (date) {
      const { startOfDay, endOfDay } = makeIstDayBounds(date);
      where.sentAt = { gte: startOfDay, lte: endOfDay };
    }

    if (alertType) {
      where.alertType = alertType;
    }

    const alerts = await prisma.dispatchAlert.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        booking: {
          select: {
            id: true,
            selectedDate: true,
            user: { select: { name: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { sentAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      entries: alerts.map((alert) => ({
        id: alert.id,
        sentAt: alert.sentAt.toISOString(),
        alertType: alert.alertType,
        success: alert.success,
        error: alert.errorMsg ?? null,
        telegramMessageId: alert.telegramMessageId ?? null,
        team: {
          id: alert.team.id,
          name: alert.team.name,
        },
        booking: {
          id: alert.booking.id,
          selectedDate: alert.booking.selectedDate ?? null,
          customerName: alert.booking.user.name,
          serviceName: alert.booking.service.name,
        },
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load alert history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
