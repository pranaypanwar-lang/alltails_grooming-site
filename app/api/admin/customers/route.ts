import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";
import {
  buildLifecycleMetrics,
  maskPhone,
} from "../../../../lib/admin/customers";
import { normalizeCityName } from "../../../../lib/cities/slugs";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(q.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(q.get("pageSize") ?? "25", 10)));
    const search = q.get("search")?.trim() ?? "";
    const city = q.get("city")?.trim() ?? "";
    const normalizedCity = normalizeCityName(city) ?? city;
    const lifecycleStage = q.get("lifecycleStage")?.trim() ?? "";
    const loyaltyState = q.get("loyaltyState")?.trim() ?? "";
    const hasUpcomingBooking = q.get("hasUpcomingBooking") === "true";
    const hasOpenSupportCase = q.get("hasOpenSupportCase") === "true";
    const isAtRisk = q.get("isAtRisk") === "true";
    const sortBy = q.get("sortBy") ?? "createdAt";
    const sortOrder = (q.get("sortOrder") ?? "desc") as "asc" | "desc";

    const users = await prisma.user.findMany({
      where: {
        ...(normalizedCity ? { city: { equals: normalizedCity, mode: "insensitive" } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
                { city: { contains: search, mode: "insensitive" } },
                { pets: { some: { name: { contains: search, mode: "insensitive" } } } },
                { pets: { some: { breed: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      include: {
        pets: true,
        bookings: {
          include: {
            service: true,
            assignedTeam: { select: { id: true, name: true } },
            groomerMember: { select: { id: true, name: true, role: true, currentRank: true } },
            slots: {
              include: {
                slot: {
                  include: {
                    team: { select: { id: true, name: true } },
                  },
                },
              },
            },
            events: {
              select: {
                type: true,
                summary: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            customerMessages: {
              select: {
                id: true,
                messageType: true,
                channel: true,
                status: true,
                recipient: true,
                preparedAt: true,
                sentAt: true,
                content: true,
              },
              orderBy: { preparedAt: "desc" },
            },
            supportCases: {
              select: {
                id: true,
                category: true,
                status: true,
                priority: true,
                summary: true,
                resolution: true,
                openedAt: true,
                resolvedAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const userIds = users.map((user) => user.id);
    const phones = users.map((user) => user.phone);
    const extraSupportCases = userIds.length
      ? await prisma.bookingSupportCase.findMany({
          where: {
            OR: [
              { booking: { userId: { in: userIds } } },
              { customerPhone: { in: phones } },
            ],
          },
          include: {
            booking: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        })
      : [];

    const rows = users.map((user) => {
      const phoneMatchedCases = extraSupportCases.filter(
        (supportCase) =>
          supportCase.booking?.userId === user.id || supportCase.customerPhone === user.phone
      );
      const linkedMessages = user.bookings.flatMap((booking) =>
        booking.customerMessages.map((message) => ({
          ...message,
          bookingId: booking.id,
        }))
      );
      const metrics = buildLifecycleMetrics({
        bookings: user.bookings,
        pets: user.pets,
        supportCases: phoneMatchedCases.map((supportCase) => ({
          id: supportCase.id,
          bookingId: supportCase.bookingId,
          category: supportCase.category,
          status: supportCase.status,
          priority: supportCase.priority,
          summary: supportCase.summary,
          resolution: supportCase.resolution,
          openedAt: supportCase.openedAt,
          resolvedAt: supportCase.resolvedAt,
        })),
        messages: linkedMessages,
        loyaltyFreeUnlocked: user.loyaltyFreeUnlocked,
      });

      return {
        id: user.id,
        name: user.name,
        phoneFull: user.phone,
        phoneMasked: maskPhone(user.phone),
        city: user.city ?? null,
        createdAt: user.createdAt.toISOString(),
        lifecycleStage: metrics.stage,
        lifecycleLabel: metrics.label,
        lifecycleReason: metrics.reason,
        riskFlags: metrics.riskFlags,
        pets: {
          count: user.pets.length,
          names: user.pets.map((pet) => pet.name).filter((value): value is string => !!value),
          breeds: user.pets.map((pet) => pet.breed),
        },
        loyalty: {
          completedCount: user.loyaltyCompletedCount,
          freeUnlocked: user.loyaltyFreeUnlocked,
          unlockedAt: user.loyaltyUnlockedAt?.toISOString() ?? null,
          lastRedeemedAt: user.loyaltyLastRedeemedAt?.toISOString() ?? null,
        },
        bookingSummary: {
          total: metrics.totalBookings,
          completed: metrics.completedBookings,
          upcomingConfirmed: metrics.upcomingConfirmedBookings,
          cancelledOrExpired: metrics.cancelledOrExpiredBookings,
          totalSpent: metrics.totalSpent,
          refundedAmount: metrics.refundedAmount,
          averageOrderValue: metrics.averageOrderValue,
          lastCompletedAt: metrics.lastCompletedAt?.toISOString() ?? null,
          nextBookingAt: metrics.nextBookingAt?.toISOString() ?? null,
          expectedNextBookingAt: metrics.expectedNextBookingAt?.toISOString() ?? null,
          daysOverdue: metrics.daysOverdue,
          expectedCycleDays: metrics.expectedCycleDays,
        },
        communicationSummary: {
          totalMessages: linkedMessages.length,
          lastMessageAt: metrics.lastMessageAt?.toISOString() ?? null,
        },
        supportSummary: {
          openCaseCount: metrics.openCaseCount,
          unresolvedComplaintCount: metrics.unresolvedComplaintCount,
          lastOpenedAt: phoneMatchedCases
            .map((supportCase) => supportCase.openedAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
            ?.toISOString() ?? null,
        },
      };
    });

    const filteredRows = rows
      .filter((row) => {
        if (lifecycleStage && row.lifecycleStage !== lifecycleStage) return false;
        if (loyaltyState === "unlocked" && !row.loyalty.freeUnlocked) return false;
        if (loyaltyState === "locked" && row.loyalty.freeUnlocked) return false;
        if (hasUpcomingBooking && row.bookingSummary.upcomingConfirmed === 0) return false;
        if (hasOpenSupportCase && row.supportSummary.openCaseCount === 0) return false;
        if (isAtRisk && !["at_risk", "lost", "support_hold"].includes(row.lifecycleStage)) return false;
        return true;
      })
      .sort((a, b) => {
        const direction = sortOrder === "asc" ? 1 : -1;
        if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
        if (sortBy === "city") return (a.city ?? "").localeCompare(b.city ?? "") * direction;
        if (sortBy === "lastCompletedAt") {
          return ((a.bookingSummary.lastCompletedAt ?? "") < (b.bookingSummary.lastCompletedAt ?? "") ? -1 : 1) * direction;
        }
        if (sortBy === "nextBookingAt") {
          return ((a.bookingSummary.nextBookingAt ?? "") < (b.bookingSummary.nextBookingAt ?? "") ? -1 : 1) * direction;
        }
        if (sortBy === "totalSpent") return (a.bookingSummary.totalSpent - b.bookingSummary.totalSpent) * direction;
        if (sortBy === "completedBookings") return (a.bookingSummary.completed - b.bookingSummary.completed) * direction;
        return (a.createdAt < b.createdAt ? -1 : 1) * direction;
      });

    const totalCount = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const start = (normalizedPage - 1) * pageSize;
    const customers = filteredRows.slice(start, start + pageSize);

    return NextResponse.json({
      page: normalizedPage,
      pageSize,
      totalCount,
      totalPages,
      availableCities: [...new Set(rows.map((row) => row.city).filter((value): value is string => !!value))].sort((a, b) =>
        a.localeCompare(b)
      ),
      summary: {
        totalCustomers: filteredRows.length,
        leadCount: filteredRows.filter((row) => row.lifecycleStage === "lead").length,
        firstTimeCount: filteredRows.filter((row) => row.lifecycleStage === "first_time_customer").length,
        repeatCount: filteredRows.filter((row) => row.lifecycleStage === "repeat_customer").length,
        loyalCount: filteredRows.filter((row) => row.lifecycleStage === "loyal_customer").length,
        activeWithUpcomingCount: filteredRows.filter((row) => row.lifecycleStage === "active_with_upcoming").length,
        dueSoonCount: filteredRows.filter((row) => row.riskFlags.includes("due_soon")).length,
        atRiskCount: filteredRows.filter((row) => ["at_risk", "lost"].includes(row.lifecycleStage)).length,
        supportHoldCount: filteredRows.filter((row) => row.lifecycleStage === "support_hold").length,
        upcomingCount: filteredRows.filter((row) => row.bookingSummary.upcomingConfirmed > 0).length,
      },
      customers,
    });
  } catch (error) {
    console.error("GET /api/admin/customers failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load customers" },
      { status: 500 }
    );
  }
}
