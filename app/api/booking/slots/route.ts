import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { resolveEligibleTeamIds } from "../../../../lib/slots/coverage";
import { ensureSlotsExistForDateRange } from "../../../../lib/slots/ensureSlots";
import { getSlotLabel, SLOT_ORDER, type SlotLabel } from "../../../../lib/slots/slotTemplates";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Booking-window builder ───────────────────────────────────────────────────

function buildBookingWindows(
  slots: Array<{
    id: string;
    teamId: string;
    teamName: string;
    startTime: Date;
    endTime: Date;
    slotLabel: SlotLabel;
    slotOrder: number;
  }>,
  petCount: number
) {
  const byTeam = new Map<string, typeof slots>();

  for (const slot of slots) {
    if (!byTeam.has(slot.teamId)) byTeam.set(slot.teamId, []);
    byTeam.get(slot.teamId)!.push(slot);
  }

  const windows: Array<{
    bookingWindowId: string;
    teamId: string;
    teamName: string;
    petCount: number;
    startTime: string;
    endTime: string;
    slotLabels: SlotLabel[];
    slotIds: string[];
    displayLabel: string;
  }> = [];

  for (const [, teamSlots] of byTeam) {
    const sorted = [...teamSlots].sort((a, b) => a.slotOrder - b.slotOrder);

    for (let i = 0; i <= sorted.length - petCount; i++) {
      const candidate = sorted.slice(i, i + petCount);

      let consecutive = true;
      for (let j = 1; j < candidate.length; j++) {
        if (candidate[j].slotOrder !== candidate[j - 1].slotOrder + 1) {
          consecutive = false;
          break;
        }
      }
      if (!consecutive) continue;

      const first = candidate[0];
      const last  = candidate[candidate.length - 1];

      windows.push({
        bookingWindowId: candidate.map((s) => s.id).join("__"),
        teamId:          first.teamId,
        teamName:        first.teamName,
        petCount,
        startTime:       first.startTime.toISOString(),
        endTime:         last.endTime.toISOString(),
        slotLabels:      candidate.map((s) => s.slotLabel),
        slotIds:         candidate.map((s) => s.id),
        displayLabel:    `${first.slotLabel} to ${last.slotLabel}`,
      });
    }
  }

  return windows.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function applyLeadTimeFilter<T extends { startTime: string }>(
  windows: T[],
  minimumLeadMinutes: number
) {
  const cutoff = Date.now() + minimumLeadMinutes * 60 * 1000;
  return windows.filter(
    (window) => new Date(window.startTime).getTime() >= cutoff
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, date, petCount }: { city?: string; date?: string; petCount?: number } = body;

    if (!city || !date) {
      return NextResponse.json({ error: "city and date are required" }, { status: 400 });
    }

    // Normalise service-area slug (lowercase, spaces → hyphens)
    const areaSlug = city.trim().toLowerCase().replace(/\s+/g, "-");

    const normalizedPetCount = Number(petCount ?? 1);
    if (Number.isNaN(normalizedPetCount) || normalizedPetCount < 1 || normalizedPetCount > 4) {
      return NextResponse.json(
        { error: "petCount must be between 1 and 4" },
        { status: 400 }
      );
    }

    // Derive weekday from IST date string (YYYY-MM-DD)
    const [y, m, d] = date.split("-").map(Number);
    const istDate = new Date(Date.UTC(y, m - 1, d));
    const weekday = istDate.getUTCDay(); // 0 Sun … 6 Sat

    // Tuesday is globally off
    if (weekday === 2) {
      return NextResponse.json({
        city,
        date,
        petCount: normalizedPetCount,
        totalRawSlots: 0,
        totalBookingWindows: 0,
        bookingWindows: [],
        note: "No sessions on Tuesdays.",
      });
    }

    // Self-heal: ensure slots exist for this date before reading
    const created = await ensureSlotsExistForDateRange(prisma, areaSlug, date, 1);
    if (created > 0) {
      console.log(`[slots] Created ${created} missing slot(s) for ${areaSlug} on ${date}`);
    }

    // Resolve eligible teams for this area + weekday
    const teamIds = await resolveEligibleTeamIds(prisma, areaSlug, weekday);

    if (teamIds.length === 0) {
      return NextResponse.json({
        city,
        date,
        petCount: normalizedPetCount,
        totalRawSlots: 0,
        totalBookingWindows: 0,
        bookingWindows: [],
        note: "No teams configured for this area on this day.",
      });
    }

    // UTC day boundaries derived from IST date
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 330 * 60_000);
    const endOfDay   = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 330 * 60_000);

    const rawSlots = await prisma.slot.findMany({
      where: {
        teamId:    { in: teamIds },
        isBooked:  false,
        isBlocked: false,
        isHeld:    false,
        startTime: { gte: startOfDay, lte: endOfDay },
      },
      include: { team: true },
      orderBy: { startTime: "asc" },
    });

    const formattedSlots = rawSlots.flatMap((slot) => {
      const label = getSlotLabel(slot.startTime);
      if (!label) return [];
      return [{
        id:        slot.id,
        teamId:    slot.teamId,
        teamName:  slot.team.name,
        startTime: slot.startTime,
        endTime:   slot.endTime,
        slotLabel: label,
        slotOrder: SLOT_ORDER.indexOf(label),
      }];
    });

    const bookingWindows = applyLeadTimeFilter(
      buildBookingWindows(formattedSlots, normalizedPetCount),
      120
    );

    return NextResponse.json({
      city,
      date,
      petCount:            normalizedPetCount,
      totalRawSlots:       formattedSlots.length,
      totalBookingWindows: bookingWindows.length,
      bookingWindows,
    });
  } catch (error) {
    console.error("Slots API error:", error);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
