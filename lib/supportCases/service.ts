import type { Prisma, PrismaClient } from "../generated/prisma";
import { getAddressReadinessSummary } from "../booking/addressCapture";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type AutomatedSupportCategory =
  | "failed_payment"
  | "missing_address"
  | "groomer_delay";

type AutomatedSupportCaseInput = {
  bookingId: string;
  category: AutomatedSupportCategory;
  priority: "high" | "urgent";
  summary: string;
  details: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowDate() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

export async function createAutomatedSupportCase(
  prisma: DbClient,
  input: AutomatedSupportCaseInput
) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      user: true,
      service: true,
    },
  });

  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { httpStatus: 404 });
  }

  const existing = await prisma.bookingSupportCase.findFirst({
    where: {
      bookingId: input.bookingId,
      category: input.category,
      source: "system",
      status: { in: ["open", "in_progress"] },
    },
    orderBy: { openedAt: "desc" },
  });

  if (existing) {
    return { created: false as const, case: existing };
  }

  const supportCase = await prisma.bookingSupportCase.create({
    data: {
      bookingId: input.bookingId,
      category: input.category,
      status: "open",
      priority: input.priority,
      source: "system",
      summary: input.summary,
      details: input.details,
      customerName: booking.user.name,
      customerPhone: booking.user.phone,
      city: booking.user.city,
      openedBy: "system",
    },
  });

  return { created: true as const, case: supportCase };
}

export async function scanAutomatedSupportSignals(prisma: DbClient) {
  const now = new Date();
  const today = getTodayDate();
  const tomorrow = getTomorrowDate();

  const paymentBookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ["completed", "cancelled"] },
      OR: [
        { status: "payment_expired" },
        { paymentStatus: "expired" },
        { paymentExpiredAt: { not: null } },
        {
          AND: [
            { paymentStatus: { notIn: ["paid", "covered_by_loyalty", "pending_cash_collection"] } },
            { paymentFailedAt: { not: null } },
          ],
        },
      ],
    },
    include: {
      user: true,
      service: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const missingAddressBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      selectedDate: { in: [today, tomorrow] },
    },
    include: {
      user: true,
      service: true,
    },
    orderBy: { selectedDate: "asc" },
  });

  const groomerDelayBookings = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      selectedDate: today,
      assignedTeamId: { not: null },
      dispatchState: "assigned",
      slots: {
        some: {
          slot: {
            startTime: {
              gt: now,
              lte: new Date(now.getTime() + 25 * 60 * 1000),
            },
          },
        },
      },
    },
    include: {
      user: true,
      service: true,
      slots: {
        include: { slot: true },
        orderBy: { slot: { startTime: "asc" } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const results: Array<{
    bookingId: string;
    category: AutomatedSupportCategory;
    created: boolean;
  }> = [];

  for (const booking of paymentBookings) {
    const isExpired = booking.status === "payment_expired" || booking.paymentStatus === "expired" || !!booking.paymentExpiredAt;
    const outcome = await createAutomatedSupportCase(prisma, {
      bookingId: booking.id,
      category: "failed_payment",
      priority: isExpired ? "urgent" : "high",
      summary: isExpired ? "Payment expired before booking confirmation" : "Payment follow-up required",
      details: isExpired
        ? "The booking payment window expired and the customer needs follow-up or a retry-payment flow."
        : "A payment attempt failed or remains unresolved and should be followed up before the slot is lost.",
    });
    results.push({ bookingId: booking.id, category: "failed_payment", created: outcome.created });
  }

  for (const booking of missingAddressBookings) {
    const address = getAddressReadinessSummary(booking);
    if (address.status === "complete") continue;

    const outcome = await createAutomatedSupportCase(prisma, {
      bookingId: booking.id,
      category: "missing_address",
      priority: booking.selectedDate === today ? "urgent" : "high",
      summary: booking.selectedDate === today ? "Today’s booking is still missing address details" : "Upcoming booking is missing address details",
      details:
        address.status === "partial"
          ? "The booking has partial address information. Ops should collect the missing address or live location before dispatch."
          : "The booking is confirmed but still missing full address and live location details.",
    });
    results.push({ bookingId: booking.id, category: "missing_address", created: outcome.created });
  }

  for (const booking of groomerDelayBookings) {
    const slotStart = booking.slots[0]?.slot.startTime ?? null;
    const outcome = await createAutomatedSupportCase(prisma, {
      bookingId: booking.id,
      category: "groomer_delay",
      priority: "urgent",
      summary: "Same-day groomer delay risk",
      details: slotStart
        ? `The assigned booking is within 25 minutes of the service window (${slotStart.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}) and is still not marked en route.`
        : "The assigned booking appears at risk and should be checked immediately.",
    });
    results.push({ bookingId: booking.id, category: "groomer_delay", created: outcome.created });
  }

  return {
    scanned: {
      failedPayment: paymentBookings.length,
      missingAddress: missingAddressBookings.length,
      groomerDelay: groomerDelayBookings.length,
    },
    createdCount: results.filter((item) => item.created).length,
    skippedCount: results.filter((item) => !item.created).length,
    results,
  };
}
