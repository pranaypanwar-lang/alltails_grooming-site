import { PrismaClient } from "../generated/prisma";
import { getGroomerJobUrl } from "../groomerAccess";
import { sendTelegramMessage } from "./send";

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export async function sendBookingDispatchAlert({
  prisma,
  bookingId,
  teamId,
  alertType = "manual",
  messageOverride,
  baseUrl,
}: {
  prisma: PrismaClient;
  bookingId: string;
  teamId?: string | null;
  alertType?: string;
  messageOverride?: string;
  baseUrl?: string;
}) {
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

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
  }

  const derivedTeamId = teamId || booking.assignedTeamId || booking.slots[0]?.slot.teamId;
  if (!derivedTeamId) {
    throw Object.assign(new Error("Booking has no assigned team"), { httpStatus: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: derivedTeamId } });
  if (!team) {
    throw Object.assign(new Error("Team not found"), { httpStatus: 404 });
  }
  if (!team.telegramChatId) {
    throw Object.assign(new Error("Team has no Telegram chat ID"), { httpStatus: 400 });
  }
  if (!team.telegramAlertsEnabled) {
    throw Object.assign(new Error("Telegram alerts disabled for this team"), { httpStatus: 400 });
  }

  const firstSlot = booking.slots[0]?.slot;
  const lastSlot = booking.slots[booking.slots.length - 1]?.slot;
  const timeRange = firstSlot && lastSlot
    ? `${formatTime(firstSlot.startTime)} - ${formatTime(lastSlot.endTime)}`
    : "TBD";

  const petSummary = booking.pets.map((bp) => `${bp.pet.name ?? "Unnamed"} (${bp.pet.breed})`).join(", ");
  const groomerJobUrl = getGroomerJobUrl({
    bookingId,
    phone: booking.user.phone,
    baseUrl,
  });

  const message = messageOverride ?? [
    "🐾 All Tails Job Alert",
    "",
    `Service: ${booking.service.name}`,
    `Date: ${booking.selectedDate ?? "TBD"}`,
    `Time: ${timeRange}`,
    `Pet parent: ${booking.user.name} (${maskPhone(booking.user.phone)})`,
    `Pets: ${petSummary}`,
    `Payment: ${booking.paymentStatus.replace(/_/g, " ")}`,
    ...(groomerJobUrl ? ["", `Open job flow: ${groomerJobUrl}`] : []),
    "",
    "Please open the job link and keep SOP updates live.",
    "Kripya job link kholein aur SOP updates live mark karein.",
    "",
    `Ref: ${booking.id.slice(0, 8)}`,
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

  return {
    booking,
    team,
    success,
    telegramMessageId,
    errorMsg,
  };
}
