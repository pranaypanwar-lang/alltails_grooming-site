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
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title.trim();
    if (typeof body.category === "string") data.category = body.category.trim();
    if (typeof body.description === "string" || body.description === null) data.description = body.description?.trim() || null;
    if (typeof body.xpReward === "number") data.xpReward = body.xpReward;
    if (typeof body.rewardPointsReward === "number") data.rewardPointsReward = body.rewardPointsReward;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    await prisma.trainingModule.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/workforce/training-modules/:id failed", error);
    return NextResponse.json({ error: "Failed to update training module" }, { status: 500 });
  }
}
