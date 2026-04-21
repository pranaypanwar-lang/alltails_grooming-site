export type SlotLabel = "9-11" | "12-2" | "3-5" | "6-8";

export interface SlotTemplate {
  label: SlotLabel;
  startHour: number; // IST hour (24h)
  endHour: number;   // IST hour (24h)
}

/** Canonical four daily slot windows. All times are IST. */
export const SLOT_TEMPLATES: SlotTemplate[] = [
  { label: "9-11",  startHour: 9,  endHour: 11 },
  { label: "12-2",  startHour: 12, endHour: 14 },
  { label: "3-5",   startHour: 15, endHour: 17 },
  { label: "6-8",   startHour: 18, endHour: 20 },
];

export const SLOT_ORDER: SlotLabel[] = SLOT_TEMPLATES.map((t) => t.label);

export const IST_OFFSET_MINUTES = 330; // UTC+5:30

/** Convert an IST calendar date + hour into a UTC Date object. */
export function istHourToUtc(
  istYear: number,
  istMonth: number, // 1-based
  istDay: number,
  istHour: number
): Date {
  const utcMs =
    Date.UTC(istYear, istMonth - 1, istDay, istHour, 0, 0, 0) -
    IST_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

/**
 * Given a UTC Date, return which slot label it represents (or null).
 * The slot's startTime is stored in UTC; this converts to IST hour to match.
 */
export function getSlotLabel(utcDate: Date): SlotLabel | null {
  const istMs = utcDate.getTime() + IST_OFFSET_MINUTES * 60_000;
  const istHour = new Date(istMs).getUTCHours();

  for (const t of SLOT_TEMPLATES) {
    if (istHour === t.startHour) return t.label;
  }
  return null;
}
