import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getPublicAppUrl } from "../../../_lib/bookingAdmin";
import { getGroomerJobUrl } from "../../../../../../lib/groomerAccess";
import { sendTelegramMessage } from "../../../../../../lib/telegram/send";

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
  const bookings = await prisma.booking.findMany({
    where: {
      selectedDate: date,
      status: { in: ["confirmed", "pending_payment"] },
    },
    include: {
      user: { select: { city: true, phone: true } },
      service: { select: { name: true } },
      pets: { include: { pet: { select: { name: true, breed: true } } } },
      slots: { include: { slot: { include: { team: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const teamMap = new Map<string, {
    team: { id: string; name: string; telegramChatId: string | null; telegramAlertsEnabled: boolean };
    entries: Array<{ bookingId: string; timeWindow: string; serviceName: string; area: string | null; petSummary: string; actionUrl: string | null }>;
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
      teamMap.set(team.id, { team, entries: [] });
    }

    teamMap.get(team.id)!.entries.push({
      bookingId: booking.id,
      area: booking.user.city ?? null,
      timeWindow,
      serviceName: booking.service.name,
      petSummary: petSummary || `${booking.pets.length} pet(s)`,
      actionUrl: getGroomerJobUrl({
        bookingId: booking.id,
        phone: booking.user.phone,
        baseUrl,
      }),
    });
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

  return NextResponse.json({ date, results });
}
