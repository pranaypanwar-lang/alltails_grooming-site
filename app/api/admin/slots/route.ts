import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { getSlotOccupancyState } from "../../../../lib/slots/occupancy";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
}

export async function GET(req: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const q = req.nextUrl.searchParams;
    const teamId = q.get("teamId") ?? undefined;
    const date = q.get("date") ?? undefined;
    const showBlocked = q.get("showBlocked") === "true";

    const where: Record<string, unknown> = {
      team: { isActive: true },
    };
    if (teamId) where.teamId = teamId;
    if (!showBlocked) where.isBlocked = false;
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      where.startTime = { gte: start, lte: end };
    }

    const slots = await prisma.slot.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        bookings: {
          where: {
            status: { in: ["confirmed", "hold"] },
            booking: { status: { in: ["pending_payment", "confirmed", "completed"] } },
          },
          take: 1,
          include: {
            booking: {
              select: {
                id: true,
                status: true,
                user: { select: { name: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const mappedSlots = slots.map((slot) => {
      const state = getSlotOccupancyState(slot);
      const firstBooking = slot.bookings[0];
      return {
        id: slot.id,
        teamId: slot.teamId,
        teamName: slot.team.name,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        state,
        holdExpiresAt: slot.holdExpiresAt?.toISOString() ?? null,
        blockedReason: slot.blockedReason,
        bookingId: firstBooking?.bookingId ?? null,
        bookingStatus: firstBooking?.booking.status ?? null,
        customerMasked: firstBooking ? maskPhone(firstBooking.booking.user.phone) : null,
      };
    });

    const summary = {
      totalSlots: mappedSlots.length,
      freeCount: mappedSlots.filter((s) => s.state === "free").length,
      heldCount: mappedSlots.filter((s) => s.state === "held").length,
      bookedCount: mappedSlots.filter((s) => s.state === "booked").length,
      blockedCount: mappedSlots.filter((s) => s.state === "blocked").length,
    };

    const team = teamId
      ? slots[0]?.team ?? null
      : null;

    return NextResponse.json({ date: date ?? null, team, summary, slots: mappedSlots });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
