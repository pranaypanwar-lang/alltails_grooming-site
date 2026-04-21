import { PrismaClient } from "../generated/prisma";
import { getSlotLabel, SLOT_ORDER } from "./slotTemplates";

export type ValidationError =
  | { code: "SLOTS_NOT_FOUND"; message: string }
  | { code: "MIXED_TEAMS"; message: string }
  | { code: "NOT_CONSECUTIVE"; message: string }
  | { code: "SLOTS_UNAVAILABLE"; message: string };

export type LockResult =
  | { ok: true; teamId: string; teamName: string }
  | { ok: false; error: ValidationError };

type ReservationOptions = {
  mode?: "booked" | "held";
  holdExpiresAt?: Date | null;
};

/**
 * Within a Prisma transaction, validate that the given slot IDs are:
 *   1. All present in the database
 *   2. All owned by the same team
 *   3. All free (not isBooked, not isBlocked)
 *   4. Consecutive in slotOrder
 *
 * If valid, reserves the slots in the requested mode and returns the team info.
 * The final update is conditional so concurrent requests cannot both win the
 * same slot race.
 */
export async function validateAndLockSlots(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  slotIds: string[],
  options: ReservationOptions = {}
): Promise<LockResult> {
  const slots = await tx.slot.findMany({
    where: { id: { in: slotIds } },
    include: { team: true },
    orderBy: { startTime: "asc" },
  });

  if (slots.length !== slotIds.length) {
    return {
      ok: false,
      error: { code: "SLOTS_NOT_FOUND", message: "One or more slots were not found" },
    };
  }

  const teamIds = [...new Set(slots.map((s) => s.teamId))];
  if (teamIds.length > 1) {
    return {
      ok: false,
      error: { code: "MIXED_TEAMS", message: "All slots must belong to the same team" },
    };
  }

  const unavailable = slots.find((s) => s.isBooked || s.isBlocked || s.isHeld);
  if (unavailable) {
    return {
      ok: false,
      error: {
        code: "SLOTS_UNAVAILABLE",
        message: "One or more slots are no longer available",
      },
    };
  }

  // Validate consecutive slot order
  const ordered = slots
    .map((s) => ({ ...s, slotOrder: SLOT_ORDER.indexOf(getSlotLabel(s.startTime)!) }))
    .sort((a, b) => a.slotOrder - b.slotOrder);

  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].slotOrder !== ordered[i - 1].slotOrder + 1) {
      return {
        ok: false,
        error: { code: "NOT_CONSECUTIVE", message: "Selected slots must be consecutive" },
      };
    }
  }

  const reservationMode = options.mode ?? "booked";
  const updateResult = await tx.slot.updateMany({
    where: {
      id: { in: slotIds },
      isBooked: false,
      isBlocked: false,
      isHeld: false,
    },
    data:
      reservationMode === "held"
        ? {
            isHeld: true,
            holdExpiresAt: options.holdExpiresAt ?? null,
          }
        : {
            isBooked: true,
            isHeld: false,
            holdExpiresAt: null,
          },
  });

  if (updateResult.count !== slotIds.length) {
    return {
      ok: false,
      error: {
        code: "SLOTS_UNAVAILABLE",
        message: "One or more slots were just taken. Please pick another slot.",
      },
    };
  }

  return { ok: true, teamId: slots[0].teamId, teamName: slots[0].team.name };
}
