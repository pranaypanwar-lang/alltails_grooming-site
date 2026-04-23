import type { PrismaClient } from "../generated/prisma";
import { getBookingWindowDisplay } from "../booking/window";
import { sendAdminTelegramMessage } from "./send";

function buildAdminBookingUrl(baseUrl?: string | null) {
  const normalized = (baseUrl?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  return `${normalized}/admin/bookings`;
}

export async function sendNewBookingAdminAlert(params: {
  prisma: PrismaClient;
  bookingId: string;
  sourceLabel: string;
  baseUrl?: string | null;
}) {
  const booking = await params.prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      user: true,
      service: true,
      pets: { include: { pet: true } },
      assignedTeam: true,
      slots: {
        include: { slot: { include: { team: true } } },
        orderBy: { slot: { startTime: "asc" } },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found for Telegram admin alert");
  }

  const windowDisplay = getBookingWindowDisplay({
    bookingWindowId: booking.bookingWindowId,
    selectedDate: booking.selectedDate,
    slots: booking.slots.map((item) => item.slot),
  });

  const pets = booking.pets.length
    ? booking.pets.map((bp) => `${bp.pet.name ?? "Unnamed"} (${bp.pet.breed})`).join(", ")
    : "No pets listed";

  const teamName =
    booking.assignedTeam?.name ??
    booking.slots[0]?.slot.team?.name ??
    "Unassigned";

  const lines = [
    "New website booking received",
    "",
    `Service: ${booking.service.name}`,
    `Date: ${booking.selectedDate ?? "TBD"}`,
    `Time: ${windowDisplay?.displayLabel ?? "TBD"}`,
    `Customer: ${booking.user.name}`,
    `Phone: ${booking.user.phone}`,
    `City: ${booking.user.city ?? "TBD"}`,
    `Pets: ${pets}`,
    `Payment method: ${(booking.paymentMethod ?? "unknown").replace(/_/g, " ")}`,
    `Payment status: ${booking.paymentStatus.replace(/_/g, " ")}`,
    `Final amount: INR ${booking.finalAmount}`,
    `Source: ${params.sourceLabel}`,
    `Team: ${teamName}`,
    "",
    `Admin panel: ${buildAdminBookingUrl(params.baseUrl)}`,
    `Ref: ${booking.id.slice(0, 8)}`,
  ];

  return sendAdminTelegramMessage(lines.join("\n"), { parseMode: null });
}
