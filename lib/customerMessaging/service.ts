import type { Prisma, PrismaClient } from "../generated/prisma";
import {
  buildCustomerMessage,
  type ExtendedCustomerMessageType,
} from "./templates";

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

type DbClient = PrismaClient | Prisma.TransactionClient;

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

  const firstSlot = booking.slots[0]?.slot ?? null;
  const lastSlot = booking.slots[booking.slots.length - 1]?.slot ?? null;
  const windowLabel =
    firstSlot && lastSlot
      ? `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`
      : null;

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
