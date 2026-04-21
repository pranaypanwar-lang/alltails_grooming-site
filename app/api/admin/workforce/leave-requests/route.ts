import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function POST(request: Request) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const body = await request.json().catch(() => ({}));
    const teamMemberId = typeof body.teamMemberId === "string" ? body.teamMemberId.trim() : "";
    const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : "";
    const startDate = typeof body.startDate === "string" ? body.startDate : "";
    const endDate = typeof body.endDate === "string" ? body.endDate : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const emergencyFlag = body.emergencyFlag === true;

    if (!teamMemberId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: "teamMemberId, leaveType, startDate, endDate and reason are required" }, { status: 400 });
    }

    await prisma.workforceLeaveRequest.create({
      data: {
        teamMemberId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        emergencyFlag,
        requestedBy: "admin",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/workforce/leave-requests failed", error);
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
