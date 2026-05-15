import type { PrismaClient } from "../generated/prisma";
import {
  OCCUPYING_BOOKING_SLOT_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "./occupancy";

type TransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type BookingSlotRef = {
  id: string;
  bookingId?: string;
  slotId: string;
};

const DEFAULT_RELEASED_SLOT_DATA = {
  isBooked: false,
  isHeld: false,
  holdExpiresAt: null,
};

export const ACTIVE_BOOKING_SLOT_WHERE = {
  status: { in: [...OCCUPYING_BOOKING_SLOT_STATUSES] },
};

export async function releaseBookingSlotReservations(
  tx: TransactionClient,
  bookingId: string,
  bookingSlots: BookingSlotRef[],
  slotData: Record<string, unknown> = DEFAULT_RELEASED_SLOT_DATA
) {
  const uniqueSlotIds = [...new Set(bookingSlots.map((item) => item.slotId))];

  if (bookingSlots.length) {
    await tx.bookingSlot.updateMany({
      where: {
        id: { in: bookingSlots.map((item) => item.id) },
        status: { in: [...OCCUPYING_BOOKING_SLOT_STATUSES] },
      },
      data: { status: "released" },
    });
  }

  for (const slotId of uniqueSlotIds) {
    await tx.slot.updateMany({
      where: {
        id: slotId,
        bookings: {
          none: {
            bookingId: { not: bookingId },
            status: { in: [...OCCUPYING_BOOKING_SLOT_STATUSES] },
            booking: { status: { in: [...OCCUPYING_BOOKING_STATUSES] } },
          },
        },
      },
      data: slotData,
    });
  }
}
