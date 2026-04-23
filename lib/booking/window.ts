type SlotLike =
  | { startTime: Date; endTime: Date }
  | { slot: { startTime: Date; endTime: Date } };

type NormalizedSlotRange = { startTime: Date; endTime: Date };

const MANUAL_WINDOW_PREFIX = "manual";
const IST_OFFSET_MINUTES = 330;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeSlotLike(item: SlotLike): NormalizedSlotRange {
  return "slot" in item ? item.slot : item;
}

export function formatBookingTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function formatBookingWindowLabel(startTime: Date, endTime: Date) {
  return `${formatBookingTime(startTime)} – ${formatBookingTime(endTime)}`;
}

export function localIstDateTimeToUtc(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  const utcMs =
    Date.UTC(year, month - 1, day, hours, minutes || 0, 0, 0) -
    IST_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

export function getIstTimeInputValue(value: Date) {
  const istMs = value.getTime() + IST_OFFSET_MINUTES * 60_000;
  const istDate = new Date(istMs);
  return `${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}`;
}

export function buildManualBookingWindowId(params: {
  teamId: string;
  selectedDate: string;
  startTime: string;
  endTime: string;
}) {
  return [
    MANUAL_WINDOW_PREFIX,
    params.teamId,
    params.selectedDate,
    params.startTime,
    params.endTime,
  ].join("__");
}

export function parseManualBookingWindowId(
  bookingWindowId: string | null | undefined,
  selectedDate?: string | null
) {
  if (!bookingWindowId?.startsWith(`${MANUAL_WINDOW_PREFIX}__`)) {
    return null;
  }

  const [, teamId, encodedDate, startTime, endTime] = bookingWindowId.split("__");
  const effectiveDate = selectedDate || encodedDate;
  if (!teamId || !effectiveDate || !startTime || !endTime) {
    return null;
  }

  return {
    teamId,
    selectedDate: effectiveDate,
    startTime,
    endTime,
    startAt: localIstDateTimeToUtc(effectiveDate, startTime),
    endAt: localIstDateTimeToUtc(effectiveDate, endTime),
  };
}

export function getSlotRangeFromItems<T extends SlotLike>(items: T[]) {
  if (!items.length) return null;

  const normalized = items
    .map((item) => normalizeSlotLike(item))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  return {
    startAt: first.startTime,
    endAt: last.endTime,
  };
}

export function getBookingWindowRange(params: {
  bookingWindowId?: string | null;
  selectedDate?: string | null;
  slots?: SlotLike[];
}) {
  const manualWindow = parseManualBookingWindowId(
    params.bookingWindowId,
    params.selectedDate
  );
  if (manualWindow) {
    return {
      startAt: manualWindow.startAt,
      endAt: manualWindow.endAt,
      isManual: true,
      teamId: manualWindow.teamId,
    };
  }

  const slotRange = getSlotRangeFromItems(params.slots ?? []);
  if (!slotRange) return null;

  return {
    startAt: slotRange.startAt,
    endAt: slotRange.endAt,
    isManual: false,
    teamId: null,
  };
}

export function getBookingWindowDisplay(params: {
  bookingWindowId?: string | null;
  selectedDate?: string | null;
  slots?: SlotLike[];
}) {
  const range = getBookingWindowRange(params);
  if (!range) return null;

  return {
    startTime: range.startAt.toISOString(),
    endTime: range.endAt.toISOString(),
    displayLabel: formatBookingWindowLabel(range.startAt, range.endAt),
    isManual: range.isManual,
    teamId: range.teamId,
  };
}
