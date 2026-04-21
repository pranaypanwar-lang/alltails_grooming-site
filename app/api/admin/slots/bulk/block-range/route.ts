import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { makeIstDayBounds } from "../../../_lib/bookingAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function parseTimeOnDate(date: string, time: string) {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - 330 * 60_000);
}

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const adminUser = typeof body.adminUser === "string" && body.adminUser.trim() ? body.adminUser.trim() : "admin";

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Valid date is required (YYYY-MM-DD)" }, { status: 400 });
    }
    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const rangeStart = parseTimeOnDate(date, startTime);
    const rangeEnd = parseTimeOnDate(date, endTime);
    if (!rangeStart || !rangeEnd || rangeStart >= rangeEnd) {
      return NextResponse.json({ error: "Valid startTime and endTime are required" }, { status: 400 });
    }

    const { startOfDay, endOfDay } = makeIstDayBounds(date);
    const slots = await prisma.slot.findMany({
      where: {
        teamId,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      select: { id: true, startTime: true, endTime: true, isBooked: true, isBlocked: true },
      orderBy: { startTime: "asc" },
    });

    const inRange = slots.filter((slot) => slot.startTime >= rangeStart && slot.endTime <= rangeEnd);
    const blockableIds = inRange.filter((slot) => !slot.isBooked && !slot.isBlocked).map((slot) => slot.id);
    const skippedBookedCount = inRange.filter((slot) => slot.isBooked).length;
    const skippedBlockedCount = inRange.filter((slot) => slot.isBlocked).length;

    if (!inRange.length) {
      return NextResponse.json({ error: "No slots found in the selected time range" }, { status: 404 });
    }

    if (blockableIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.slot.updateMany({
          where: { id: { in: blockableIds } },
          data: {
            isBlocked: true,
            blockedReason: reason,
            blockedAt: new Date(),
            blockedByAdminUser: adminUser,
            isHeld: false,
            holdExpiresAt: null,
          },
        });

        await tx.bookingSlot.updateMany({
          where: {
            slotId: { in: blockableIds },
            status: "hold",
          },
          data: {
            status: "released",
          },
        });
      });
    }

    return NextResponse.json({
      success: true,
      blockedCount: blockableIds.length,
      skippedBookedCount,
      skippedBlockedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to block slot range";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
