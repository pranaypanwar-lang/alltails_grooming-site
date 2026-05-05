export type BookingAddressStatus = "missing" | "partial" | "complete";

type BookingAddressInput = {
  serviceAddress?: string | null;
  serviceLandmark?: string | null;
  servicePincode?: string | null;
  serviceLocationUrl?: string | null;
  serviceLat?: number | null;
  serviceLng?: number | null;
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

export function normalizeLatitude(value: unknown) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < -90 || numberValue > 90) return null;
  return numberValue;
}

export function normalizeLongitude(value: unknown) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(numberValue)) return null;
  if (numberValue < -180 || numberValue > 180) return null;
  return numberValue;
}

export function makeGoogleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat.toFixed(7)},${lng.toFixed(7)}`;
}

export function extractCoordinatesFromLocationUrl(value: string | null | undefined) {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const lat = normalizeLatitude(match[1]);
    const lng = normalizeLongitude(match[2]);
    if (lat !== null && lng !== null) return { lat, lng };
  }

  return null;
}

export function getBookingAddressStatus(input: BookingAddressInput): BookingAddressStatus {
  const addressReceived = hasValue(input.serviceAddress);
  const landmarkReceived = hasValue(input.serviceLandmark);
  const pincodeReceived = hasValue(input.servicePincode);
  const locationReceived = hasValue(input.serviceLocationUrl);
  const coordinatesReceived = typeof input.serviceLat === "number" && typeof input.serviceLng === "number";
  const hasAnyAddressData =
    addressReceived ||
    landmarkReceived ||
    pincodeReceived ||
    locationReceived ||
    coordinatesReceived;

  if (addressReceived && landmarkReceived && (pincodeReceived || coordinatesReceived)) return "complete";
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
  const landmarkReceived = hasValue(input.serviceLandmark);
  const pincodeReceived = hasValue(input.servicePincode);
  const locationReceived = hasValue(input.serviceLocationUrl);
  const coordinatesReceived = typeof input.serviceLat === "number" && typeof input.serviceLng === "number";
  const status = getBookingAddressStatus(input);

  return {
    status,
    statusLabel: getBookingAddressStatusLabel(status),
    addressReceived,
    landmarkReceived,
    pincodeReceived,
    locationReceived,
    coordinatesReceived,
  };
}
