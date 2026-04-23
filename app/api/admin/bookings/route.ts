import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { getGamificationSnapshot } from "../../../../lib/groomerRewards";
import { getBookingWindowDisplay } from "../../../../lib/booking/window";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const bookingListInclude = {
  user: true,
  assignedTeam: true,
  groomerMember: true,
  service: true,
  pets: { include: { pet: true } },
  slots: { include: { slot: { include: { team: true } } } },
} satisfies Prisma.BookingInclude;

type BookingListRecord = Prisma.BookingGetPayload<{ include: typeof bookingListInclude }>;

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
};

type DerivedBookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "payment_expired";
type DerivedPaymentStatus = "unpaid" | "paid" | "pending_cash_collection" | "covered_by_loyalty" | "expired";

function getDerivedStatus(booking: { status: string; paymentMethod: string | null; paymentStatus: string; paymentExpiresAt?: Date | null }, now: Date): DerivedBookingStatus {
  if (booking.paymentMethod === "pay_now" && booking.paymentStatus !== "paid" && booking.paymentExpiresAt && booking.paymentExpiresAt <= now) return "payment_expired";
  if (booking.status === "confirmed") return "confirmed";
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "payment_expired") return "payment_expired";
  return "pending_payment";
}

function getDerivedPaymentStatus(paymentStatus: string, derivedStatus: DerivedBookingStatus): DerivedPaymentStatus {
  if (derivedStatus === "payment_expired") return "expired";
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "pending_cash_collection") return "pending_cash_collection";
  if (paymentStatus === "covered_by_loyalty") return "covered_by_loyalty";
  return "unpaid";
}

