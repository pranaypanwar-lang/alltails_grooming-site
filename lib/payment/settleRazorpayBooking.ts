import type { Prisma, PrismaClient } from "../generated/prisma";
import {
  OCCUPYING_BOOKING_SLOT_STATUSES,
  OCCUPYING_BOOKING_STATUSES,
} from "../slots/occupancy";

type DbClient = PrismaClient | Prisma.TransactionClient;

type BookingForSettlement = Prisma.BookingGetPayload<{
  include: {
    user: true;
    service: true;
    slots: {
      include: {
        slot: {
          include: {
            bookings: {
              include: {
                booking: { select: { id: true; status: true } };
              };
            };
          };
        };
      };
    };
    _count: { select: { pets: true } };
  };
}>;

export type RazorpaySettlementResult = {
  booking: BookingForSettlement;
  alreadySettled: boolean;
  restoredSlotIds: string[];
  conflictedSlotIds: string[];
};

const SETTLED_PAYMENT_STATUSES = ["paid", "deposit_paid", "covered_by_loyalty"];
const ACTIVE_BOOKING_SLOT_STATUSES = [...OCCUPYING_BOOKING_SLOT_STATUSES];
const ACTIVE_BOOKING_STATUSES = [...OCCUPYING_BOOKING_STATUSES];

function getSettledPaymentStatus(paymentMethod: string | null) {
  return paymentMethod === "pay_after_service" ? "deposit_paid" : "paid";
}

function isSlotAvailableForThisBooking(
  slot: BookingForSettlement["slots"][number]["slot"],
  bookingId: string
) {
  if (slot.isBlocked) return false;

  return !slot.bookings.some(
    (bookingSlot) =>
      bookingSlot.bookingId !== bookingId &&
      ACTIVE_BOOKING_SLOT_STATUSES.includes(
        bookingSlot.status as (typeof ACTIVE_BOOKING_SLOT_STATUSES)[number]
      ) &&
      !!bookingSlot.booking &&
      ACTIVE_BOOKING_STATUSES.includes(
        bookingSlot.booking.status as (typeof ACTIVE_BOOKING_STATUSES)[number]
      )
  );
}

function getSettlementSlots(booking: BookingForSettlement) {
  const active = booking.slots.filter((bookingSlot) =>
    ACTIVE_BOOKING_SLOT_STATUSES.includes(
      bookingSlot.status as (typeof ACTIVE_BOOKING_SLOT_STATUSES)[number]
    )
  );
  if (active.length) return active;

  // If the hold-expiry cleanup ran before Razorpay callback/webhook reached us,
  // the booking's only rows may be released. Use those original rows so ops do
  // not lose the booking after a real captured payment.
  return booking.slots.filter((bookingSlot) => bookingSlot.status === "released");
}

export async function settleRazorpayBookingPayment(
  tx: DbClient,
  input: {
    bookingId?: string | null;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    source: "checkout_verify" | "webhook" | "reconcile";
  }
): Promise<RazorpaySettlementResult> {
  const booking = await tx.booking.findFirst({
    where: input.bookingId
      ? { id: input.bookingId }
      : { razorpayOrderId: input.razorpayOrderId },
    include: {
      user: true,
      service: true,
      slots: {
        include: {
          slot: {
            include: {
              bookings: {
                include: {
                  booking: { select: { id: true, status: true } },
                },
              },
            },
          },
        },
        orderBy: { slot: { startTime: "asc" } },
      },
      _count: { select: { pets: true } },
    },
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found for Razorpay order"), {
      httpStatus: 404,
    });
  }

  if (booking.razorpayOrderId !== input.razorpayOrderId) {
    throw Object.assign(new Error("Payment order does not match this booking"), {
      httpStatus: 409,
    });
  }

  const expectedPaymentStatus = getSettledPaymentStatus(booking.paymentMethod);
  const alreadySettled = SETTLED_PAYMENT_STATUSES.includes(booking.paymentStatus);
  if (alreadySettled) {
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        razorpayPaymentId: booking.razorpayPaymentId ?? input.razorpayPaymentId,
      },
      include: {
        user: true,
        service: true,
        slots: {
          include: {
            slot: {
              include: {
                bookings: {
                  include: {
                    booking: { select: { id: true, status: true } },
                  },
                },
              },
            },
          },
          orderBy: { slot: { startTime: "asc" } },
        },
        _count: { select: { pets: true } },
      },
    });

    return {
      booking: updated,
      alreadySettled: true,
      restoredSlotIds: [],
      conflictedSlotIds: [],
    };
  }

  const settlementSlots = getSettlementSlots(booking);
  const restoredSlotIds: string[] = [];
  const conflictedSlotIds: string[] = [];

  for (const bookingSlot of settlementSlots) {
    if (!isSlotAvailableForThisBooking(bookingSlot.slot, booking.id)) {
      conflictedSlotIds.push(bookingSlot.slotId);
      continue;
    }

    await tx.bookingSlot.update({
      where: { id: bookingSlot.id },
      data: { status: "confirmed" },
    });
    await tx.slot.update({
      where: { id: bookingSlot.slotId },
      data: { isBooked: true, isHeld: false, holdExpiresAt: null },
    });
    restoredSlotIds.push(bookingSlot.slotId);
  }

  const updated = await tx.booking.update({
    where: { id: booking.id },
    data: {
      paymentStatus: expectedPaymentStatus,
      status: "confirmed",
      dispatchState: conflictedSlotIds.length ? "issue" : booking.dispatchState,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      paymentPendingReason: conflictedSlotIds.length
        ? `paid_${input.source}_slot_conflict`
        : null,
      paymentGatewayError: null,
      paymentFailedAt: null,
      paymentExpiredAt: null,
    },
    include: {
      user: true,
      service: true,
      slots: {
        where: { status: { in: ACTIVE_BOOKING_SLOT_STATUSES } },
        include: {
          slot: {
            include: {
              bookings: {
                include: {
                  booking: { select: { id: true, status: true } },
                },
              },
            },
          },
        },
        orderBy: { slot: { startTime: "asc" } },
      },
      _count: { select: { pets: true } },
    },
  });

  return {
    booking: updated,
    alreadySettled: false,
    restoredSlotIds,
    conflictedSlotIds,
  };
}
