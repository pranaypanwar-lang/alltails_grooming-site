import { getBookingWindowDisplay } from "../booking/window";

export type CustomerBookingLike = {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  couponCode: string | null;
  originalAmount: number;
  finalAmount: number;
  refundAmount: number | null;
  selectedDate: string | null;
  bookingWindowId: string | null;
  createdAt: Date;
  updatedAt: Date;
  loyaltyRewardApplied: boolean;
  loyaltyCountedAt: Date | null;
  paymentFailedAt: Date | null;
  paymentExpiredAt: Date | null;
  serviceAddress?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  serviceLocationUrl?: string | null;
  addressUpdatedAt?: Date | null;
  dispatchState?: string;
  service: { name: string };
  assignedTeam?: { id: string; name: string } | null;
  groomerMember?: { id: string; name: string; role: string; currentRank: string } | null;
  slots?: Array<{
    slot: {
      id: string;
      startTime: Date;
      endTime: Date;
      team?: { id: string; name: string } | null;
    };
  }>;
  events?: Array<{
    type: string;
    summary: string;
    createdAt: Date;
  }>;
  customerMessages?: Array<{
    id: string;
    messageType: string;
    channel: string;
    status: string;
    recipient: string;
    preparedAt: Date;
    sentAt: Date | null;
    content: string;
  }>;
  supportCases?: Array<{
    id: string;
    category: string;
    status: string;
    priority: string;
    summary: string;
    resolution: string | null;
    openedAt: Date;
    resolvedAt: Date | null;
  }>;
};

export type CustomerPetLike = {
  id: string;
  name: string | null;
  breed: string;
  species: string;
  avatarUrl: string | null;
  defaultGroomingNotes: string | null;
  defaultStylingNotes: string | null;
  temperament: string | null;
  lastBookedAt: Date | null;
  assets?: Array<{
    kind: string;
    publicUrl: string;
  }>;
};

export type CustomerSupportCaseLike = {
  id: string;
  bookingId: string | null;
  category: string;
  status: string;
  priority: string;
  summary: string;
  resolution: string | null;
  openedAt: Date;
  resolvedAt: Date | null;
};

export type CustomerMessageLike = {
  id: string;
  bookingId: string;
  messageType: string;
  channel: string;
  status: string;
  recipient: string;
  preparedAt: Date;
  sentAt: Date | null;
  content: string;
};

export type AdminCustomerLifecycleStage =
  | "lead"
  | "first_booking_scheduled"
  | "first_time_customer"
  | "repeat_customer"
  | "loyal_customer"
  | "active_with_upcoming"
  | "at_risk"
  | "lost"
  | "support_hold";

export type AdminCustomerRiskFlag =
  | "due_soon"
  | "payment_risk"
  | "support_open"
  | "complaint_history"
  | "refund_history"
  | "loyalty_unlocked"
  | "upcoming_booking";

type LifecycleMetrics = {
  stage: AdminCustomerLifecycleStage;
  label: string;
  reason: string;
  riskFlags: AdminCustomerRiskFlag[];
  totalBookings: number;
  completedBookings: number;
  upcomingConfirmedBookings: number;
  cancelledOrExpiredBookings: number;
  totalSpent: number;
  refundedAmount: number;
  averageOrderValue: number;
  firstBookingAt: Date | null;
  lastCompletedAt: Date | null;
  nextBookingAt: Date | null;
  expectedNextBookingAt: Date | null;
  expectedCycleDays: number | null;
  daysOverdue: number | null;
  lastMessageAt: Date | null;
  openCaseCount: number;
  unresolvedComplaintCount: number;
};

const LONG_HAIR_KEYWORDS = [
  "poodle",
  "doodle",
  "bichon",
  "shih",
  "maltese",
  "yorkie",
  "persian",
  "maine coon",
  "ragdoll",
];

const DOUBLE_COAT_KEYWORDS = [
  "golden",
  "retriever",
  "german shepherd",
  "gsd",
  "husky",
  "pomeranian",
  "spitz",
];

const CAT_KEYWORDS = [
  "persian",
  "maine coon",
  "ragdoll",
  "siamese",
  "british shorthair",
  "bengal",
  "sphynx",
  "cat",
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function daysBetween(earlier: Date, later: Date) {
  return Math.round((later.getTime() - earlier.getTime()) / 86400000);
}

function toDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCompletedAt(booking: CustomerBookingLike) {
  const completedEvent = booking.events?.find((event) => event.type === "booking_completed");
  if (completedEvent) return completedEvent.createdAt;
  if (booking.loyaltyCountedAt) return booking.loyaltyCountedAt;
  if (booking.status === "completed") return booking.updatedAt;
  return null;
}

function getUpcomingAt(booking: CustomerBookingLike) {
  const firstSlot = booking.slots
    ?.map((item) => item.slot)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];
  if (firstSlot) return firstSlot.startTime;
  return toDateOnly(booking.selectedDate);
}