function getStatusLabel(status: DerivedBookingStatus) {
  const map = { pending_payment: "Pending payment", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", payment_expired: "Payment expired" };
  return map[status];
}

function getPaymentStatusLabel(s: DerivedPaymentStatus) {
  const map = { unpaid: "Pending payment", paid: "Paid", pending_cash_collection: "Pay after service", covered_by_loyalty: "Covered by loyalty", expired: "Expired" };
  return map[s];
}

function getPaymentMethodLabel(m: string | null) {
  if (m === "pay_now") return "Pay now";
  if (m === "pay_after_service") return "Pay after service";
  return null;
}

function getAvailableActions(status: DerivedBookingStatus, teamId: string | null, groomerMemberId: string | null) {
  const actions: string[] = ["view_details"];
  if (status === "confirmed") {
    actions.push("mark_completed", "cancel", "reschedule", "relay_call", "send_customer_message");
    if (teamId) actions.push("reassign_team"); else actions.push("assign_team");
    if (teamId) actions.push(groomerMemberId ? "reassign_groomer" : "assign_groomer");
  }
  if (status === "pending_payment") {
    actions.push("cancel", "retry_payment_support");
    if (teamId) actions.push("reassign_team"); else actions.push("assign_team");
    if (teamId) actions.push(groomerMemberId ? "reassign_groomer" : "assign_groomer");
  }
  return actions;
}

function buildListItem(booking: BookingListRecord, now: Date, includeFullPhone = false) {
  const sortedSlots = booking.slots
    .map((bookingSlot) => bookingSlot.slot)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const firstSlot = sortedSlots[0] ?? null;
  const team = booking.assignedTeam ?? firstSlot?.team ?? null;
  const bookingWindowDisplay = getBookingWindowDisplay({
    bookingWindowId: booking.bookingWindowId,
    selectedDate: booking.selectedDate,
    slots: sortedSlots,
  });

  const derivedStatus = getDerivedStatus(booking, now);
  const derivedPaymentStatus = getDerivedPaymentStatus(booking.paymentStatus, derivedStatus);

  const today = now.toISOString().slice(0, 10);
  const sameDay = booking.selectedDate === today;

  const paymentExpiringSoon =
    booking.paymentMethod === "pay_now" &&
    booking.paymentStatus !== "paid" &&
    !!booking.paymentExpiresAt &&
    booking.paymentExpiresAt > now &&
    booking.paymentExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  const customer: { id: string; name: string; phoneMasked: string; phoneFull?: string } = {
    id: booking.user.id,
    name: booking.user.name,
    phoneMasked: maskPhone(booking.user.phone),
  };
  if (includeFullPhone) customer.phoneFull = booking.user.phone;

  const groomerGamification = booking.groomerMember
    ? getGamificationSnapshot({
        role: booking.groomerMember.role,
        currentXp: booking.groomerMember.currentXp,
        rewardPoints: booking.groomerMember.rewardPoints,
        trustScore: booking.groomerMember.trustScore,
        performanceScore: booking.groomerMember.performanceScore,
        completedCount: booking.groomerMember.completedCount,
        onTimeCount: booking.groomerMember.onTimeCount,
        reviewCount: booking.groomerMember.reviewCount,
        salaryHikeStage: booking.groomerMember.salaryHikeStage,
        punctualityStreak: booking.groomerMember.punctualityStreak,
        reviewStreak: booking.groomerMember.reviewStreak,
        noLeaveStreakDays: booking.groomerMember.noLeaveStreakDays,
      })
    : null;

  return {
    id: booking.id,
    status: derivedStatus,
    statusLabel: getStatusLabel(derivedStatus),
    paymentStatus: derivedPaymentStatus,
    paymentStatusLabel: getPaymentStatusLabel(derivedPaymentStatus),
    paymentMethod: booking.paymentMethod as "pay_now" | "pay_after_service" | null,
    paymentMethodLabel: getPaymentMethodLabel(booking.paymentMethod),
    selectedDate: booking.selectedDate ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    city: booking.user.city ?? null,
    service: { id: booking.service.id, name: booking.service.name },
    customer,
    team: team ? { id: team.id, name: team.name } : null,
    groomerMember: booking.groomerMember
      ? {
          id: booking.groomerMember.id,
          name: booking.groomerMember.name,
          role: booking.groomerMember.role,
          currentRank: groomerGamification?.rank ?? booking.groomerMember.currentRank,
          currentXp: booking.groomerMember.currentXp,
        }
      : null,
    bookingWindow: bookingWindowDisplay ? {
      bookingWindowId: booking.bookingWindowId ?? null,
      startTime: bookingWindowDisplay.startTime,
      endTime: bookingWindowDisplay.endTime,
      displayLabel: bookingWindowDisplay.displayLabel,
      slotIds: booking.slots.map((bookingSlot) => bookingSlot.slotId),
    } : null,
    pets: {
      count: booking.pets.length,
      names: booking.pets.map((bookingPet) => bookingPet.pet.name).filter(Boolean),
      breeds: booking.pets.map((bookingPet) => bookingPet.pet.breed),
    },
    financials: {
      originalAmount: booking.originalAmount,
      finalAmount: booking.finalAmount,
      discountAmount: Math.max(0, booking.originalAmount - booking.finalAmount),
      couponCode: booking.couponCode ?? null,
      currency: "INR" as const,
    },
    loyalty: {
      eligible: !!booking.loyaltyEligible,
      rewardApplied: !!booking.loyaltyRewardApplied,
      rewardRestored: !!booking.loyaltyRewardRestored,
      counted: !!booking.loyaltyCountedAt,
      completedCountBefore: booking.loyaltyCompletedCountBefore ?? null,
      completedCountAfter: booking.loyaltyCompletedCountAfter ?? null,
      rewardLabel: booking.loyaltyRewardLabel ?? null,
    },
    urgency: {
      sameDay,
      paymentExpiringSoon,
      needsAssignment: !team && (derivedStatus === "confirmed" || derivedStatus === "pending_payment"),
    },
    availableActions: getAvailableActions(derivedStatus, team?.id ?? null, booking.groomerMemberId ?? null),
  };
}

function compareValues(a: string | number, b: string | number, sortOrder: "asc" | "desc") {
  if (a < b) return sortOrder === "asc" ? -1 : 1;
  if (a > b) return sortOrder === "asc" ? 1 : -1;
  return 0;
}

function getServiceDateSortValue(item: ReturnType<typeof buildListItem>) {
  return `${item.selectedDate ?? "9999-12-31"}|${item.bookingWindow?.startTime ?? "23:59:59.999Z"}|${item.createdAt}`;
}

function getPaymentPriority(item: ReturnType<typeof buildListItem>) {
  if (item.status === "payment_expired") return 0;
  if (item.paymentStatus === "unpaid") return 1;
  if (item.paymentStatus === "pending_cash_collection") return 2;
  if (item.paymentStatus === "covered_by_loyalty") return 3;
  return 4;
}

function getAssignmentPriority(item: ReturnType<typeof buildListItem>) {
  if (item.urgency.needsAssignment) return 2;
  if (!item.groomerMember) return 1;
  return 0;
}

export async function GET(req: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const q = req.nextUrl.searchParams;

    const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(q.get("pageSize") ?? "25", 10)));

    const date = q.get("date") ?? undefined;
    const dateFrom = q.get("dateFrom") ?? undefined;
    const dateTo = q.get("dateTo") ?? undefined;
    const city = q.get("city") ?? undefined;
    const teamId = q.get("teamId") ?? undefined;
    const bookingStatus = q.get("bookingStatus") ?? undefined;
    const paymentStatus = q.get("paymentStatus") ?? undefined;
    const loyaltyState = q.get("loyaltyState") ?? undefined;
    const serviceName = q.get("serviceName") ?? undefined;
    const sameDayOnly = q.get("sameDayOnly") === "true";
    const needsAssignment = q.get("needsAssignment") === "true";
    const paymentExpiringSoon = q.get("paymentExpiringSoon") === "true";
    const tomorrowOnly = q.get("tomorrowOnly") === "true";
    const search = q.get("search")?.trim() ?? undefined;
    const tab = q.get("tab") ?? "active";
    const sortBy = q.get("sortBy") ?? "createdAt";
    const sortOrder = (q.get("sortOrder") ?? "desc") as "asc" | "desc";

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    const where: Prisma.BookingWhereInput = {};
    const userWhere: Prisma.UserWhereInput = {};

    if (date) {
      where.selectedDate = date;
    } else if (dateFrom || dateTo) {
      where.selectedDate = {};
      if (dateFrom) where.selectedDate.gte = dateFrom;
      if (dateTo) where.selectedDate.lte = dateTo;
    }
    if (sameDayOnly) where.selectedDate = todayStr;
    if (tomorrowOnly) where.selectedDate = tomorrowStr;

    if (city) userWhere.city = { contains: city, mode: "insensitive" };

    if (serviceName) where.service = { name: { contains: serviceName, mode: "insensitive" } };

    if (loyaltyState) {
      if (loyaltyState === "reward_applied") where.loyaltyRewardApplied = true;
      else if (loyaltyState === "reward_restored") where.loyaltyRewardRestored = true;
      else if (loyaltyState === "counted") where.loyaltyCountedAt = { not: null };
      else if (loyaltyState === "not_counted") { where.loyaltyEligible = true; where.loyaltyCountedAt = null; }
      else if (loyaltyState === "unlock_ready") userWhere.loyaltyFreeUnlocked = true;
    }

    if (Object.keys(userWhere).length > 0) where.user = userWhere;

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { user: { phone: { contains: search } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { pets: { some: { pet: { name: { contains: search, mode: "insensitive" } } } } },
      ];
    }

    const bookings = await prisma.booking.findMany({ where, include: bookingListInclude });

    const filteredItems = bookings
      .map((booking) => buildListItem(booking, now, true))
      .filter((item) => {
        const hasPastServiceDate = !!item.selectedDate && item.selectedDate < todayStr;
        const isCancelledExpired = item.status === "cancelled" || item.status === "payment_expired";
        const isPast = item.status === "completed" || (hasPastServiceDate && !isCancelledExpired);
        const isActive = !isCancelledExpired && !isPast;

        if (tab === "active" && !isActive) return false;
        if (tab === "today" && (!isActive || item.selectedDate !== todayStr)) return false;
        if (tab === "upcoming" && (!isActive || !item.selectedDate || item.selectedDate <= todayStr)) return false;
        if (tab === "past" && !isPast) return false;
        if (tab === "cancelled_expired" && !isCancelledExpired) return false;

        if (teamId === "unassigned" && item.team) return false;
        if (teamId && teamId !== "unassigned" && item.team?.id !== teamId) return false;
        if (bookingStatus && item.status !== bookingStatus) return false;
        if (paymentStatus && item.paymentStatus !== paymentStatus) return false;
        if (needsAssignment && !item.urgency.needsAssignment) return false;
        if (paymentExpiringSoon && !item.urgency.paymentExpiringSoon) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "serviceDate") {
          return compareValues(getServiceDateSortValue(a), getServiceDateSortValue(b), sortOrder);
        }
        if (sortBy === "updatedAt") {
          return compareValues(a.updatedAt, b.updatedAt, sortOrder);
        }
        if (sortBy === "team") {
          return compareValues(a.team?.name ?? "zzzz", b.team?.name ?? "zzzz", sortOrder);
        }
        if (sortBy === "city") {
          return compareValues(a.city ?? "", b.city ?? "", sortOrder);
        }
        if (sortBy === "finalAmount") {
          return compareValues(a.financials.finalAmount, b.financials.finalAmount, sortOrder);
        }
        if (sortBy === "customerName") {
          return compareValues(a.customer.name, b.customer.name, sortOrder);
        }
        if (sortBy === "paymentPriority") {
          return compareValues(getPaymentPriority(a), getPaymentPriority(b), sortOrder);
        }
        if (sortBy === "assignmentPriority") {
          return compareValues(getAssignmentPriority(a), getAssignmentPriority(b), sortOrder);
        }
        return compareValues(a.createdAt, b.createdAt, sortOrder);
      });

    const totalCount = filteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const skip = (normalizedPage - 1) * pageSize;
    const listItems = filteredItems.slice(skip, skip + pageSize);

    const pendingPaymentCount = filteredItems.filter((item) => item.status === "pending_payment").length;
    const confirmedCount = filteredItems.filter((item) => item.status === "confirmed").length;
    const completedCount = filteredItems.filter((item) => item.status === "completed").length;
    const cancelledCount = filteredItems.filter((item) => item.status === "cancelled").length;
    const paymentExpiredCount = filteredItems.filter((item) => item.status === "payment_expired").length;
    const unassignedCount = filteredItems.filter((item) => item.urgency.needsAssignment).length;
    const sameDayCount = filteredItems.filter((item) => item.urgency.sameDay).length;

    return NextResponse.json({
      page: normalizedPage,
      pageSize,
      totalCount,
      totalPages,
      summary: {
        pendingPaymentCount,
        confirmedCount,
        completedCount,
        cancelledCount,
        paymentExpiredCount,
        unassignedCount,
        sameDayCount,
      },
      bookings: listItems,
    });
  } catch (error) {
    console.error("GET /api/admin/bookings failed", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
