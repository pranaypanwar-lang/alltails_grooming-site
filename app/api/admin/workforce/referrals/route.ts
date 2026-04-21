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
    const referrerMemberId = typeof body.referrerMemberId === "string" ? body.referrerMemberId.trim() : "";
    const candidateName = typeof body.candidateName === "string" ? body.candidateName.trim() : "";
    const candidatePhone = typeof body.candidatePhone === "string" ? body.candidatePhone.trim() || null : null;
    const role = typeof body.role === "string" ? body.role.trim() || "groomer" : "groomer";
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

    if (!referrerMemberId || !candidateName) {
      return NextResponse.json({ error: "referrerMemberId and candidateName are required" }, { status: 400 });
    }

    await prisma.workforceReferralRecord.create({
      data: {
        referrerMemberId,
        candidateName,
        candidatePhone,
        role,
        notes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/workforce/referrals failed", error);
    return NextResponse.json({ error: "Failed to create referral record" }, { status: 500 });
  }
}
