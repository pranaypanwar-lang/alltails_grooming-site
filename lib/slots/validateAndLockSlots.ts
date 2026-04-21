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

/**
 * Within a Prisma transaction, validate that the given slot IDs are:
 *   1. All present in the database
 *   2. All owned by the same team
 *   3. All free (not isBooked, not isBlocked)
 *   4. Consecutive in slotOrder
 *
 * If valid, marks every slot as isBooked = true and returns the team info.
 * Must be called inside prisma.$transaction().
 */
export async function validateAndLockSlots(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  slotIds: string[]
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

  // Lock all slots atomically
  await tx.slot.updateMany({
    where: { id: { in: slotIds } },
    data: { isBooked: true },
  });

  return { ok: true, teamId: slots[0].teamId, teamName: slots[0].team.name };
}
