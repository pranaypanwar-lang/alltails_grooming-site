import { PrismaClient } from "../generated/prisma";
import { resolveEligibleTeamIds } from "./coverage";
import { SLOT_TEMPLATES, istHourToUtc } from "./slotTemplates";

/**
 * Ensure canonical team slots exist for the given service-area + date range.
 * Safe to call repeatedly — uses skipDuplicates so existing slots are untouched.
 *
 * @param prisma     Prisma client
 * @param areaSlug   ServiceArea.slug  (e.g. "delhi")
 * @param startDate  First date to cover  (YYYY-MM-DD, treated as IST)
 * @param days       Number of days to cover (default 1)
 * @returns          Count of slot rows created
 */
export async function ensureSlotsExistForDateRange(
  prisma: PrismaClient,
  areaSlug: string,
  startDate: string,
  days = 1
): Promise<number> {
  // Parse the start date in IST (treat the string as a local IST calendar date)
  const [y, m, d] = startDate.split("-").map(Number);

  const toCreate: Array<{ teamId: string; startTime: Date; endTime: Date }> = [];

  for (let offset = 0; offset < days; offset++) {
    // Compute IST calendar date for this offset
    const ist = new Date(Date.UTC(y, m - 1, d + offset));
    const istYear  = ist.getUTCFullYear();
    const istMonth = ist.getUTCMonth() + 1;
    const istDay   = ist.getUTCDate();

    // weekday derived from IST calendar (0 = Sun … 6 = Sat)
    const weekday = ist.getUTCDay();

    // Tuesday is globally off
    if (weekday === 2) continue;

    const teamIds = await resolveEligibleTeamIds(prisma, areaSlug, weekday);
    if (teamIds.length === 0) continue;

    for (const teamId of teamIds) {
      for (const tmpl of SLOT_TEMPLATES) {
        toCreate.push({
          teamId,
          startTime: istHourToUtc(istYear, istMonth, istDay, tmpl.startHour),
          endTime:   istHourToUtc(istYear, istMonth, istDay, tmpl.endHour),
        });
      }
    }
  }

  if (toCreate.length === 0) return 0;

  const result = await prisma.slot.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  return result.count;
}
