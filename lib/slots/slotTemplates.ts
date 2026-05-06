export type SlotLabel = "9AM-11AM" | "12PM-2PM" | "3PM-5PM" | "6PM-8PM";

export interface SlotTemplate {
  label: SlotLabel;
  startHour: number; // IST hour (24h)
  endHour: number;   // IST hour (24h)
}

/** Canonical four daily slot windows. All times are IST. */
export const SLOT_TEMPLATES: SlotTemplate[] = [
  { label: "9AM-11AM",  startHour: 9,  endHour: 11 },
  { label: "12PM-2PM",  startHour: 12, endHour: 14 },
  { label: "3PM-5PM",   startHour: 15, endHour: 17 },
  { label: "6PM-8PM",   startHour: 18, endHour: 20 },
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
  const utcIstMs = utcDate.getTime() + IST_OFFSET_MINUTES * 60_000;
  const localParsedIstHour =
    Math.floor((utcDate.getHours() * 60 + utcDate.getMinutes() + IST_OFFSET_MINUTES) / 60) % 24;
  const utcParsedIstHour = new Date(utcIstMs).getUTCHours();

  const localParsedLabel = SLOT_TEMPLATES.find((t) => t.startHour === localParsedIstHour)?.label ?? null;
  if (localParsedLabel) return localParsedLabel;

  const utcParsedLabel = SLOT_TEMPLATES.find((t) => t.startHour === utcParsedIstHour)?.label ?? null;
  if (utcParsedLabel) return utcParsedLabel;

  return null;
}
