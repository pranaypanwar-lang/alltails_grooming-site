import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { releaseBookingSlotReservations } from "../lib/slots/releaseBookingSlots";

describe("releaseBookingSlotReservations", () => {
  test("releases only active booking slots and does not clear another active booking's slot", async () => {
    const bookingSlotUpdates: unknown[] = [];
    const slotUpdates: unknown[] = [];
    const tx = {
      bookingSlot: {
        updateMany: async (input: unknown) => {
          bookingSlotUpdates.push(input);
          return { count: 1 };
        },
      },
      slot: {
        updateMany: async (input: unknown) => {
          slotUpdates.push(input);
          return { count: 0 };
        },
      },
    };

    await releaseBookingSlotReservations(tx as any, "booking-1", [
      { id: "booking-slot-active", bookingId: "booking-1", slotId: "slot-1" },
      { id: "booking-slot-released", bookingId: "booking-1", slotId: "slot-1" },
    ]);

    assert.deepEqual(bookingSlotUpdates, [
      {
        where: {
          id: { in: ["booking-slot-active", "booking-slot-released"] },
          status: { in: ["confirmed", "hold"] },
        },
        data: { status: "released" },
      },
    ]);
    assert.deepEqual(slotUpdates, [
      {
        where: {
          id: "slot-1",
          bookings: {
            none: {
              bookingId: { not: "booking-1" },
              status: { in: ["confirmed", "hold"] },
              booking: { status: { in: ["pending_payment", "confirmed", "completed"] } },
            },
          },
        },
        data: { isBooked: false, isHeld: false, holdExpiresAt: null },
      },
    ]);
  });
});
