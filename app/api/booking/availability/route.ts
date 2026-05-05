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

const getTodayIstDateKey = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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
        displayLabel:
          candidate.length === 1
            ? candidate[0].slotLabel
            : `${candidate[0].slotLabel} to ${candidate[candidate.length - 1].slotLabel}`,
      });
    }
  }

  return windows.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

function collapseDuplicateBookingWindows<
  T extends {
    bookingWindowId: string;
    teamId: string;
    teamName: string;
    petCount: number;
    startTime: string;
    endTime: string;
    slotLabels: SlotLabel[];
    slotIds: string[];
    displayLabel: string;
  },
>(windows: T[]) {
  const grouped = new Map<string, T>();

  for (const window of windows) {
    const key = [
      window.petCount,
      window.startTime,
      window.endTime,
      window.displayLabel,
      window.slotLabels.join("|"),
    ].join("__");

    if (!grouped.has(key)) {
      grouped.set(key, window);
    }
  }

  return [...grouped.values()].sort(
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
    const {
      city,
      startDate,
      days,
      petCount,
    }: { city?: string; startDate?: string; days?: number; petCount?: number } = body;

    if (!city || !startDate) {
      return NextResponse.json(
        { error: "city and startDate are required" },
        { status: 400 }
      );
    }

    if (startDate < getTodayIstDateKey()) {
      return NextResponse.json(
        { error: "Past dates are not available." },
        { status: 400 }
      );
    }

    const normalizedDays     = Math.max(1, Math.min(14, Number(days ?? 5)));
    const normalizedPetCount = Number(petCount ?? 1);

    if (Number.isNaN(normalizedPetCount) || normalizedPetCount < 1 || normalizedPetCount > 4) {
      return NextResponse.json(
        { error: "petCount must be between 1 and 4" },
        { status: 400 }
      );
    }

    const areaSlug = city.trim().toLowerCase().replace(/\s+/g, "-");

    // Self-heal: ensure slots exist for the entire requested range
    await ensureSlotsExistForDateRange(prisma, areaSlug, startDate, normalizedDays);

    const dateBlocks: Array<{
      date: string;
      totalRawSlots: number;
      totalBookingWindows: number;
      bookingWindows: ReturnType<typeof buildBookingWindows>;
    }> = [];

    for (let offset = 0; offset < normalizedDays; offset++) {
      const [y, m, d] = startDate.split("-").map(Number);
      const ist = new Date(Date.UTC(y, m - 1, d + offset));
      const dateKey = ist.toISOString().slice(0, 10);
      const weekday = ist.getUTCDay();

      if (weekday === 2) {
        dateBlocks.push({
          date: dateKey,
          totalRawSlots: 0,
          totalBookingWindows: 0,
          bookingWindows: [],
        });
        continue;
      }

      const teamIds = await resolveEligibleTeamIds(prisma, areaSlug, weekday);

      if (teamIds.length === 0) {
        dateBlocks.push({
          date: dateKey,
          totalRawSlots: 0,
          totalBookingWindows: 0,
          bookingWindows: [],
        });
        continue;
      }

      const istYear  = ist.getUTCFullYear();
      const istMonth = ist.getUTCMonth() + 1;
      const istDay   = ist.getUTCDate();
      // Day boundaries in UTC that correspond to IST calendar day
      const startOfDay = new Date(Date.UTC(istYear, istMonth - 1, istDay, 0, 0, 0, 0) - 330 * 60_000);
      const endOfDay   = new Date(Date.UTC(istYear, istMonth - 1, istDay, 23, 59, 59, 999) - 330 * 60_000);

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

      const bookingWindows = collapseDuplicateBookingWindows(
        applyLeadTimeFilter(
          buildBookingWindows(formattedSlots, normalizedPetCount),
          120
        )
      );

      dateBlocks.push({
        date: dateKey,
        totalRawSlots: formattedSlots.length,
        totalBookingWindows: bookingWindows.length,
        bookingWindows,
      });
    }

    return NextResponse.json({
      city,
      startDate,
      days: normalizedDays,
      petCount: normalizedPetCount,
      dates: dateBlocks,
    });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
