import type { Prisma, PrismaClient } from "../generated/prisma";
import { getBookingWindowDisplay } from "../booking/window";
import {
  buildCustomerMessage,
  type ExtendedCustomerMessageType,
} from "./templates";

type DbClient = PrismaClient | Prisma.TransactionClient;

const BOOKING_LIFECYCLE_MESSAGE_TYPES: ExtendedCustomerMessageType[] = [
  "booking_confirmation",
  "booking_cancelled_confirmation",
  "booking_rescheduled_confirmation",
  "payment_retry_reminder",
  "team_on_the_way",
  "groomer_delay_update",
];

export async function prepareCustomerMessageForBooking(
  prisma: DbClient,
  bookingId: string,
  messageType: ExtendedCustomerMessageType,
  options?: {
    skipIfPreparedAfter?: Date | null;
    customText?: string | null;
    offerCode?: string | null;
    actionUrl?: string | null;
    deliveryStatus?: "prepared" | "queued";
  }
) {
  if (options?.skipIfPreparedAfter) {
    const existing = await prisma.bookingCustomerMessage.findFirst({
      where: {
        bookingId,
        messageType,
        preparedAt: { gte: options.skipIfPreparedAfter },
      },
      orderBy: { preparedAt: "desc" },
    });

    if (existing) {
      return { created: false as const, message: existing };
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      service: true,
      slots: {
        include: { slot: true },
        orderBy: { slot: { startTime: "asc" } },
      },
    },
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
  }

  const windowLabel = getBookingWindowDisplay({
    bookingWindowId: booking.bookingWindowId,
    selectedDate: booking.selectedDate,
    slots: booking.slots.map((item) => item.slot),
  })?.displayLabel ?? null;

  const paymentStatusLabel =
    booking.paymentStatus === "paid"
      ? "Paid"
      : booking.paymentStatus === "pending_cash_collection"
        ? "Pay after service"
        : booking.paymentStatus === "covered_by_loyalty"
          ? "Covered by loyalty"
          : booking.paymentStatus === "expired"
            ? "Expired"
            : "Pending payment";

  const paymentMethodLabel =
    booking.paymentMethod === "pay_now"
      ? "Pay now"
      : booking.paymentMethod === "pay_after_service"
        ? "Pay after service"
        : null;

  const message = buildCustomerMessage(
    {
      bookingId: booking.id,
      customerName: booking.user.name,
      customerPhone: booking.user.phone,
      city: booking.user.city ?? null,
      serviceName: booking.service.name,
      selectedDate: booking.selectedDate ?? null,
      windowLabel,
      paymentStatusLabel,
      paymentMethodLabel,
      finalAmount: booking.finalAmount,
      serviceAddress: booking.serviceAddress ?? null,
      serviceLandmark: booking.serviceLandmark ?? null,
      servicePincode: booking.servicePincode ?? null,
      serviceLocationUrl: booking.serviceLocationUrl ?? null,
      customText: options?.customText ?? null,
      offerCode: options?.offerCode ?? null,
    },
    messageType
  );

  const customerMessage = await prisma.bookingCustomerMessage.create({
    data: {
      bookingId,
      channel: message.channel,
      messageType: message.messageType,
      language: message.language,
      status: options?.deliveryStatus ?? "prepared",
      recipient: message.recipient || booking.user.phone,
      content: message.body,
      actionUrl: options?.actionUrl ?? message.whatsappUrl,
    },
  });

  return { created: true as const, message: customerMessage, addressStatus: message.addressStatus };
}

export async function supersedeQueuedBookingLifecycleMessages(
  prisma: DbClient,
  bookingId: string,
  options?: { keepMessageTypes?: ExtendedCustomerMessageType[] }
) {
  const keepMessageTypes = new Set(options?.keepMessageTypes ?? []);

  const result = await prisma.bookingCustomerMessage.updateMany({
    where: {
      bookingId,
      status: "queued",
      providerRef: null,
      messageType: {
        in: BOOKING_LIFECYCLE_MESSAGE_TYPES.filter((type) => !keepMessageTypes.has(type)),
      },
    },
    data: {
      status: "failed",
      errorMsg: "Superseded by a newer booking lifecycle event",
    },
  });

  return result.count;
}

export async function updateCustomerMessageStatus(
  prisma: DbClient,
  messageId: string,
  input: {
    status: "prepared" | "queued" | "sent" | "failed";
    providerRef?: string | null;
    errorMsg?: string | null;
  }
) {
  const existing = await prisma.bookingCustomerMessage.findUnique({
    where: { id: messageId },
  });

  if (!existing) {
    throw Object.assign(new Error("Customer message not found"), { httpStatus: 404 });
  }

  const nextStatus = input.status;
  const sentAt =
    nextStatus === "sent"
      ? existing.sentAt ?? new Date()
      : nextStatus === "failed"
        ? null
        : existing.sentAt;

  const updated = await prisma.bookingCustomerMessage.update({
    where: { id: messageId },
    data: {
      status: nextStatus,
      providerRef: input.providerRef ?? existing.providerRef,
      errorMsg: nextStatus === "failed" ? input.errorMsg ?? "Message delivery failed" : null,
      sentAt,
    },
  });

  return updated;
}
