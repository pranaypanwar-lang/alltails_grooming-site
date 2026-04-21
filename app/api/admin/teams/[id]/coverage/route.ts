import { NextResponse } from "next/server";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import { assertAdminSession } from "../../../_lib/assertAdmin";

export const runtime = "nodejs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type RuleInput = {
  weekday: number;
  areaIds: string[];
};

function deriveCoverageType(areaCount: number) {
  if (areaCount <= 0) return "OFF";
  if (areaCount === 1) return "SINGLE_CITY";
  return "REGIONAL_POOL";
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
    const rules = Array.isArray(body.rules) ? body.rules as RuleInput[] : [];

    if (rules.length !== 7) {
      return NextResponse.json({ error: "Exactly 7 weekday rules are required" }, { status: 400 });
    }

    const normalized = rules.map((rule) => ({
      weekday: rule.weekday,
      areaIds: Array.from(new Set((rule.areaIds ?? []).filter((value) => typeof value === "string" && value.trim().length > 0))),
    })).sort((a, b) => a.weekday - b.weekday);

    for (let index = 0; index < normalized.length; index += 1) {
      if (normalized[index].weekday !== index) {
        return NextResponse.json({ error: "Rules must include each weekday from 0 to 6" }, { status: 400 });
      }
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      const existingRules = await tx.teamCoverageRule.findMany({
        where: { teamId },
        include: { areas: true },
      });

      for (const rule of existingRules) {
        await tx.teamCoverageArea.deleteMany({ where: { coverageRuleId: rule.id } });
      }
      await tx.teamCoverageRule.deleteMany({ where: { teamId } });

      for (const rule of normalized) {
        const createdRule = await tx.teamCoverageRule.create({
          data: {
            teamId,
            weekday: rule.weekday,
            coverageType: deriveCoverageType(rule.areaIds.length),
            isActive: rule.areaIds.length > 0,
          },
        });

        if (rule.areaIds.length > 0) {
          await tx.teamCoverageArea.createMany({
            data: rule.areaIds.map((serviceAreaId) => ({
              coverageRuleId: createdRule.id,
              serviceAreaId,
            })),
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/teams/:id/coverage failed", error);
    return NextResponse.json({ error: "Failed to update coverage rules" }, { status: 500 });
  }
}
