import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../lib/generated/prisma";
import { assertAdminSession } from "../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ALLOWED_CATEGORIES = new Set([
  "failed_payment",
  "no_slot_availability",
  "missing_address",
  "groomer_delay",
  "quality_complaint",
  "payment_dispute",
]);

const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

export async function GET(request: NextRequest) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const q = request.nextUrl.searchParams;
    const search = q.get("search")?.trim() ?? "";
    const category = q.get("category")?.trim() ?? "";
    const status = q.get("status")?.trim() ?? "";
    const priority = q.get("priority")?.trim() ?? "";
    const date = q.get("date")?.trim() ?? "";

    const cases = await prisma.bookingSupportCase.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(date
          ? {
              OR: [
                { booking: { selectedDate: date } },
                {
                  openedAt: {
                    gte: new Date(`${date}T00:00:00.000Z`),
                    lt: new Date(`${date}T23:59:59.999Z`),
                  },
                },
              ],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { summary: { contains: search, mode: "insensitive" } },
                { details: { contains: search, mode: "insensitive" } },
                { customerName: { contains: search, mode: "insensitive" } },
                { customerPhone: { contains: search } },
                { bookingId: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        booking: {
          include: {
            user: true,
            service: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { openedAt: "desc" }],
      take: 250,
    });

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const failedPaymentSignals = await prisma.booking.count({
      where: {
        OR: [
          { status: "payment_expired" },
          { paymentFailedAt: { not: null }, paymentStatus: { not: "paid" } },
        ],
      },
    });

    const missingAddressSignals = await prisma.booking.count({
      where: {
        status: "confirmed",
        selectedDate: { gte: today },
        OR: [
          { serviceAddress: null },
          { serviceLocationUrl: null },
        ],
      },
    });

    const groomerDelaySignals = await prisma.booking.count({
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
    });

    return NextResponse.json({
      summary: {
        totalCases: cases.length,
        openCount: cases.filter((item) => item.status === "open").length,
        inProgressCount: cases.filter((item) => item.status === "in_progress").length,
        resolvedCount: cases.filter((item) => item.status === "resolved").length,
        urgentCount: cases.filter((item) => item.priority === "urgent").length,
        failedPaymentSignals,
        missingAddressSignals,
        groomerDelaySignals,
      },
      cases: cases.map((item) => ({
        id: item.id,
        bookingId: item.bookingId,
        category: item.category,
        status: item.status,
        priority: item.priority,
        source: item.source,
        summary: item.summary,
        details: item.details ?? null,
        resolution: item.resolution ?? null,
        customerName: item.customerName ?? item.booking?.user.name ?? null,
        customerPhone: item.customerPhone ?? item.booking?.user.phone ?? null,
        city: item.city ?? item.booking?.user.city ?? null,
        openedBy: item.openedBy ?? null,
        resolvedBy: item.resolvedBy ?? null,
        openedAt: item.openedAt.toISOString(),
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
        booking:
          item.booking
            ? {
                id: item.booking.id,
                selectedDate: item.booking.selectedDate ?? null,
                serviceName: item.booking.service.name,
                customerName: item.booking.user.name,
              }
            : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load support cases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() || null : null;
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "open";
    const priority = typeof body.priority === "string" ? body.priority.trim() : "medium";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";
    const details = typeof body.details === "string" ? body.details.trim() || null : null;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() || null : null;
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() || null : null;
    const city = typeof body.city === "string" ? body.city.trim() || null : null;

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid support category" }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid support status" }, { status: 400 });
    }
    if (!ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    if (!summary) {
      return NextResponse.json({ error: "Summary is required" }, { status: 400 });
    }

    const supportCase = await prisma.bookingSupportCase.create({
      data: {
        bookingId,
        category,
        status,
        priority,
        source: "admin",
        summary,
        details,
        customerName,
        customerPhone,
        city,
        openedBy: "admin",
      },
    });

    return NextResponse.json({
      success: true,
      case: {
        id: supportCase.id,
        bookingId: supportCase.bookingId,
        category: supportCase.category,
        status: supportCase.status,
        priority: supportCase.priority,
        source: supportCase.source,
        summary: supportCase.summary,
        details: supportCase.details,
        resolution: supportCase.resolution,
        customerName: supportCase.customerName,
        customerPhone: supportCase.customerPhone,
        city: supportCase.city,
        openedBy: supportCase.openedBy,
        resolvedBy: supportCase.resolvedBy,
        openedAt: supportCase.openedAt.toISOString(),
        resolvedAt: supportCase.resolvedAt?.toISOString() ?? null,
        booking: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create support case" },
      { status: 500 }
    );
  }
}
