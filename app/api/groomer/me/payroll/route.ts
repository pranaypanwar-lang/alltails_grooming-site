import { NextResponse } from "next/server";
import { getGroomerSessionMember } from "../../../../../lib/auth/groomerSession";
import { adminPrisma } from "../../../admin/_lib/bookingAdmin";
import { getPayrollSummary, normalizePayrollMonth } from "../../../../../lib/finance/payroll";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const member = await getGroomerSessionMember();
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const monthBucket = normalizePayrollMonth(url.searchParams.get("month"));
    const [row] = await getPayrollSummary(adminPrisma, monthBucket, member.id);

    return NextResponse.json({
      success: true,
      monthBucket,
      payroll: row ?? null,
    });
  } catch (error) {
    console.error("GET /api/groomer/me/payroll failed", error);
    return NextResponse.json({ error: "Failed to load payroll summary" }, { status: 500 });
  }
}
