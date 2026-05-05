export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1003580967947137";

declare global {
  interface Window {
    fbq?: (
      command: "track" | "trackCustom",
      eventName: string,
      params?: Record<string, unknown>,
      options?: Record<string, unknown>
    ) => void;
  }
}

type MetaTrackValue = string | number | boolean | string[] | null | undefined;

type MetaTrackParams = Record<string, MetaTrackValue>;

type MetaTrackOptions = {
  eventID?: string;
};

const EVENTS_REQUIRING_DEDUPE_ID = new Set(["Lead", "Purchase"]);

const BOOKING_ATTEMPT_ID_KEY = "alltails_booking_attempt_id";
const ATTEMPT_EVENT_PREFIX = "alltails_meta_attempt";
const SESSION_EVENT_PREFIX = "alltails_meta_session";

const isBrowser = () => typeof window !== "undefined";

const getSessionItem = (key: string) => {
  if (!isBrowser()) return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setSessionItem = (key: string, value: string) => {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in restrictive browsers.
  }
};

const removeSessionItem = (key: string) => {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures in restrictive browsers.
  }
};

const createAttemptId = () => {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const getEnvironmentPrefix = () => {
  if (isBrowser()) {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname === "alltails.in" || hostname === "www.alltails.in") {
      return "prod";
    }
    if (hostname.includes("vercel.app")) {
      return "preview";
    }
  }

  // Vercel sets VERCEL_ENV to "production" | "preview" | "development" server-side
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "prod";
  if (vercelEnv === "preview") return "preview";

  return process.env.NODE_ENV === "production" ? "prod" : "dev";
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const sanitizeParams = (params: MetaTrackParams = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
};

export const buildServiceMeta = (
  serviceName: string,
  params: Omit<MetaTrackParams, "content_name" | "content_ids" | "content_category"> = {}
) => {
  const slug = slugify(serviceName || "unknown_service");

  return sanitizeParams({
    content_name: serviceName,
    content_ids: [slug],
    content_category: "grooming-package",
    ...params,
  });
};

export const trackMetaEvent = (
  eventName: string,
  params: MetaTrackParams = {},
  options: MetaTrackOptions = {}
) => {
  if (!isBrowser() || typeof window.fbq !== "function") {
    return;
  }

  const payload = sanitizeParams(params);
  const fbqOptions = options.eventID ? { eventID: options.eventID } : undefined;

  if (
    process.env.NODE_ENV !== "production" &&
    EVENTS_REQUIRING_DEDUPE_ID.has(eventName) &&
    !options.eventID
  ) {
    console.warn(
      `[meta-pixel] ${eventName} was sent without eventID; CAPI deduplication will fail.`
    );
  }

  window.fbq("track", eventName, payload, fbqOptions);
};

export const getOrCreateBookingAttemptId = () => {
  const existing = getSessionItem(BOOKING_ATTEMPT_ID_KEY);
  if (existing) return existing;

  const attemptId = createAttemptId();
  setSessionItem(BOOKING_ATTEMPT_ID_KEY, attemptId);
  return attemptId;
};

export const getBookingAttemptId = () => getSessionItem(BOOKING_ATTEMPT_ID_KEY);

export const resetBookingAttemptId = () => {
  removeSessionItem(BOOKING_ATTEMPT_ID_KEY);
};

const getAttemptEventKey = (attemptId: string, eventKey: string) =>
  `${ATTEMPT_EVENT_PREFIX}_${attemptId}_${eventKey}`;

export const hasAttemptEventFired = (attemptId: string, eventKey: string) =>
  getSessionItem(getAttemptEventKey(attemptId, eventKey)) === "1";

export const markAttemptEventFired = (attemptId: string, eventKey: string) => {
  setSessionItem(getAttemptEventKey(attemptId, eventKey), "1");
};

const getSessionEventKey = (eventKey: string) =>
  `${SESSION_EVENT_PREFIX}_${eventKey}`;

export const hasSessionEventFired = (eventKey: string) =>
  getSessionItem(getSessionEventKey(eventKey)) === "1";

export const markSessionEventFired = (eventKey: string) => {
  setSessionItem(getSessionEventKey(eventKey), "1");
};

export const buildAttemptEventId = (attemptId: string, suffix: string) =>
  `${getEnvironmentPrefix()}_${attemptId}_${suffix}`;

export const buildBookingEventId = (
  eventType: "lead" | "qualified_initiated" | "qualified_confirmed" | "purchase",
  bookingId: string
) => `${getEnvironmentPrefix()}_${eventType}_${bookingId}`;
