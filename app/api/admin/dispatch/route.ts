import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import type { Prisma } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { getAddressReadinessSummary } from "../../../../lib/booking/addressCapture";
import { getGamificationSnapshot } from "../../../../lib/groomerRewards";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
};

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

type DerivedBookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "payment_expired";

function getDerivedStatus(booking: { status: string; paymentMethod: string | null; paymentStatus: string; paymentExpiresAt?: Date | null }, now: Date): DerivedBookingStatus {
  if (booking.paymentMethod === "pay_now" && booking.paymentStatus !== "paid" && booking.paymentExpiresAt && booking.paymentExpiresAt <= now) return "payment_expired";
  if (booking.status === "confirmed") return "confirmed";
  if (booking.status === "completed") return "completed";
  if (booking.status === "cancelled") return "cancelled";
  if (booking.status === "payment_expired") return "payment_expired";
  return "pending_payment";
}

function getDispatchState(
  booking: { dispatchState: string; assignedTeamId: string | null },
  derivedStatus: DerivedBookingStatus
) {
  if (derivedStatus === "completed") return "completed";
  if (derivedStatus === "cancelled" || derivedStatus === "payment_expired") return "issue";
  if (!booking.assignedTeamId) return "unassigned";
  if (["assigned", "en_route", "started", "issue", "completed"].includes(booking.dispatchState)) {
    return booking.dispatchState;
  }
  return "assigned";
}

function getDispatchActions(
  derivedStatus: DerivedBookingStatus,
  hasTeam: boolean,
  dispatchState: string,
  hasGroomer: boolean
): string[] {
  if (derivedStatus === "confirmed") {
    const acts = ["open_details", "mark_completed", "reschedule", "relay_call"];
    if (hasTeam && dispatchState === "assigned") acts.push("mark_en_route");
    if (hasTeam && dispatchState === "en_route") acts.push("mark_started");
    acts.push(hasTeam ? "reassign_team" : "assign_team");
    if (hasTeam) acts.push(hasGroomer ? "reassign_groomer" : "assign_groomer");
    return acts;
  }
  if (derivedStatus === "pending_payment") {
    const acts = ["open_details", hasTeam ? "reassign_team" : "assign_team"];
    if (hasTeam) acts.push(hasGroomer ? "reassign_groomer" : "assign_groomer");
    return acts;
  }
  return ["open_details"];
}

function buildDispatchCard(
  booking: {
    id: string;
    status: string;
    paymentMethod: string | null;
    paymentStatus: string;
    paymentExpiresAt: Date | null;
    selectedDate: string | null;
    dispatchState: string;
    assignedTeamId: string | null;
    assignedTeam: { id: string; name: string } | null;
    groomerMember: {
      id: string;
      name: string;
      role: string;
      currentRank: string;
      currentXp: number;
      rewardPoints: number;
      trustScore: number;
      performanceScore: number;
      completedCount: number;
      onTimeCount: number;
      reviewCount: number;
      salaryHikeStage: number;
      punctualityStreak: number;
      reviewStreak: number;
      noLeaveStreakDays: number;
    } | null;
    user: { name: string; phone: string; city: string | null };
    service: { name: string };
    pets: Array<{ pet: { name: string | null; breed: string } }>;
    slots: Array<{ slot: { startTime: Date; endTime: Date; team: { id: string; name: string } } }>;
    loyaltyRewardApplied: boolean;
    loyaltyRewardLabel: string | null;
    serviceAddress: string | null;
    serviceLandmark: string | null;
    servicePincode: string | null;
    serviceLocationUrl: string | null;
  },
  now: Date
) {
  const sortedSlots = booking.slots
    .map((bookingSlot) => bookingSlot.slot)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const firstSlot = sortedSlots[0] ?? null;
  const lastSlot = sortedSlots[sortedSlots.length - 1] ?? null;
  const team = booking.assignedTeam ?? firstSlot?.team ?? null;

  const derivedStatus = getDerivedStatus(booking, now);
  const hasTeam = !!team;
  const hasGroomer = !!booking.groomerMember;
  const dispatchState = getDispatchState(booking, derivedStatus);

  const paymentExpiringSoon =
    booking.paymentMethod === "pay_now" &&
    booking.paymentStatus !== "paid" &&
    !!booking.paymentExpiresAt &&
    booking.paymentExpiresAt > now &&
    booking.paymentExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  const today = now.toISOString().slice(0, 10);
  const sameDay = booking.selectedDate === today;
  const addressInfo = getAddressReadinessSummary(booking);
  const delayRisk =
    !!firstSlot &&
    dispatchState === "assigned" &&
    firstSlot.startTime.getTime() > now.getTime() &&
    firstSlot.startTime.getTime() - now.getTime() <= 25 * 60 * 1000;

  const petSummary = booking.pets
    .map((bookingPet) => bookingPet.pet.name ? `${bookingPet.pet.name} (${bookingPet.pet.breed})` : bookingPet.pet.breed)
    .join(", ");
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
    bookingId: booking.id,
    status: derivedStatus,
    paymentStatus: booking.paymentStatus as string,
    customer: {
      name: booking.user.name,
      phoneMasked: maskPhone(booking.user.phone),
    },
    city: booking.user.city ?? null,
    serviceName: booking.service.name,
    groomerMember: booking.groomerMember
      ? {
          id: booking.groomerMember.id,
          name: booking.groomerMember.name,
          role: booking.groomerMember.role,
          currentRank: groomerGamification?.rank ?? booking.groomerMember.currentRank,
        }
      : null,
    pets: {
      count: booking.pets.length,
      summary: petSummary || `${booking.pets.length} pet(s)`,
    },
    bookingWindow: firstSlot && lastSlot ? {
      startTime: firstSlot.startTime.toISOString(),
      endTime: lastSlot.endTime.toISOString(),
      displayLabel: `${formatTime(firstSlot.startTime)} – ${formatTime(lastSlot.endTime)}`,
    } : null,
    loyalty: {
      rewardApplied: !!booking.loyaltyRewardApplied,
      rewardLabel: booking.loyaltyRewardLabel ?? null,
    },
    addressInfo,
    urgency: {
      sameDay,
      lateFill: sameDay && derivedStatus === "confirmed",
      paymentExpiringSoon,
      issueFlag: derivedStatus === "payment_expired" || derivedStatus === "cancelled" || delayRisk,
      addressPending: addressInfo.status !== "complete",
      delayRisk,
    },
    dispatchState,
    availableActions: getDispatchActions(derivedStatus, hasTeam, dispatchState, hasGroomer),
  };
}

