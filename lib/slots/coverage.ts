import { PrismaClient } from "../generated/prisma";

/**
 * Resolve the IDs of all active teams whose coverage rules include
 * the given service area slug on the given weekday.
 *
 * @param prisma  Prisma client instance
 * @param slug    ServiceArea.slug (e.g. "delhi", "noida")
 * @param weekday 0 = Sunday … 6 = Saturday
 */
export async function resolveEligibleTeamIds(
  prisma: PrismaClient,
  slug: string,
  weekday: number
): Promise<string[]> {
  const rules = await prisma.teamCoverageRule.findMany({
    where: {
      weekday,
      coverageType: { not: "OFF" },
      isActive: true,
      team: { isActive: true },
      areas: {
        some: {
          serviceArea: { slug, isActive: true },
        },
      },
    },
    select: { teamId: true },
  });

  return [...new Set(rules.map((r) => r.teamId))];
}
