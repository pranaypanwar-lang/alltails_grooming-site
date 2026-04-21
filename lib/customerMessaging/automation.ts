import type { Prisma, PrismaClient } from "../generated/prisma";
import { prepareCustomerMessageForBooking } from "./service";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function queueBookingLifecycleMessage(
  prisma: DbClient,
  bookingId: string,
  messageType:
    | "team_on_the_way"
    | "groomer_delay_update"
    | "post_groom_care"
    | "review_request"
    | "night_before_reminder"
    | "rebooking_reminder",
  options?: { skipIfPreparedAfter?: Date | null }
) {
  return prepareCustomerMessageForBooking(prisma, bookingId, messageType, {
    skipIfPreparedAfter: options?.skipIfPreparedAfter ?? null,
    deliveryStatus: "queued",
  });
}

export async function queuePostCompletionCustomerJourney(
  prisma: DbClient,
  bookingId: string
) {
  const skipIfPreparedAfter = new Date(Date.now() - 5 * 60 * 1000);
  const followUpTypes = ["post_groom_care", "review_request"] as const;
  const results: Array<{ messageType: (typeof followUpTypes)[number]; created: boolean; messageId?: string }> = [];

  for (const messageType of followUpTypes) {
    const prepared = await queueBookingLifecycleMessage(prisma, bookingId, messageType, {
      skipIfPreparedAfter,
    });
    results.push({
      messageType,
      created: prepared.created,
      messageId: prepared.message.id,
    });
  }

  return results;
}

export async function queueTeamOnTheWayMessage(
  prisma: DbClient,
  bookingId: string
) {
  const skipIfPreparedAfter = new Date(Date.now() - 30 * 60 * 1000);
  return queueBookingLifecycleMessage(prisma, bookingId, "team_on_the_way", {
    skipIfPreparedAfter,
  });
}

export async function queueGroomerDelayUpdateMessage(
  prisma: DbClient,
  bookingId: string
) {
  const skipIfPreparedAfter = new Date(Date.now() - 30 * 60 * 1000);
  return queueBookingLifecycleMessage(prisma, bookingId, "groomer_delay_update", {
    skipIfPreparedAfter,
  });
}
