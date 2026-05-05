import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { syncApprovedExpenseLedgerEntry } from "../../../../../../lib/finance/groomerLedger";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : "";

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be approved or rejected" }, { status: 400 });
    }
    if (status === "rejected" && !reviewNote) {
      return NextResponse.json({ error: "Review note is required when rejecting an expense" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.groomerExpense.update({
        where: { id },
        data: {
          status,
          reviewNote: reviewNote || null,
          reviewedBy: "admin",
          reviewedAt: new Date(),
        },
        include: {
          groomerMember: {
            select: {
              id: true,
              name: true,
              phone: true,
              team: { select: { id: true, name: true } },
            },
          },
        },
      });

      const ledgerEntry = await syncApprovedExpenseLedgerEntry(tx, expense.id);
      return { expense, ledgerEntry };
    });

    return NextResponse.json({
      success: true,
      expense: {
        id: result.expense.id,
        category: result.expense.category,
        amount: result.expense.amount,
        status: result.expense.status,
        reviewNote: result.expense.reviewNote,
        reviewedAt: result.expense.reviewedAt?.toISOString() ?? null,
        groomer: result.expense.groomerMember,
      },
      ledgerEntry: result.ledgerEntry
        ? {
            id: result.ledgerEntry.id,
            type: result.ledgerEntry.type,
            direction: result.ledgerEntry.direction,
            amount: result.ledgerEntry.amount,
            monthBucket: result.ledgerEntry.monthBucket,
          }
        : null,
    });
  } catch (error) {
    console.error("PATCH /api/admin/finance/expenses/:id failed", error);
    return NextResponse.json({ error: "Failed to review expense" }, { status: 500 });
  }
}
