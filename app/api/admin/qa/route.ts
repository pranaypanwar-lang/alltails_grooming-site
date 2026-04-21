import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import { BOOKING_SOP_STEPS } from "../../../../lib/booking/sop";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 2) + "xxxxxx" + phone.slice(-2);
};

type DerivedBookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "payment_expired";
type DerivedPaymentStatus = "unpaid" | "paid" | "pending_cash_collection" | "covered_by_loyalty" | "expired";
type QaStatus = "not_started" | "in_progress" | "complete" | "issue";

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function getDerivedStatus(
  booking: { status: string; paymentMethod: string | null; paymentStatus: string; paymentExpiresAt?: Date | null },
  now: Date
): DerivedBookingStatus {
  if (
    booking.paymentMethod === "pay_now" &&
    booking.paymentStatus !== "paid" &&
    booking.paymentExpiresAt &&
    booking.paymentExpiresAt <= now
  ) {
    return "payment_expired";
  }
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
  return {
    pending_payment: "Pending payment",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    payment_expired: "Payment expired",
  }[status];
}

function getPaymentMethodLabel(method: string | null) {
  if (method === "pay_now") return "Pay now";
  if (method === "pay_after_service") return "Pay after service";
  return null;
}

function getQaStatus(input: {
  requiredCompletedCount: number;
  requiredTotalCount: number;
  paymentMismatchFlag: boolean;
}): { qaStatus: QaStatus; qaStatusLabel: string } {
  if (input.paymentMismatchFlag) return { qaStatus: "issue", qaStatusLabel: "Issue" };
  if (input.requiredCompletedCount === 0) return { qaStatus: "not_started", qaStatusLabel: "Not started" };
  if (input.requiredCompletedCount >= input.requiredTotalCount) return { qaStatus: "complete", qaStatusLabel: "Complete" };
  return { qaStatus: "in_progress", qaStatusLabel: "In progress" };
}

export async function GET(req: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = req.nextUrl.searchParams;
    const search = q.get("search")?.trim() ?? "";
    const teamId = q.get("teamId") ?? "";
    const date = q.get("date") ?? "";
    const qaStatusFilter = q.get("qaStatus") ?? "";
    const mismatchOnly = q.get("mismatchOnly") === "true";
    const now = new Date();

    const where: {
      selectedDate?: string;
      assignedTeamId?: string | null;
      OR?: Array<object>;
    } = {};

    if (date) where.selectedDate = date;
    if (teamId === "unassigned") where.assignedTeamId = null;
    else if (teamId) where.assignedTeamId = teamId;

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" as const } },
        { user: { phone: { contains: search } } },
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { pets: { some: { pet: { name: { contains: search, mode: "insensitive" as const } } } } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: true,
        service: true,
        assignedTeam: true,
        slots: { include: { slot: { include: { team: true } } } },
        sopSteps: true,
        paymentCollection: true,
      },
    });

    const requiredStepDefinitions = BOOKING_SOP_STEPS.filter((step) => step.requiredForCompletion);

    const rows = bookings
      .map((booking) => {
        const sortedSlots = [...booking.slots].sort(
          (a, b) => new Date(a.slot.startTime).getTime() - new Date(b.slot.startTime).getTime()
        );
        const firstSlot = sortedSlots[0] ?? null;
        const lastSlot = sortedSlots[sortedSlots.length - 1] ?? null;
        const team = booking.assignedTeam ?? firstSlot?.slot.team ?? null;

        const derivedStatus = getDerivedStatus(booking, now);
        const derivedPaymentStatus = getDerivedPaymentStatus(booking.paymentStatus, derivedStatus);
        const completedStepKeys = new Set(
          booking.sopSteps.filter((step) => step.status === "completed").map((step) => step.stepKey)
        );
        const requiredCompletedCount = requiredStepDefinitions.filter((step) => completedStepKeys.has(step.key)).length;
        const missingStepLabels = requiredStepDefinitions
          .filter((step) => !completedStepKeys.has(step.key))
          .map((step) => step.label);
        const paymentMismatchFlag = !!booking.paymentCollection?.mismatchFlag;
        const qaState = getQaStatus({
          requiredCompletedCount,
          requiredTotalCount: requiredStepDefinitions.length,
          paymentMismatchFlag,
        });

        return {
          bookingId: booking.id,
          createdAt: booking.createdAt.toISOString(),
          selectedDate: booking.selectedDate ?? null,
          windowLabel:
            firstSlot && lastSlot
              ? `${formatTime(firstSlot.slot.startTime)} – ${formatTime(lastSlot.slot.endTime)}`
              : null,
          customer: {
            name: booking.user.name,
            phoneMasked: maskPhone(booking.user.phone),
          },
          city: booking.user.city ?? null,
          serviceName: booking.service.name,
          team: team ? { id: team.id, name: team.name } : null,
          bookingStatus: derivedStatus,
          bookingStatusLabel: getStatusLabel(derivedStatus),
          dispatchState: (booking.dispatchState || "unassigned") as
            | "unassigned"
            | "assigned"
            | "en_route"
            | "started"
            | "completed"
            | "issue",
          qaStatus: qaState.qaStatus,
          qaStatusLabel: qaState.qaStatusLabel,
          requiredCompletedCount,
          requiredTotalCount: requiredStepDefinitions.length,
          totalCompletedCount: booking.sopSteps.filter((step) => step.status === "completed").length,
          totalStepCount: BOOKING_SOP_STEPS.length,
          missingStepLabels,
          paymentMismatchFlag,
          paymentMethodLabel: getPaymentMethodLabel(booking.paymentMethod),
          _sortStart: firstSlot?.slot.startTime.toISOString() ?? "",
          _derivedPaymentStatus: derivedPaymentStatus,
        };
      })
      .filter((row) => {
        if (qaStatusFilter && row.qaStatus !== qaStatusFilter) return false;
        if (mismatchOnly && !row.paymentMismatchFlag) return false;
        return true;
      })
      .sort((a, b) => {
        const dateCompare = (a.selectedDate ?? "9999-12-31").localeCompare(b.selectedDate ?? "9999-12-31");
        if (dateCompare !== 0) return dateCompare;

        const timeCompare = a._sortStart.localeCompare(b._sortStart);
        if (timeCompare !== 0) return timeCompare;

        return a.createdAt.localeCompare(b.createdAt);
      });

    const summary = {
      totalBookings: rows.length,
      completeCount: rows.filter((row) => row.qaStatus === "complete").length,
      inProgressCount: rows.filter((row) => row.qaStatus === "in_progress").length,
      notStartedCount: rows.filter((row) => row.qaStatus === "not_started").length,
      issueCount: rows.filter((row) => row.qaStatus === "issue").length,
      mismatchCount: rows.filter((row) => row.paymentMismatchFlag).length,
    };

    return NextResponse.json({
      summary,
      bookings: rows.map(({ _sortStart: __sortStart, _derivedPaymentStatus: __derivedPaymentStatus, ...row }) => {
        void __sortStart;
        void __derivedPaymentStatus;
        return row;
      }),
    });
  } catch (error) {
    console.error("GET /api/admin/qa failed", error);
    return NextResponse.json({ error: "Failed to load QA board" }, { status: 500 });
  }
}
