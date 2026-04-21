import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const body = await request.json().catch(() => ({}));
    const date: string | undefined = body.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        selectedDate: date,
        status: { in: ["confirmed", "pending_payment"] },
      },
      include: {
        user: { select: { city: true } },
        service: { select: { name: true } },
        pets: { include: { pet: { select: { name: true, breed: true } } } },
        slots: { include: { slot: { include: { team: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by team
    const teamMap = new Map<string, {
      team: { id: string; name: string };
      entries: Array<{
        bookingId: string;
        area: string | null;
        timeWindow: string;
        serviceName: string;
        petCount: number;
        petSummary: string;
        notesSummary: string | null;
      }>;
    }>();

    for (const booking of bookings) {
      const sortedSlots = booking.slots
        .slice()
        .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime());

      const firstSlot = sortedSlots[0]?.slot ?? null;
      const lastSlot = sortedSlots[sortedSlots.length - 1]?.slot ?? null;
      const team = firstSlot?.team ?? null;
      if (!team) continue;

      const timeWindow =
        firstSlot && lastSlot
          ? `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`
          : "TBD";

      const petSummary = booking.pets
        .map((bp) => bp.pet.name ? `${bp.pet.name} (${bp.pet.breed})` : bp.pet.breed)
        .join(", ");

      if (!teamMap.has(team.id)) {
        teamMap.set(team.id, { team: { id: team.id, name: team.name }, entries: [] });
      }

      teamMap.get(team.id)!.entries.push({
        bookingId: booking.id,
        area: booking.user.city ?? null,
        timeWindow,
        serviceName: booking.service.name,
        petCount: booking.pets.length,
        petSummary: petSummary || `${booking.pets.length} pet(s)`,
        notesSummary: null,
      });
    }

    const teams = Array.from(teamMap.values()).map(({ team, entries }) => {
      const lines = entries.map((e, i) => {
        const petLine = e.petSummary;
        const areaLine = e.area ? ` · ${e.area}` : "";
        return `${i + 1}. ${e.timeWindow}${areaLine} — ${e.serviceName} — ${petLine}`;
      });

      const messagePreview = [
        `📋 Schedule for ${date} — ${team.name}`,
        "",
        ...lines,
        "",
        `Total: ${entries.length} booking(s)`,
        "Reply DONE when complete.",
      ].join("\n");

      return {
        team,
        bookingCount: entries.length,
        messagePreview,
        bookings: entries,
      };
    });

    return NextResponse.json({ date, teams });
  } catch (error) {
    console.error("POST /api/admin/dispatch/digest/preview failed", error);
    return NextResponse.json({ error: "Failed to generate digest preview" }, { status: 500 });
  }
}
