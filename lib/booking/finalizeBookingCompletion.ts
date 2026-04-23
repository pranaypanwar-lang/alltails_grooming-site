import type { Prisma, PrismaClient } from "../generated/prisma";
import { completeBookingLifecycle } from "./completeBookingLifecycle";
import { queuePostCompletionCustomerJourney } from "../customerMessaging/automation";
import { processQueuedCustomerMessages } from "../customerMessaging/provider";
import { awardCompletionRewards } from "../groomerRewards";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function finalizeBookingCompletion(
  prisma: DbClient,
  bookingId: string,
  options?: { allowMissingRequiredSteps?: boolean; withholdRewards?: boolean }
) {
  const result = await completeBookingLifecycle(prisma, bookingId, options);

  let rewardResult = null;
  let followUps: Awaited<ReturnType<typeof queuePostCompletionCustomerJourney>> = [];

  if (!result.alreadyCompleted) {
    if (!options?.withholdRewards) {
      rewardResult = await awardCompletionRewards(prisma, result.bookingId);
    }
    followUps = await queuePostCompletionCustomerJourney(prisma, result.bookingId);
    await processQueuedCustomerMessages(prisma, { limit: 10 });
  }

  return {
    result,
    rewardResult,
    followUps,
  };
}
