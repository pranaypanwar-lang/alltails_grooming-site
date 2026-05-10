import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
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

    // Only confirmed bookings get sent to teams. pending_payment bookings
    // (customer hasn't paid the deposit / full amount yet) are not real
    // commitments and would generate ghost entries in the team digest.
    const bookings = await prisma.booking.findMany({
      where: {
        selectedDate: date,
        status: "confirmed",
      },
      include: {
        user: { select: { city: true } },
        service: { select: { name: true } },
        pets: { include: { pet: { select: { name: true, breed: true } } } },
        // Source of truth for the team is booking.assignedTeam below — we
        // include assignedTeam to avoid relying on the slot's team relation,
        // which can drift after a partial reschedule/reassign.
        assignedTeam: true,
        // Exclude released BookingSlots from prior reschedules so the preview
        // shows the active visit window only.
        slots: {
          where: { status: { notIn: ["released"] } },
          include: { slot: { include: { team: true } } },
        },
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
        // Cached for chronological sort within the team digest.
        startMs: number;
        serviceName: string;
        petCount: number;
        petSummary: string;
        notesSummary: string | null;
      }>;
    }>();

    // Track bookings that were excluded so the admin can see why a "missing"
    // booking didn't appear (e.g. unassigned, slot/team drift).
    const skipped: Array<{
      bookingId: string;
      reason:
        | "no_assigned_team"
        | "team_inactive"
        | "no_active_slots"
        | "team_drift";
      detail: string;
    }> = [];

    for (const booking of bookings) {
      const sortedSlots = booking.slots
        .slice()
        .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime());

      const firstSlot = sortedSlots[0]?.slot ?? null;
      const lastSlot = sortedSlots[sortedSlots.length - 1]?.slot ?? null;

      if (!firstSlot) {
        skipped.push({
          bookingId: booking.id,
          reason: "no_active_slots",
          detail: "Booking has no active BookingSlot rows (all released).",
        });
        continue;
      }

      // Authoritative team is booking.assignedTeam — slots can lag during
      // reassign edge cases; if they disagree, trust assignedTeam.
      const assigned = booking.assignedTeam;
      if (!assigned) {
        skipped.push({
          bookingId: booking.id,
          reason: "no_assigned_team",
          detail: "Booking has no assigned team — cannot include in any digest.",
        });
        continue;
      }

      if (!assigned.isActive) {
        skipped.push({
          bookingId: booking.id,
          reason: "team_inactive",
          detail: `Assigned team "${assigned.name}" is marked inactive.`,
        });
        continue;
      }

      if (firstSlot.team && firstSlot.team.id !== assigned.id) {
        skipped.push({
          bookingId: booking.id,
          reason: "team_drift",
          detail: `assignedTeam "${assigned.name}" disagrees with slot.team "${firstSlot.team.name}". This is usually a stale BookingSlot from a reassign that didn't release cleanly. Investigate booking ${booking.id.slice(0, 8)}.`,
        });
        continue;
      }

      const team = { id: assigned.id, name: assigned.name };

      const timeWindow =
        firstSlot && lastSlot
          ? `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`
          : "TBD";

      const petSummary = booking.pets
        .map((bp) => bp.pet.name ? `${bp.pet.name} (${bp.pet.breed})` : bp.pet.breed)
        .join(", ");

      if (!teamMap.has(team.id)) {
        teamMap.set(team.id, { team, entries: [] });
      }

      teamMap.get(team.id)!.entries.push({
        bookingId: booking.id,
        area: booking.user.city ?? null,
        timeWindow,
        startMs: firstSlot ? new Date(firstSlot.startTime).getTime() : Number.POSITIVE_INFINITY,
        serviceName: booking.service.name,
        petCount: booking.pets.length,
        petSummary: petSummary || `${booking.pets.length} pet(s)`,
        notesSummary: null,
      });
    }

    // Sort each team's entries chronologically so the preview matches the
    // order the groomer will work the next day.
    for (const team of teamMap.values()) {
      team.entries.sort((a, b) => a.startMs - b.startMs);
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

    return NextResponse.json({ date, teams, skipped });
  } catch (error) {
    console.error("POST /api/admin/dispatch/digest/preview failed", error);
    return NextResponse.json({ error: "Failed to generate digest preview" }, { status: 500 });
  }
}
