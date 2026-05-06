export const OCCUPYING_BOOKING_STATUSES = ["pending_payment", "confirmed", "completed"] as const;
export const OCCUPYING_BOOKING_SLOT_STATUSES = ["confirmed", "hold"] as const;

type BookingSlotLike = {
  status: string;
  booking?: {
    status: string;
  } | null;
};

export function isOccupyingBookingSlot(bookingSlot: BookingSlotLike) {
  return (
    OCCUPYING_BOOKING_SLOT_STATUSES.includes(
      bookingSlot.status as (typeof OCCUPYING_BOOKING_SLOT_STATUSES)[number]
    ) &&
    !!bookingSlot.booking &&
    OCCUPYING_BOOKING_STATUSES.includes(
      bookingSlot.booking.status as (typeof OCCUPYING_BOOKING_STATUSES)[number]
    )
  );
}

export function getSlotOccupancyState(slot: {
  isBlocked: boolean;
  bookings?: BookingSlotLike[];
}): "free" | "held" | "booked" | "blocked" {
  if (slot.isBlocked) return "blocked";

  const occupyingBooking = slot.bookings?.find(isOccupyingBookingSlot);
  if (occupyingBooking?.status === "confirmed") return "booked";
  if (occupyingBooking?.status === "hold") return "held";

  return "free";
}

export function hasActiveSlotOccupancy(slot: {
  isBlocked: boolean;
  bookings?: BookingSlotLike[];
}) {
  return getSlotOccupancyState(slot) !== "free";
}

export function isSlotAvailableForBooking(slot: {
  isBlocked: boolean;
  bookings?: BookingSlotLike[];
}) {
  if (slot.isBlocked) return false;
  return !(slot.bookings ?? []).some(isOccupyingBookingSlot);
}
