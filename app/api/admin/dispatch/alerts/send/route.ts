import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getPublicAppUrl, logAdminBookingEvent } from "../../../_lib/bookingAdmin";
import { getGroomerJobUrl } from "../../../../../../lib/groomerAccess";
import { sendTelegramMessage } from "../../../../../../lib/telegram/send";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-IN", {
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
    const { bookingId, teamId, alertType = "manual", messageOverride } = body as {
      bookingId?: string;
      teamId?: string;
      alertType?: string;
      messageOverride?: string;
    };

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        assignedTeam: true,
        service: true,
        pets: { include: { pet: true } },
        slots: { include: { slot: { include: { team: true } } }, orderBy: { slot: { startTime: "asc" } } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    const derivedTeamId = teamId || booking.assignedTeamId || booking.slots[0]?.slot.teamId;
    if (!derivedTeamId) return NextResponse.json({ error: "Booking has no assigned team" }, { status: 400 });

    const team = await prisma.team.findUnique({ where: { id: derivedTeamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    if (!team.telegramChatId) return NextResponse.json({ error: "Team has no Telegram chat ID" }, { status: 400 });
    if (!team.telegramAlertsEnabled) return NextResponse.json({ error: "Telegram alerts disabled for this team" }, { status: 400 });

    const firstSlot = booking.slots[0]?.slot;
    const timeRange = firstSlot
      ? `${formatTime(firstSlot.startTime)} – ${formatTime(booking.slots[booking.slots.length - 1].slot.endTime)}`
      : "TBD";

    const petSummary = booking.pets.map((bp) => `${bp.pet.name ?? "Unnamed"} (${bp.pet.breed})`).join(", ");
    const groomerJobUrl = getGroomerJobUrl({
      bookingId,
      phone: booking.user.phone,
      baseUrl: getPublicAppUrl(request),
    });

    const message = messageOverride ?? [
      `🐾 *All Tails Job Alert*`,
      ``,
      `*Service:* ${booking.service.name}`,
      `*Date:* ${booking.selectedDate ?? "TBD"}`,
      `*Time:* ${timeRange}`,
      `*Pet parent:* ${booking.user.name} (${maskPhone(booking.user.phone)})`,
      `*Pets:* ${petSummary}`,
      `*Payment:* ${booking.paymentStatus}`,
      ...(groomerJobUrl ? ["", `*Open job flow:* ${groomerJobUrl}`] : []),
      "",
      `Please open the job link and keep SOP updates live.`,
      `Kripya job link kholein aur SOP updates live mark karein.`,
      ``,
      `_Ref: ${booking.id.slice(0, 8)}_`,
    ].join("\n");

    let telegramMessageId: string | null = null;
    let success = false;
    let errorMsg: string | undefined;

    try {
      telegramMessageId = await sendTelegramMessage(team.telegramChatId, message);
      success = true;
    } catch (error) {
      errorMsg = error instanceof Error ? error.message : "Telegram send failed";
    }

    await prisma.dispatchAlert.create({
      data: {
        bookingId,
        teamId: derivedTeamId,
        alertType,
        telegramMessageId,
        success,
        errorMsg,
      },
    });

    await logAdminBookingEvent({
      bookingId,
      type: "dispatch_alert_sent",
      summary: success ? `Dispatch alert sent to ${team.name}` : `Dispatch alert failed for ${team.name}`,
      metadata: {
        teamId: derivedTeamId,
        alertType,
        success,
        errorMsg: errorMsg ?? null,
      },
    });

    if (!success) {
      return NextResponse.json({ error: errorMsg ?? "Failed to send alert" }, { status: 502 });
    }

    return NextResponse.json({ success: true, telegramMessageId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send alert" },
      { status: 500 }
    );
  }
}
