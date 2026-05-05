import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { normalizePayrollMonth } from "../../../../../lib/finance/payroll";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const groomerMemberId = typeof body.groomerMemberId === "string" ? body.groomerMemberId.trim() : "";
    const kind = body.kind === "payroll_adjustment" ? "payroll_adjustment" : "incentive";
    const direction = body.direction === "debit" ? "debit" : "credit";
    const amount = Number(body.amount);
    const monthBucket = normalizePayrollMonth(body.monthBucket);
    const description = typeof body.description === "string" ? body.description.trim() : "";

    if (!groomerMemberId) return NextResponse.json({ error: "groomerMemberId is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    if (kind === "incentive" && direction !== "credit") {
      return NextResponse.json({ error: "Incentives must be credits" }, { status: 400 });
    }

    const entry = await prisma.groomerLedgerEntry.create({
      data: {
        groomerMemberId,
        monthBucket,
        type: kind,
        direction,
        amount: Math.round(amount),
        sourceType: "ManualFinanceAdjustment",
        sourceId: randomUUID(),
        description,
        createdBy: "admin",
        occurredAt: new Date(),
        metadataJson: JSON.stringify({ reason: description, kind, direction }),
      },
    });

    return NextResponse.json({
      success: true,
      ledgerEntry: {
        id: entry.id,
        type: entry.type,
        direction: entry.direction,
        amount: entry.amount,
        monthBucket: entry.monthBucket,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/finance/ledger-adjustments failed", error);
    return NextResponse.json({ error: "Failed to create finance adjustment" }, { status: 500 });
  }
}
