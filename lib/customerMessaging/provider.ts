import type { Prisma, PrismaClient } from "../generated/prisma";
import { updateCustomerMessageStatus } from "./service";

type DbClient = PrismaClient | Prisma.TransactionClient;

type ProviderSendOutcome = {
  accepted: boolean;
  providerRef: string | null;
  error: string | null;
  finalStatus?: "queued" | "sent";
};

type MetaWebhookStatusPayload = {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

type BookingContext = {
  id: string;
  bookingSource: string;
  selectedDate: string | null;
  finalAmount: number;
  paymentMethod: string | null;
  user: {
    name: string;
    phone: string;
    city: string | null;
  };
  service: {
    name: string;
  };
  pets: Array<{
    name: string | null;
    breed: string;
  }>;
  slots: Array<{
    slot: {
      startTime: Date;
      endTime: Date;
    };
  }>;
  serviceAddress: string | null;
  serviceLandmark: string | null;
  servicePincode: string | null;
  serviceLocationUrl: string | null;
};

function getProviderName() {
  return process.env.WHATSAPP_PROVIDER?.trim() || "meta_cloud_api";
}

function getMetaBaseUrl() {
  return process.env.WHATSAPP_CLOUD_API_BASE_URL?.trim() || "https://graph.facebook.com";
}

function getMetaVersion() {
  return process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || "v23.0";
}

function getMetaApiToken() {
  return process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() || "";
}

function getMetaPhoneNumberId() {
  return process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID?.trim() || "";
}

function getWebhookVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || "";
}

function getCombirdsEndpoint() {
  return process.env.WHATSAPP_COMBIRDS_API_URL?.trim() || "https://backend.api-wa.co/campaign/combirds/api/v2";
}

function getCombirdsApiKey() {
  return process.env.WHATSAPP_COMBIRDS_API_KEY?.trim() || "";
}

function getCombirdsUserName() {
  return process.env.WHATSAPP_COMBIRDS_USERNAME?.trim() || "";
}

function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || "";
}

