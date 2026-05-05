import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getPayrollSummary, normalizePayrollMonth } from "../../../../../../lib/finance/payroll";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const monthBucket = normalizePayrollMonth(body.monthBucket);
    const groomerMemberId = typeof body.groomerMemberId === "string" ? body.groomerMemberId.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    const rows = await getPayrollSummary(prisma, monthBucket, groomerMemberId || undefined);
    if (groomerMemberId && !rows.length) return NextResponse.json({ error: "Groomer not found" }, { status: 404 });

    const snapshots = [];
    for (const row of rows) {
      if (row.frozenSnapshot && !notes) {
        return NextResponse.json({ error: "Refreeze note is required" }, { status: 400 });
      }
      const snapshot = await prisma.groomerPayrollSnapshot.upsert({
        where: {
          groomerMemberId_monthBucket: {
            groomerMemberId: row.groomer.id,
            monthBucket,
          },
        },
        create: {
          groomerMemberId: row.groomer.id,
          monthBucket,
          baseSalary: row.baseSalary,
          fuelReimbursements: row.fuelReimbursements,
          otherReimbursements: row.otherReimbursements,
          incentives: row.incentives,
          payrollAdjustments: row.payrollAdjustments,
          advanceRecovery: row.advanceRecovery,
          netPayable: row.netPayable,
          cashHeldSeparate: row.cashHeldSeparate,
          frozenBy: "admin",
          notes: notes || null,
        },
        update: {
          baseSalary: row.baseSalary,
          fuelReimbursements: row.fuelReimbursements,
          otherReimbursements: row.otherReimbursements,
          incentives: row.incentives,
          payrollAdjustments: row.payrollAdjustments,
          advanceRecovery: row.advanceRecovery,
          netPayable: row.netPayable,
          cashHeldSeparate: row.cashHeldSeparate,
          frozenBy: "admin",
          frozenAt: new Date(),
          notes: notes || null,
        },
      });
      snapshots.push(snapshot);
    }

    return NextResponse.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        groomerMemberId: snapshot.groomerMemberId,
        monthBucket: snapshot.monthBucket,
        netPayable: snapshot.netPayable,
        cashHeldSeparate: snapshot.cashHeldSeparate,
        frozenAt: snapshot.frozenAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("POST /api/admin/finance/payroll/freeze failed", error);
    return NextResponse.json({ error: "Failed to freeze payroll" }, { status: 500 });
  }
}
