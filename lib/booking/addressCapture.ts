export type BookingAddressStatus = "missing" | "partial" | "complete";

type BookingAddressInput = {
  serviceAddress?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  serviceLocationUrl?: string | null;
};

function hasValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

export function normalizePincode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  return digits || trimmed;
}

export function getBookingAddressStatus(input: BookingAddressInput): BookingAddressStatus {
  const addressReceived = hasValue(input.serviceAddress);
  const locationReceived = hasValue(input.serviceLocationUrl);
  const hasAnyAddressData =
    addressReceived ||
    locationReceived ||
    hasValue(input.serviceLandmark) ||
    hasValue(input.servicePincode);

  if (addressReceived && locationReceived) return "complete";
  if (hasAnyAddressData) return "partial";
  return "missing";
}

export function getBookingAddressStatusLabel(status: BookingAddressStatus) {
  if (status === "complete") return "Address ready";
  if (status === "partial") return "Address partial";
  return "Address missing";
}

export function getAddressReadinessSummary(input: BookingAddressInput) {
  const addressReceived = hasValue(input.serviceAddress);
  const locationReceived = hasValue(input.serviceLocationUrl);
  const status = getBookingAddressStatus(input);

  return {
    status,
    statusLabel: getBookingAddressStatusLabel(status),
    addressReceived,
    locationReceived,
  };
}
