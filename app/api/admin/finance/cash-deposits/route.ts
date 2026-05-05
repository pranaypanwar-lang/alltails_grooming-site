import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { createCashDepositLedgerEntry, getGroomerCashHeld } from "../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEPOSIT_MODES = new Set(["cash", "bank_transfer", "upi"]);

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const groomerMemberId = typeof body.groomerMemberId === "string" ? body.groomerMemberId.trim() : "";
    const amount = Number(body.amount);
    const depositMode = typeof body.depositMode === "string" ? body.depositMode.trim() : "cash";
    const referenceId = typeof body.referenceId === "string" ? body.referenceId.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const depositedAt = body.depositedAt ? new Date(String(body.depositedAt)) : new Date();

    if (!groomerMemberId) {
      return NextResponse.json({ error: "groomerMemberId is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Deposit amount must be greater than zero" }, { status: 400 });
    }
    if (!DEPOSIT_MODES.has(depositMode)) {
      return NextResponse.json({ error: "Invalid deposit mode" }, { status: 400 });
    }
    if (Number.isNaN(depositedAt.getTime())) {
      return NextResponse.json({ error: "Invalid depositedAt date" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.teamMember.findUnique({
        where: { id: groomerMemberId },
        select: { id: true, name: true },
      });
      if (!member) {
        throw Object.assign(new Error("Groomer not found"), { httpStatus: 404 });
      }

      const cashDeposit = await tx.groomerCashDeposit.create({
        data: {
          groomerMemberId,
          amount: Math.round(amount),
          depositMode,
          referenceId: referenceId || null,
          notes: notes || null,
          recordedBy: "admin",
          depositedAt,
        },
      });

      const ledgerEntry = await createCashDepositLedgerEntry(tx, {
        cashDepositId: cashDeposit.id,
        groomerMemberId,
        amount: cashDeposit.amount,
        depositedAt: cashDeposit.depositedAt,
        depositMode: cashDeposit.depositMode,
        referenceId: cashDeposit.referenceId,
        recordedBy: cashDeposit.recordedBy,
      });

      return { member, cashDeposit, ledgerEntry };
    });

    const cashHeld = await getGroomerCashHeld(prisma, groomerMemberId);

    return NextResponse.json({
      success: true,
      groomer: result.member,
      cashHeld,
      cashDeposit: {
        id: result.cashDeposit.id,
        amount: result.cashDeposit.amount,
        depositMode: result.cashDeposit.depositMode,
        referenceId: result.cashDeposit.referenceId,
        notes: result.cashDeposit.notes,
        recordedBy: result.cashDeposit.recordedBy,
        depositedAt: result.cashDeposit.depositedAt.toISOString(),
      },
      ledgerEntry: {
        id: result.ledgerEntry.id,
        type: result.ledgerEntry.type,
        direction: result.ledgerEntry.direction,
        amount: result.ledgerEntry.amount,
        monthBucket: result.ledgerEntry.monthBucket,
      },
    });
  } catch (error) {
    if (error instanceof Error && "httpStatus" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as Error & { httpStatus: number }).httpStatus }
      );
    }
    console.error("POST /api/admin/finance/cash-deposits failed", error);
    return NextResponse.json({ error: "Failed to record cash deposit" }, { status: 500 });
  }
}
