import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

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
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    await prisma.workforceLeaveRequest.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedBy: "admin",
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/workforce/leave-requests/:id failed", error);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