function inferCycleDays(pets: CustomerPetLike[], completedAts: Date[]) {
  if (completedAts.length >= 2) {
    const intervals: number[] = [];
    for (let index = 1; index < completedAts.length; index += 1) {
      intervals.push(daysBetween(completedAts[index - 1], completedAts[index]));
    }
    const observed = median(intervals);
    if (observed) return Math.max(21, Math.min(90, observed));
  }

  if (pets.length === 0) return 42;

  const speciesSet = new Set(pets.map((pet) => normalize(pet.species)));
  const breedText = pets.map((pet) => normalize(pet.breed)).join(" ");

  if (LONG_HAIR_KEYWORDS.some((keyword) => breedText.includes(keyword))) return 35;
  if (DOUBLE_COAT_KEYWORDS.some((keyword) => breedText.includes(keyword))) return 49;
  if (speciesSet.size === 1 && speciesSet.has("cat")) return 56;
  return 42;
}

export function inferPetSpecies(species: string | null | undefined, breed: string) {
  const normalizedSpecies = normalize(species);
  if (normalizedSpecies && normalizedSpecies !== "unknown") return normalizedSpecies;
  const breedText = normalize(breed);
  if (CAT_KEYWORDS.some((keyword) => breedText.includes(keyword))) return "cat";
  return "dog";
}

export function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
}

