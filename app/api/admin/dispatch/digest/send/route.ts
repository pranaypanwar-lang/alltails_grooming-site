import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getPublicAppUrl } from "../../../_lib/bookingAdmin";
import { getGroomerJobUrl } from "../../../../../../lib/groomerAccess";
import { getBookingWindowDisplay } from "../../../../../../lib/booking/window";
import { sendTelegramMessage } from "../../../../../../lib/telegram/send";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

    return await runDigestSend(date, getPublicAppUrl(request));
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, "Failed to send digest") }, { status: 500 });
  }
}

export async function runDigestSend(date: string, baseUrl?: string) {
  // Only confirmed bookings — pending_payment ones are not committed and
  // shouldn't reach the team digest.
  const bookings = await prisma.booking.findMany({
    where: {
      selectedDate: date,
      status: "confirmed",
    },
    include: {
      user: { select: { city: true, phone: true } },
      service: { select: { name: true } },
      pets: { include: { pet: { select: { name: true, breed: true } } } },
      // Authoritative source for the booking's team. Slots can lag after a
      // partial reschedule/reassign so we never derive the team from there.
      assignedTeam: true,
      // Exclude released BookingSlots from prior reschedules so timeWindow
      // reflects only the active visit, not a mix of old + new times.
      slots: {
        where: { status: { notIn: ["released"] } },
        include: { slot: { include: { team: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type DigestEntry = {
    bookingId: string;
    timeWindow: string;
    startMs: number;
    serviceName: string;
    area: string | null;
    petSummary: string;
    actionUrl: string | null;
  };

  const teamMap = new Map<string, {
    team: { id: string; name: string; telegramChatId: string | null; telegramAlertsEnabled: boolean };
    entries: DigestEntry[];
  }>();

  // Track exclusions for the response so admins can audit why a booking
  // wasn't sent.
  const skipped: Array<{ bookingId: string; reason: string; detail: string }> = [];

  for (const booking of bookings) {
    const sortedSlots = booking.slots
      .slice()
      .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime());

    const firstSlot = sortedSlots[0]?.slot ?? null;
    if (!firstSlot) {
      skipped.push({
        bookingId: booking.id,
        reason: "no_active_slots",
        detail: "Booking has no active BookingSlot rows (all released).",
      });
      continue;
    }

    const assigned = booking.assignedTeam;
    if (!assigned) {
      skipped.push({
        bookingId: booking.id,
        reason: "no_assigned_team",
        detail: "Booking has no assigned team — cannot send to any team digest.",
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
        detail: `assignedTeam "${assigned.name}" disagrees with slot.team "${firstSlot.team.name}". Investigate booking ${booking.id.slice(0, 8)}.`,
      });
      continue;
    }

    const team = {
      id: assigned.id,
      name: assigned.name,
      telegramChatId: assigned.telegramChatId,
      telegramAlertsEnabled: assigned.telegramAlertsEnabled,
    };

    const timeWindow =
      getBookingWindowDisplay({
        bookingWindowId: booking.bookingWindowId,
        selectedDate: booking.selectedDate,
        slots: sortedSlots.map((item) => item.slot),
      })?.displayLabel ?? "TBD";

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
      // Cache the slot start so we can sort entries chronologically per team
      // before formatting the digest message.
      startMs: firstSlot ? new Date(firstSlot.startTime).getTime() : Number.POSITIVE_INFINITY,
      serviceName: booking.service.name,
      petSummary: petSummary || `${booking.pets.length} pet(s)`,
      actionUrl: getGroomerJobUrl({
        bookingId: booking.id,
        phone: booking.user.phone,
        baseUrl,
      }),
    });
  }

  // Sort each team's entries chronologically by visit start time so the
  // groomer reads the digest in the order they will work tomorrow.
  for (const team of teamMap.values()) {
    team.entries.sort((a, b) => a.startMs - b.startMs);
  }

  const results: Array<{ teamId: string; teamName: string; success: boolean; error?: string }> = [];

  for (const { team, entries } of teamMap.values()) {
    if (!team.telegramChatId || !team.telegramAlertsEnabled) {
      results.push({ teamId: team.id, teamName: team.name, success: false, error: "Alerts disabled or no chat ID" });
      continue;
    }

    const lines = entries.map((e, i) => {
      const areaLine = e.area ? ` · ${e.area}` : "";
      const actionLine = e.actionUrl ? `\n   Link: ${e.actionUrl}` : "";
      return `${i + 1}. ${e.timeWindow}${areaLine} — ${e.serviceName} — ${e.petSummary}${actionLine}`;
    });

    const message = [
      "🌙 All Tails Night Schedule",
      `${date} - ${team.name}`,
      "",
      ...lines,
      "",
      `Total: ${entries.length} booking(s)`,
      "Please review tonight and use each job link tomorrow for live SOP updates.",
      "Kripya aaj raat schedule review karein aur kal live SOP updates ke liye har job link use karein.",
    ].join("\n");

    let telegramMessageId: string | null = null;
    let success = false;
    let errorMsg: string | undefined;

    try {
      telegramMessageId = await sendTelegramMessage(team.telegramChatId, message);
      success = true;
    } catch (error: unknown) {
      errorMsg = getErrorMessage(error, "Telegram send failed");
    }

    // Audit one alert per booking in this team's digest
    await prisma.dispatchAlert.createMany({
      data: entries.map((e) => ({
        bookingId: e.bookingId,
        teamId: team.id,
        alertType: "daily_digest",
        telegramMessageId,
        success,
        errorMsg,
      })),
    });

    results.push({ teamId: team.id, teamName: team.name, success, ...(errorMsg ? { error: errorMsg } : {}) });
  }

  return NextResponse.json({ date, results, skipped });
}
