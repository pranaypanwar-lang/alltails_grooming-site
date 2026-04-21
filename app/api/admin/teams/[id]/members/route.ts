import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";
import { getCurrentRankLabel } from "../../../../../../lib/groomerRewards";
import { hashPassword } from "../../../../../../lib/auth/groomerSession";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: teamId } = await params;
    const body = await request.json().catch(() => ({}));

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
    const password = typeof body.password === "string" ? body.password : "";
    const role = typeof body.role === "string" ? body.role.trim() || "groomer" : "groomer";
    const isActive = body.isActive !== false;

    if (!name) {
      return NextResponse.json({ error: "Member name is required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name,
        phone,
        passwordHash: password ? hashPassword(password) : null,
        passwordSetAt: password ? new Date() : null,
        role,
        isActive,
        currentRank: getCurrentRankLabel(role, 0),
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await assertAdminSession();
  if (authErr) return authErr;

  try {
    const { id: teamId } = await params;
    const body = await request.json().catch(() => ({}));

    const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.phone === "string" || body.phone === null) data.phone = body.phone?.trim() || null;
    if (typeof body.password === "string" && body.password) {
      data.passwordHash = hashPassword(body.password);
      data.passwordSetAt = new Date();
    }
    if (typeof body.role === "string") data.role = body.role.trim() || "groomer";
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: { id: true, teamId: true, currentXp: true, role: true },
    });

    if (!existing || existing.teamId !== teamId) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    if (typeof data.role === "string") {
      data.currentRank = getCurrentRankLabel(data.role, existing.currentXp);
    }

    await prisma.teamMember.updateMany({
      where: {
        id: memberId,
        teamId,
      },
      data,
    });

    const updated = await prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