export async function GET(req: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;
  try {
    const q = req.nextUrl.searchParams;
    const date = q.get("date");
    if (!date) return NextResponse.json({ error: "date query param is required (YYYY-MM-DD)" }, { status: 400 });

    const city = q.get("city") ?? undefined;
    const includeCompleted = q.get("includeCompleted") !== "false";
    const addressPendingOnly = q.get("addressPendingOnly") === "true";

    const now = new Date();

    const statusFilter: string[] = ["pending_payment", "confirmed"];
    if (includeCompleted) statusFilter.push("completed");

    const where: Prisma.BookingWhereInput = {
      selectedDate: date,
      status: { in: statusFilter },
    };
    if (city) where.user = { city: { contains: city, mode: "insensitive" } };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: true,
        assignedTeam: true,
        groomerMember: true,
        service: true,
        pets: { include: { pet: true } },
        slots: { include: { slot: { include: { team: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const cards = bookings.map((b) => buildDispatchCard(b, now));
    const filteredCards = addressPendingOnly
      ? cards.filter((card) => card.addressInfo.status !== "complete")
      : cards;

    const unassigned = filteredCards.filter((c) => c.dispatchState === "unassigned");
    const assigned = filteredCards.filter((c) =>
      c.dispatchState === "assigned" ||
      c.dispatchState === "en_route" ||
      c.dispatchState === "started" ||
      c.dispatchState === "completed"
    );
    const filteredBookingIds = new Set(filteredCards.map((card) => card.bookingId));

    // Group by team
    const teamMap = new Map<string, { team: { id: string; name: string }; cards: typeof filteredCards }>();

    for (const booking of bookings) {
      if (!filteredBookingIds.has(booking.id)) continue;

      const firstBs = booking.slots
        .slice()
        .sort((a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime())[0];
      const team = booking.assignedTeam ?? firstBs?.slot.team ?? null;
      if (!team) continue;

      const card = filteredCards.find((c) => c.bookingId === booking.id);
      if (!card) continue;

      if (!teamMap.has(team.id)) {
        teamMap.set(team.id, { team: { id: team.id, name: team.name }, cards: [] });
      }
      teamMap.get(team.id)!.cards.push(card);
    }

    const groups = Array.from(teamMap.values()).map(({ team, cards: teamCards }) => ({
      team,
      capacity: {
        totalWindows: null,
        assignedJobs: teamCards.filter((c) =>
          c.dispatchState === "assigned" ||
          c.dispatchState === "en_route" ||
          c.dispatchState === "started" ||
          c.dispatchState === "completed"
        ).length,
        freeWindows: null,
        overload: teamCards.length > 8,
      },
      bookings: teamCards,
    }));

    const sameDayCount = filteredCards.filter((c) => c.urgency.sameDay).length;
    const issueCount = filteredCards.filter((c) => c.urgency.issueFlag).length;
    const pendingPaymentCount = filteredCards.filter((c) => c.status === "pending_payment").length;
    const completedCount = filteredCards.filter((c) => c.status === "completed").length;
    const addressPendingCount = filteredCards.filter((c) => c.addressInfo.status !== "complete").length;
    const delayRiskCount = filteredCards.filter((c) => c.urgency.delayRisk).length;

    return NextResponse.json({
      date,
      city: city ?? null,
      summary: {
        totalBookings: filteredCards.length,
        unassignedCount: unassigned.length,
        assignedCount: assigned.length,
        completedCount,
        issueCount,
        pendingPaymentCount,
        sameDayLateFillCount: sameDayCount,
        addressPendingCount,
        delayRiskCount,
      },
      groups,
      unassigned,
    });
  } catch (error) {
    console.error("GET /api/admin/dispatch failed", error);
    return NextResponse.json({ error: "Failed to fetch dispatch board" }, { status: 500 });
  }
}