function getCombirdsMediaForMessageType(messageType: string) {
  const explicitUrl = process.env.WHATSAPP_COMBIRDS_MEDIA_URL?.trim();
  const explicitFilename =
    process.env.WHATSAPP_COMBIRDS_MEDIA_FILENAME?.trim() || "alltails_media";

  if (explicitUrl) {
    return {
      url: explicitUrl,
      filename: explicitFilename,
    };
  }

  const appUrl = getPublicAppUrl();
  if (!appUrl) return null;

  const mediaMap: Record<string, { path: string; filename: string }> = {
    booking_confirmation: {
      path: "/whatsapp/booking-confirmation.jpg",
      filename: "booking_confirmation",
    },
    night_before_reminder: {
      path: "/whatsapp/night-before-reminder.jpg",
      filename: "night_before_reminder",
    },
    post_groom_care: {
      path: "/whatsapp/post-groom-care.jpg",
      filename: "post_groom_care",
    },
    review_request: {
      path: "/whatsapp/review-request.jpg",
      filename: "review_request",
    },
    rebooking_reminder: {
      path: "/whatsapp/rebooking-reminder.jpeg",
      filename: "rebooking_reminder",
    },
  };

  const mapped = mediaMap[messageType];
  if (mapped) {
    return {
      url: `${appUrl}${mapped.path}`,
      filename: mapped.filename,
    };
  }

  return {
    url: `${appUrl}/icon.png`,
    filename: "alltails_icon",
  };
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatAmount(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function getBookingWindowLabel(booking: BookingContext) {
  const sortedSlots = [...booking.slots].sort(
    (a, b) => a.slot.startTime.getTime() - b.slot.startTime.getTime()
  );
  const firstSlot = sortedSlots[0]?.slot;
  const lastSlot = sortedSlots[sortedSlots.length - 1]?.slot;
  if (!firstSlot || !lastSlot) return "TBD";
  return `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`;
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function getPetLabel(booking: BookingContext) {
  const firstPet = booking.pets[0];
  if (!firstPet) return "your pet";
  return firstPet.name?.trim() || firstPet.breed;
}

function getAddressLine(booking: BookingContext) {
  const parts = [
    booking.serviceAddress,
    booking.serviceLandmark ? `Near ${booking.serviceLandmark}` : null,
    booking.servicePincode,
  ].filter(Boolean);

  if (parts.length) return parts.join(", ");
  return booking.user.city?.trim() || "Address to be shared";
}

function normalizeRecipientForMeta(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function normalizeRecipientForCombirds(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function getWebhookStatusDetails(payload: MetaWebhookStatusPayload) {
  const error = payload.errors?.[0];
  return error?.error_data?.details || error?.message || error?.title || null;
}

function getCombirdsTemplatePayload(
  message: {
    messageType: string;
    recipient: string;
    actionUrl?: string | null;
  },
  booking: BookingContext
) {
  const firstName = getFirstName(booking.user.name);
  const petLabel = getPetLabel(booking);
  const serviceName = booking.service.name;
  const selectedDate = booking.selectedDate ?? "TBD";
  const windowLabel = getBookingWindowLabel(booking);
  const addressLine = getAddressLine(booking);
  const amountText = formatAmount(booking.finalAmount);

  let campaignName = "";
  let templateParams: string[] = [];

  if (message.messageType === "booking_confirmation") {
    campaignName =
      booking.paymentMethod === "pay_after_service"
        ? "booking_confirmation_pay_after_service"
        : "booking_confirmation_paid";
    templateParams = [
      firstName,
      petLabel,
      serviceName,
      selectedDate,
      windowLabel,
      addressLine,
      amountText,
    ];
  } else if (message.messageType === "night_before_reminder") {
    campaignName = "night_before_reminder";
    templateParams = [firstName, petLabel, serviceName, selectedDate, windowLabel];
  } else if (message.messageType === "groomer_delay_update") {
    campaignName = "groomer_delay_update";
    templateParams = [
      firstName,
      petLabel,
      serviceName,
      windowLabel,
      "Our team will reach you shortly",
    ];
  } else if (message.messageType === "post_groom_care") {
    campaignName = "post_groom_care";
    templateParams = [firstName, petLabel];
  } else if (message.messageType === "review_request") {
    campaignName = "review_request";
    templateParams = [firstName, petLabel];
  } else if (message.messageType === "rebooking_reminder") {
    campaignName = "rebooking_reminder_5th_week";
    templateParams = [
      firstName,
      petLabel,
      "Reply BOOK and our team will help you with the next slot.",
    ];
  } else if (message.messageType === "team_on_the_way") {
    campaignName = "team_on_the_way1";
    templateParams = [firstName, petLabel, serviceName, windowLabel];
  } else if (message.messageType === "booking_cancelled_confirmation") {
    campaignName = "cancelled_booking_confirmed_626fd";
    templateParams = [firstName, petLabel, serviceName, selectedDate, windowLabel, addressLine];
  } else if (message.messageType === "booking_rescheduled_confirmation") {
    campaignName = "booking_rescheduled_confirmation";
    templateParams = [firstName, petLabel, serviceName, selectedDate, windowLabel, addressLine];
  } else if (message.messageType === "payment_retry_reminder") {
    campaignName = "payment_retry_reminder";
    templateParams = [
      firstName,
      petLabel,
      serviceName,
      selectedDate,
      windowLabel,
      amountText,
      message.actionUrl || "Please use your payment link from All Tails support.",
    ];
  } else {
    return {
      error: `No Commbirds campaign mapping for message type: ${message.messageType}`,
    };
  }

  return {
    error: null,
    body: {
      apiKey: getCombirdsApiKey(),
      campaignName,
      destination: normalizeRecipientForCombirds(message.recipient),
      userName: getCombirdsUserName(),
      templateParams,
      source: booking.bookingSource || "website",
      media: getCombirdsMediaForMessageType(message.messageType) ?? {},
      buttons: [],
      carouselCards: [],
      location: {},
      attributes: {},
    },
  };
}

export function getWhatsAppProviderDiagnostics() {
  const provider = getProviderName();
  return {
    provider,
    configured:
      (provider === "meta_cloud_api" &&
        Boolean(getMetaApiToken()) &&
        Boolean(getMetaPhoneNumberId())) ||
      (provider === "combirds" &&
        Boolean(getCombirdsApiKey()) &&
        Boolean(getCombirdsUserName())),
    hasWebhookVerifyToken: Boolean(getWebhookVerifyToken()),
  };
}

async function sendCustomerMessageViaMeta(message: {
  recipient: string;
  content: string;
}) : Promise<ProviderSendOutcome> {
  const token = getMetaApiToken();
  const phoneNumberId = getMetaPhoneNumberId();
  if (!token || !phoneNumberId) {
    return {
      accepted: false,
      providerRef: null,
      error: "WhatsApp Cloud API is not configured",
    };
  }

  const response = await fetch(
    `${getMetaBaseUrl()}/${getMetaVersion()}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeRecipientForMeta(message.recipient),
        type: "text",
        text: {
          body: message.content,
          preview_url: false,
        },
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError =
      data?.error?.error_user_msg ||
      data?.error?.message ||
      "WhatsApp provider rejected the message";
    return {
      accepted: false,
      providerRef: null,
      error: providerError,
    };
  }

  return {
    accepted: true,
    providerRef: typeof data?.messages?.[0]?.id === "string" ? data.messages[0].id : null,
    error: null,
    finalStatus: "queued",
  };
}

async function sendCustomerMessageViaCombirds(input: {
  message: {
    messageType: string;
    recipient: string;
    actionUrl?: string | null;
  };
  booking: BookingContext;
}) : Promise<ProviderSendOutcome> {
  const apiKey = getCombirdsApiKey();
  const userName = getCombirdsUserName();

  if (!apiKey || !userName) {
    return {
      accepted: false,
      providerRef: null,
      error: "Commbirds WhatsApp API is not configured",
    };
  }

  const mapped = getCombirdsTemplatePayload(input.message, input.booking);
  if (mapped.error || !mapped.body) {
    return {
      accepted: false,
      providerRef: null,
      error: mapped.error || "Failed to map Commbirds campaign payload",
    };
  }

  const response = await fetch(getCombirdsEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mapped.body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      accepted: false,
      providerRef: null,
      error:
        data?.message ||
        data?.error ||
        `Commbirds rejected campaign ${mapped.body.campaignName}`,
    };
  }

  return {
    accepted: true,
    providerRef:
      (typeof data?.id === "string" && data.id) ||
      (typeof data?.messageId === "string" && data.messageId) ||
      `combirds:${mapped.body.campaignName}:${Date.now()}`,
    error: null,
    finalStatus: "sent",
  };
}

export async function processQueuedCustomerMessages(
  prisma: DbClient,
  options?: { limit?: number; bookingId?: string; messageIds?: string[] }
) {
  const limit = options?.limit ?? 50;
  const bookingId = options?.bookingId?.trim();
  const messageIds = options?.messageIds?.filter(Boolean) ?? [];
  const messages = await prisma.bookingCustomerMessage.findMany({
    where: {
      status: "queued",
      providerRef: null,
      ...(bookingId ? { bookingId } : {}),
      ...(messageIds.length ? { id: { in: messageIds } } : {}),
    },
    include: {
      booking: {
        include: {
          user: true,
          service: true,
          pets: {
            include: {
              pet: true,
            },
          },
          slots: {
            include: {
              slot: true,
            },
          },
        },
      },
    },
    orderBy: { preparedAt: "asc" },
    take: limit,
  });

  const provider = getProviderName();
  const results: Array<{
    messageId: string;
    bookingId: string;
    sentToProvider: boolean;
    providerRef: string | null;
    error: string | null;
    nextStatus: "queued" | "sent" | "failed";
  }> = [];

  for (const message of messages) {
    const booking: BookingContext = {
      id: message.booking.id,
      bookingSource: message.booking.bookingSource,
      selectedDate: message.booking.selectedDate ?? null,
      finalAmount: message.booking.finalAmount,
      paymentMethod: message.booking.paymentMethod,
      user: {
        name: message.booking.user.name,
        phone: message.booking.user.phone,
        city: message.booking.user.city ?? null,
      },
      service: {
        name: message.booking.service.name,
      },
      pets: message.booking.pets.map((item) => ({
        name: item.pet.name,
        breed: item.pet.breed,
      })),
      slots: message.booking.slots.map((item) => ({
        slot: {
          startTime: item.slot.startTime,
          endTime: item.slot.endTime,
        },
      })),
      serviceAddress: message.booking.serviceAddress,
      serviceLandmark: message.booking.serviceLandmark,
      servicePincode: message.booking.servicePincode,
      serviceLocationUrl: message.booking.serviceLocationUrl,
    };

    const outcome =
      provider === "combirds"
        ? await sendCustomerMessageViaCombirds({
            message: {
              messageType: message.messageType,
              recipient: message.recipient,
              actionUrl: message.actionUrl,
            },
            booking,
          })
        : await sendCustomerMessageViaMeta({
            recipient: message.recipient,
            content: message.content,
          });

    if (outcome.accepted) {
      const nextStatus = outcome.finalStatus ?? "queued";
      await updateCustomerMessageStatus(prisma, message.id, {
        status: nextStatus,
        providerRef: outcome.providerRef,
      });

      results.push({
        messageId: message.id,
        bookingId: message.bookingId,
        sentToProvider: true,
        providerRef: outcome.providerRef,
        error: null,
        nextStatus,
      });
    } else {
      await updateCustomerMessageStatus(prisma, message.id, {
        status: "failed",
        errorMsg: outcome.error ?? "WhatsApp provider send failed",
      });

      results.push({
        messageId: message.id,
        bookingId: message.bookingId,
        sentToProvider: false,
        providerRef: null,
        error: outcome.error,
        nextStatus: "failed",
      });
    }
  }

  return {
    provider,
    configured: getWhatsAppProviderDiagnostics().configured,
    processedCount: messages.length,
    acceptedCount: results.filter((item) => item.sentToProvider).length,
    failedCount: results.filter((item) => !item.sentToProvider).length,
    results,
  };
}

export async function handleWhatsAppWebhookStatuses(
  prisma: DbClient,
  payload: unknown
) {
  const provider = getProviderName();
  if (provider !== "meta_cloud_api") {
    return {
      receivedCount: 0,
      updatedCount: 0,
      results: [] as Array<{ providerRef: string; updated: boolean; nextStatus: "sent" | "failed" | null }>,
    };
  }

  const statuses: MetaWebhookStatusPayload[] = [];

  if (
    typeof payload === "object" &&
    payload !== null &&
    "entry" in payload &&
    Array.isArray((payload as { entry?: unknown[] }).entry)
  ) {
    for (const entry of (payload as { entry: unknown[] }).entry) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        !("changes" in entry) ||
        !Array.isArray((entry as { changes?: unknown[] }).changes)
      ) {
        continue;
      }
      for (const change of (entry as { changes: unknown[] }).changes) {
        const value =
          typeof change === "object" && change !== null && "value" in change
            ? (change as { value?: unknown }).value
            : null;
        const changeStatuses =
          value &&
          typeof value === "object" &&
          "statuses" in value &&
          Array.isArray((value as { statuses?: unknown[] }).statuses)
            ? (value as { statuses: MetaWebhookStatusPayload[] }).statuses
            : [];
        statuses.push(...changeStatuses);
      }
    }
  }

  const results: Array<{
    providerRef: string;
    updated: boolean;
    nextStatus: "sent" | "failed" | null;
  }> = [];

  for (const statusPayload of statuses) {
    if (!statusPayload.id || !statusPayload.status) continue;

    const normalized =
      statusPayload.status === "failed"
        ? "failed"
        : ["sent", "delivered", "read"].includes(statusPayload.status)
          ? "sent"
          : null;

    if (!normalized) continue;

    const message = await prisma.bookingCustomerMessage.findFirst({
      where: { providerRef: statusPayload.id },
    });

    if (!message) {
      results.push({ providerRef: statusPayload.id, updated: false, nextStatus: normalized });
      continue;
    }

    await updateCustomerMessageStatus(prisma, message.id, {
      status: normalized,
      providerRef: statusPayload.id,
      errorMsg: normalized === "failed" ? getWebhookStatusDetails(statusPayload) : null,
    });

    results.push({ providerRef: statusPayload.id, updated: true, nextStatus: normalized });
  }

  return {
    receivedCount: statuses.length,
    updatedCount: results.filter((item) => item.updated).length,
    results,
  };
}

export function verifyWhatsAppWebhook(input: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}) {
  if (getProviderName() !== "meta_cloud_api") {
    return false;
  }

  const verifyToken = getWebhookVerifyToken();
  return Boolean(
    verifyToken &&
      input.mode === "subscribe" &&
      input.token &&
      input.token === verifyToken &&
      input.challenge
  );
}
