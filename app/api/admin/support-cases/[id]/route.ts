import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ALLOWED_STATUSES = new Set(["open", "in_progress", "resolved"]);
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const priority = typeof body.priority === "string" ? body.priority.trim() : "";
    const resolution = typeof body.resolution === "string" ? body.resolution.trim() || null : null;

    if (status && !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid support status" }, { status: 400 });
    }
    if (priority && !ALLOWED_PRIORITIES.has(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const existing = await prisma.bookingSupportCase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Support case not found" }, { status: 404 });
    }

    const nextStatus = status || existing.status;
    const updated = await prisma.bookingSupportCase.update({
      where: { id },
      data: {
        status: nextStatus,
        priority: priority || existing.priority,
        resolution,
        resolvedAt: nextStatus === "resolved" ? new Date() : null,
        resolvedBy: nextStatus === "resolved" ? "admin" : null,
      },
    });

    return NextResponse.json({
      success: true,
      case: {
        id: updated.id,
        bookingId: updated.bookingId,
        category: updated.category,
        status: updated.status,
        priority: updated.priority,
        source: updated.source,
        summary: updated.summary,
        details: updated.details,
        resolution: updated.resolution,
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        city: updated.city,
        openedBy: updated.openedBy,
        resolvedBy: updated.resolvedBy,
        openedAt: updated.openedAt.toISOString(),
        resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update support case" },
      { status: 500 }
    );
  }
}
