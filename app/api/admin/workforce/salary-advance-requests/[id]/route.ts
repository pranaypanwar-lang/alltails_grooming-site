import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getNextIstMonthBucket(date = new Date()) {
  const istDate = new Date(date.getTime() + 330 * 60_000);
  istDate.setUTCMonth(istDate.getUTCMonth() + 1, 1);
  return istDate.toISOString().slice(0, 7);
}

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
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;
    const recoverFromMonth =
      typeof body.recoverFromMonth === "string" && /^\d{4}-\d{2}$/.test(body.recoverFromMonth.trim())
        ? body.recoverFromMonth.trim()
        : status === "approved"
          ? getNextIstMonthBucket()
          : null;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    await prisma.workforceSalaryAdvanceRequest.update({
      where: { id },
      data: {
        status,
        reviewNote,
        recoverFromMonth,
        reviewedBy: "admin",
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/workforce/salary-advance-requests/:id failed", error);
    return NextResponse.json({ error: "Failed to update salary advance request" }, { status: 500 });
  }
}