export function getCustomerLifecycleLabel(stage: AdminCustomerLifecycleStage) {
  return stage
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDerivedBookingStatus(
  booking: Pick<CustomerBookingLike, "status" | "paymentStatus" | "paymentExpiredAt">
) {
  if (booking.status === "payment_expired") return "payment_expired" as const;
  if (booking.status === "cancelled") return "cancelled" as const;
  if (booking.status === "completed") return "completed" as const;
  if (booking.status === "confirmed") return "confirmed" as const;
  if (booking.status === "pending_payment" && booking.paymentStatus === "expired") {
    return "payment_expired" as const;
  }
  return "pending_payment" as const;
}

export function getDerivedPaymentStatus(
  booking: Pick<CustomerBookingLike, "paymentStatus" | "status" | "paymentExpiredAt">
) {
  const derivedStatus = getDerivedBookingStatus(booking);
  if (derivedStatus === "payment_expired") return "expired" as const;
  if (booking.paymentStatus === "paid") return "paid" as const;
  if (booking.paymentStatus === "deposit_paid") return "deposit_paid" as const;
  if (booking.paymentStatus === "pending_cash_collection") return "pending_cash_collection" as const;
  if (booking.paymentStatus === "covered_by_loyalty") return "covered_by_loyalty" as const;
  return "unpaid" as const;
}

export function getDerivedBookingStatusLabel(status: ReturnType<typeof getDerivedBookingStatus>) {
  const labels = {
    pending_payment: "Pending payment",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    payment_expired: "Payment expired",
  };
  return labels[status];
}

export function getDerivedPaymentStatusLabel(status: ReturnType<typeof getDerivedPaymentStatus>) {
  const labels = {
    unpaid: "Pending payment",
    paid: "Paid",
    deposit_paid: "Deposit paid",
    pending_cash_collection: "Cash collection pending",
    covered_by_loyalty: "Covered by loyalty",
    expired: "Expired",
  };
  return labels[status];
}

export function getPaymentMethodLabel(value: string | null) {
  if (value === "pay_now") return "Pay now";
  if (value === "pay_after_service") return "Pay after service";
  if (value === "cash") return "Cash";
  return null;
}

export function buildLifecycleMetrics(input: {
  bookings: CustomerBookingLike[];
  pets: CustomerPetLike[];
  supportCases: CustomerSupportCaseLike[];
  messages: CustomerMessageLike[];
  loyaltyFreeUnlocked: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const bookings = [...input.bookings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const completedBookings = bookings.filter((booking) => getDerivedBookingStatus(booking) === "completed");
  const completedAts = completedBookings
    .map((booking) => getCompletedAt(booking))
    .filter((value): value is Date => !!value)
    .sort((a, b) => a.getTime() - b.getTime());
  const upcomingConfirmed = bookings
    .filter((booking) => getDerivedBookingStatus(booking) === "confirmed")
    .map((booking) => ({ booking, upcomingAt: getUpcomingAt(booking) }))
    .filter((entry): entry is { booking: CustomerBookingLike; upcomingAt: Date } => !!entry.upcomingAt && entry.upcomingAt >= now)
    .sort((a, b) => a.upcomingAt.getTime() - b.upcomingAt.getTime());

  const expectedCycleDays = completedAts.length > 0 ? inferCycleDays(input.pets, completedAts) : null;
  const lastCompletedAt = completedAts[completedAts.length - 1] ?? null;
  const expectedNextBookingAt =
    lastCompletedAt && expectedCycleDays
      ? new Date(lastCompletedAt.getTime() + expectedCycleDays * 86400000)
      : null;
  const daysOverdue =
    expectedNextBookingAt && upcomingConfirmed.length === 0
      ? daysBetween(expectedNextBookingAt, now)
      : null;

  const openCases = input.supportCases.filter((item) => item.status !== "resolved");
  const unresolvedComplaints = openCases.filter((item) =>
    ["quality_complaint", "payment_dispute"].includes(item.category)
  );
  const complaintHistoryCount = input.supportCases.filter((item) => item.category === "quality_complaint").length;
  const paymentRisk = bookings.some((booking) => !!booking.paymentFailedAt || !!booking.paymentExpiredAt);
  const refundHistory = bookings.some((booking) => (booking.refundAmount ?? 0) > 0);

  let stage: AdminCustomerLifecycleStage = "lead";
  let reason = "Profile exists, but no confirmed or completed booking yet.";

  if (unresolvedComplaints.length > 0) {
    stage = "support_hold";
    reason = "Unresolved complaint or dispute needs manual recovery before normal follow-up.";
  } else if (completedBookings.length === 0 && upcomingConfirmed.length > 0) {
    stage = "first_booking_scheduled";
    reason = "First booking is confirmed and upcoming.";
  } else if (completedBookings.length === 1 && upcomingConfirmed.length > 0) {
    stage = "active_with_upcoming";
    reason = "First completed booking exists and the next visit is already scheduled.";
  } else if (completedBookings.length === 1) {
    if ((daysOverdue ?? -999) > 21) {
      stage = "at_risk";
      reason = "Only one completed booking and no future booking beyond the expected window.";
    } else {
      stage = "first_time_customer";
      reason = "Exactly one completed booking with no next visit confirmed yet.";
    }
  } else if (completedBookings.length >= 2 && upcomingConfirmed.length > 0) {
    stage = "active_with_upcoming";
    reason = "Repeat customer with an upcoming confirmed booking.";
  } else if (completedBookings.length >= 5 || input.loyaltyFreeUnlocked) {
    if ((daysOverdue ?? -999) > ((expectedCycleDays ?? 42) + 14)) {
      stage = "lost";
      reason = "Previously loyal customer is far beyond the expected return window.";
    } else if ((daysOverdue ?? -999) > 14) {
      stage = "at_risk";
      reason = "Loyal customer has no future booking and is overdue.";
    } else {
      stage = "loyal_customer";
      reason = "High repeat history or loyalty unlock indicates a loyal customer.";
    }
  } else if (completedBookings.length >= 2) {
    if ((daysOverdue ?? -999) > ((expectedCycleDays ?? 42) + 14)) {
      stage = "lost";
      reason = "Repeat customer has crossed a long inactivity threshold.";
    } else if ((daysOverdue ?? -999) > 14) {
      stage = "at_risk";
      reason = "Repeat customer is overdue with no future booking.";
    } else {
      stage = "repeat_customer";
      reason = "Two or more completed bookings without current risk signals.";
    }
  } else if (bookings.some((booking) => getDerivedBookingStatus(booking) === "confirmed")) {
    stage = "first_booking_scheduled";
    reason = "Confirmed booking exists, but no completed history yet.";
  }

  const riskFlags: AdminCustomerRiskFlag[] = [];
  if (expectedNextBookingAt && upcomingConfirmed.length === 0) {
    const daysUntilDue = daysBetween(now, expectedNextBookingAt);
    if (daysUntilDue >= -7 && daysUntilDue <= 7) riskFlags.push("due_soon");
  }
  if (paymentRisk) riskFlags.push("payment_risk");
  if (openCases.length > 0) riskFlags.push("support_open");
  if (complaintHistoryCount > 0) riskFlags.push("complaint_history");
  if (refundHistory) riskFlags.push("refund_history");
  if (input.loyaltyFreeUnlocked) riskFlags.push("loyalty_unlocked");
  if (upcomingConfirmed.length > 0) riskFlags.push("upcoming_booking");

  const totalSpent = completedBookings.reduce((sum, booking) => sum + booking.finalAmount, 0);
  const refundedAmount = bookings.reduce((sum, booking) => sum + (booking.refundAmount ?? 0), 0);
  const firstBookingAt = bookings[0]?.createdAt ?? null;
  const nextBookingAt = upcomingConfirmed[0]?.upcomingAt ?? null;
  const lastMessageAt = input.messages
    .map((message) => message.sentAt ?? message.preparedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const metrics: LifecycleMetrics = {
    stage,
    label: getCustomerLifecycleLabel(stage),
    reason,
    riskFlags,
    totalBookings: bookings.length,
    completedBookings: completedBookings.length,
    upcomingConfirmedBookings: upcomingConfirmed.length,
    cancelledOrExpiredBookings: bookings.filter((booking) => {
      const status = getDerivedBookingStatus(booking);
      return status === "cancelled" || status === "payment_expired";
    }).length,
    totalSpent,
    refundedAmount,
    averageOrderValue: completedBookings.length > 0 ? Math.round(totalSpent / completedBookings.length) : 0,
    firstBookingAt,
    lastCompletedAt,
    nextBookingAt,
    expectedNextBookingAt,
    expectedCycleDays,
    daysOverdue: daysOverdue !== null && daysOverdue > 0 ? daysOverdue : null,
    lastMessageAt,
    openCaseCount: openCases.length,
    unresolvedComplaintCount: unresolvedComplaints.length,
  };

  return metrics;
}

export function getLatestSavedAddress(bookings: CustomerBookingLike[]) {
  const candidates = bookings
    .filter((booking) => booking.serviceAddress)
    .sort((a, b) => {
      const aTime = (a.addressUpdatedAt ?? a.createdAt).getTime();
      const bTime = (b.addressUpdatedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });

  const latest = candidates[0];
  if (!latest) return null;

  return {
    serviceAddress: latest.serviceAddress ?? null,
    serviceLandmark: latest.serviceLandmark ?? null,
    servicePincode: latest.servicePincode ?? null,
    serviceLocationUrl: latest.serviceLocationUrl ?? null,
    addressUpdatedAt: latest.addressUpdatedAt ?? latest.createdAt,
  };
}

export function buildCustomerTimeline(input: {
  bookings: CustomerBookingLike[];
  messages: CustomerMessageLike[];
  supportCases: CustomerSupportCaseLike[];
}) {
  const items: Array<{
    id: string;
    kind: "booking" | "message" | "support";
    at: Date;
    title: string;
    description: string;
    bookingId: string | null;
    tone: "default" | "warning" | "success" | "danger";
  }> = [];

  input.bookings.forEach((booking) => {
    items.push({
      id: `booking-created-${booking.id}`,
      kind: "booking",
      at: booking.createdAt,
      title: "Booking created",
      description: `${booking.service.name} booking was created.`,
      bookingId: booking.id,
      tone: "default",
    });

    booking.events?.forEach((event) => {
      items.push({
        id: `booking-event-${event.type}-${booking.id}-${event.createdAt.toISOString()}`,
        kind: "booking",
        at: event.createdAt,
        title: event.summary,
        description: event.type.replace(/_/g, " "),
        bookingId: booking.id,
        tone:
          event.type.includes("cancel") || event.type.includes("expired")
            ? "danger"
            : event.type.includes("completed")
              ? "success"
              : "default",
      });
    });
  });

  input.messages.forEach((message) => {
    items.push({
      id: `message-${message.id}`,
      kind: "message",
      at: message.sentAt ?? message.preparedAt,
      title: message.messageType.replace(/_/g, " "),
      description: `${message.channel} ${message.status}`,
      bookingId: message.bookingId,
      tone: message.status === "failed" ? "danger" : message.status === "sent" ? "success" : "default",
    });
  });

  input.supportCases.forEach((supportCase) => {
    items.push({
      id: `support-${supportCase.id}`,
      kind: "support",
      at: supportCase.openedAt,
      title: supportCase.summary,
      description: `${supportCase.category.replace(/_/g, " ")} • ${supportCase.status.replace(/_/g, " ")}`,
      bookingId: supportCase.bookingId,
      tone: supportCase.status === "resolved" ? "success" : supportCase.priority === "urgent" ? "danger" : "warning",
    });
  });

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export function getBookingWindowLabel(booking: CustomerBookingLike) {
  const sortedSlots = booking.slots
    ?.map((item) => item.slot)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) ?? [];

  const display = getBookingWindowDisplay({
    bookingWindowId: booking.bookingWindowId,
    selectedDate: booking.selectedDate,
    slots: sortedSlots,
  });

  return display?.displayLabel ?? null;
}
