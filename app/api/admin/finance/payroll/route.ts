import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";
import { getPayrollSummary, normalizePayrollMonth } from "../../../../../lib/finance/payroll";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const monthBucket = normalizePayrollMonth(url.searchParams.get("month"));
    const rows = await getPayrollSummary(prisma, monthBucket);

    return NextResponse.json({
      success: true,
      monthBucket,
      summary: {
        groomerCount: rows.length,
        netPayable: rows.reduce((sum, row) => sum + row.netPayable, 0),
        grossCredits: rows.reduce((sum, row) => sum + row.grossCredits, 0),
        advanceRecovery: rows.reduce((sum, row) => sum + row.advanceRecovery, 0),
        cashHeldSeparate: rows.reduce((sum, row) => sum + row.cashHeldSeparate, 0),
        pendingExpenses: rows.reduce((sum, row) => sum + row.pendingExpenses, 0),
        frozenCount: rows.filter((row) => row.frozenSnapshot).length,
      },
      rows,
    });
  } catch (error) {
    console.error("GET /api/admin/finance/payroll failed", error);
    return NextResponse.json({ error: "Failed to load payroll summary" }, { status: 500 });
  }
}
